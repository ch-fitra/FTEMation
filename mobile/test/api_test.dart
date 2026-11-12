import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ftemation_mobile/core/api/api_client.dart';
import 'package:ftemation_mobile/features/auth/session_state.dart';
import 'package:ftemation_mobile/features/analysis/run_state.dart';
import 'package:ftemation_mobile/features/datasets/workspace_repository.dart';
import 'package:ftemation_mobile/features/datasets/workspace_state.dart';

import 'support/fake_backend.dart';

class DelayedRepository extends WorkspaceRepository {
  DelayedRepository(super.api);
  final first = Completer<Map<String, dynamic>>(),
      second = Completer<Map<String, dynamic>>();
  @override
  Future<Map<String, dynamic>> summary(int id, CancelToken cancel) =>
      id == 1 ? first.future : second.future;
}

void main() {
  test(
    'Restore validates profile, logout revokes and clears storage',
    () async {
      final backend = FakeBackend();
      final storage = MemoryTokens()..value = 'fixture-token';
      final session = SessionState(backend.client(), storage);
      await session.restore();
      expect(session.authenticated, true);
      expect(backend.requests.single.path, '/api/user');
      await session.logout();
      expect(session.authenticated, false);
      expect(storage.value, isNull);
      expect(backend.valid, false);
      session.dispose();
    },
  );
  test(
    'Network error never falls back to fixtures and logout can retry',
    () async {
      final backend = FakeBackend();
      final storage = MemoryTokens()..value = 'fixture-token';
      final session = SessionState(backend.client(), storage);
      await session.restore();
      backend.failStatus = 503;
      await session.logout();
      expect(session.authenticated, true);
      expect(storage.value, 'fixture-token');
      expect(session.error, contains('Logout server belum berhasil'));
      session.dispose();
    },
  );
  test('Expired restore clears credentials', () async {
    final backend = FakeBackend()..valid = false;
    final storage = MemoryTokens()..value = 'fixture-token';
    final session = SessionState(backend.client(), storage);
    await session.restore();
    expect(session.authenticated, false);
    expect(storage.value, isNull);
    session.dispose();
  });
  test(
    'Stale dataset response cannot overwrite current selection or logout',
    () async {
      final repository = DelayedRepository(FakeBackend().client());
      final state = WorkspaceState(repository);
      final first = state.select(1);
      final second = state.select(2);
      repository.second.complete({
        'summary': {'total_fte': 2},
      });
      await second;
      repository.first.complete({
        'summary': {'total_fte': 1},
      });
      await first;
      expect(state.activeId, 2);
      expect(state.summary!['total_fte'], 2);
      state.datasets = [];
      expect(state.datasetChoices.single['id'], 2);
      state.clear();
      expect(state.summary, isNull);
      state.dispose();
      final other = DelayedRepository(FakeBackend().client());
      final signedOut = WorkspaceState(other);
      final pending = signedOut.select(1);
      signedOut.clear();
      other.first.complete({
        'summary': {'total_fte': 1},
      });
      await pending;
      expect(signedOut.summary, isNull);
      expect(signedOut.activeId, isNull);
      expect(signedOut.datasetChoices, isEmpty);
      signedOut.dispose();
    },
  );
  test('Lifecycle start cancel resume preserves execution version', () async {
    final backend = FakeBackend();
    final api = backend.client()..token = 'fixture-token';
    final state = RunState(WorkspaceRepository(api), 1)..active = false;
    await state.load();
    await state.action('start');
    expect(state.selected!['status'], 'queued');
    await state.action('cancel');
    expect(state.selected!['status'], 'cancelled');
    await state.action('resume');
    expect(state.selected!['execution_version'], 1);
    final actions = backend.requests.where((r) => r.method == 'POST').toList();
    expect(actions.last.data['execution_version'], 0);
    state.dispose();
  });
  test('Polling reads status and stops while inactive or disposed', () async {
    final backend = FakeBackend()..status = 'queued';
    final api = backend.client()..token = 'fixture-token';
    final state = RunState(
      WorkspaceRepository(api),
      1,
      pollInterval: const Duration(milliseconds: 10),
    );
    await state.load();
    await Future<void>.delayed(const Duration(milliseconds: 35));
    expect(backend.requests.length, greaterThan(2));
    state.setActive(false);
    await Future<void>.delayed(const Duration(milliseconds: 10));
    final count = backend.requests.length;
    await Future<void>.delayed(const Duration(milliseconds: 25));
    expect(backend.requests.length, count);
    expect(backend.requests.every((r) => r.method == 'GET'), true);
    state.dispose();
    await Future<void>.delayed(const Duration(milliseconds: 20));
    expect(backend.requests.length, count);
  });
  test('Exports preserve server filename and reject incomplete run', () async {
    final backend = FakeBackend();
    final api = backend.client()..token = 'fixture-token';
    final repository = WorkspaceRepository(api);
    final file = await repository.export(10, 'json');
    expect(file.name, 'results.json');
    expect(file.mime, 'application/json');
    backend.status = 'cancelled';
    await expectLater(
      repository.export(10, 'json'),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 409)),
    );
  });
  test(
    'Upload sends named multipart bytes without a device file path',
    () async {
      final backend = FakeBackend();
      final api = backend.client()..token = 'fixture-token';
      await WorkspaceRepository(api)
          .upload([80, 75, 3, 4], 'fixture.xlsx', (_, _) {});
      final request = backend.requests.single;
      expect(request.method, 'POST');
      expect(request.path, '/api/imports');
      final form = request.data as FormData;
      expect(form.files.single.key, 'file');
      expect(form.files.single.value.filename, 'fixture.xlsx');
      expect(form.files.single.value.length, 4);
    },
  );
  for (final code in [400, 401, 403, 404, 409, 422, 429, 500, 503]) {
    test(
      'HTTP $code maps to a user error without automatic mutation retry',
      () async {
        final backend = FakeBackend()..failStatus = code;
        final api = backend.client();
        await expectLater(
          api.request('/api/mobile/login', method: 'POST', data: {}),
          throwsA(isA<ApiException>().having((e) => e.status, 'status', code)),
        );
        expect(backend.requests.length, 1);
      },
    );
  }
  for (final failure in [
    DioExceptionType.connectionError,
    DioExceptionType.connectionTimeout,
    DioExceptionType.receiveTimeout,
  ]) {
    test(
      'Transport $failure is actionable without automatic mutation retry',
      () async {
        final backend = FakeBackend()..transportFailure = failure;
        final api = backend.client();
        await expectLater(
          api.request('/api/mobile/login', method: 'POST', data: {}),
          throwsA(
            isA<ApiException>().having(
              (e) => e.message,
              'message',
              contains('Periksa jaringan'),
            ),
          ),
        );
        expect(backend.requests.length, 1);
      },
    );
  }
}

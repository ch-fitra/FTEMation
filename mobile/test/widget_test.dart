import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ftemation_mobile/app.dart';
import 'package:ftemation_mobile/features/auth/session_state.dart';
import 'package:ftemation_mobile/features/datasets/workspace_state.dart';
import 'package:provider/provider.dart';

import 'support/fake_backend.dart';

Future<void> enter(
  WidgetTester t,
  FakeBackend backend,
  MemoryTokens storage,
) async {
  await t.pumpWidget(FtemationApp(api: backend.client(), storage: storage));
  await t.pumpAndSettle();
  expect(find.text('Masuk ke Demo UI'), findsNothing);
  await t.enterText(find.byType(TextFormField).at(0), 'fixture');
  await t.enterText(find.byType(TextFormField).at(1), 'test-password');
  await t.ensureVisible(find.text('Masuk'));
  await t.tap(find.text('Masuk'));
  await t.pumpAndSettle();
}

void main() {
  testWidgets('Incomplete run hides exports and cancel requires confirmation', (
    t,
  ) async {
    final backend = FakeBackend()..status = 'queued';
    final storage = MemoryTokens();
    await enter(t, backend, storage);
    await t.tap(find.byKey(const ValueKey('/results')));
    await t.pumpAndSettle();
    expect(find.text('Simpan PDF'), findsNothing);
    await t.tap(find.byKey(const ValueKey('/analysis')));
    await t.pumpAndSettle();
    await t.scrollUntilVisible(
      find.text('Batalkan analisis'),
      150,
      scrollable: find.byType(Scrollable).first,
    );
    await t.drag(find.byType(ListView).first, const Offset(0, -200));
    await t.pumpAndSettle();
    await t.tap(find.text('Batalkan analisis'));
    await t.pumpAndSettle();
    expect(find.text('Batalkan analisis?'), findsOneWidget);
    await t.tap(find.text('Kembali'));
    await t.pumpAndSettle();
    expect(backend.requests.where((r) => r.method == 'POST').length, 1);
    await t.tap(find.text('Batalkan analisis'));
    await t.pumpAndSettle();
    await t.tap(find.text('Konfirmasi'));
    await t.pumpAndSettle();
    expect(backend.status, 'cancelled');
    expect(find.text('Dibatalkan'), findsWidgets);
    await t.pumpWidget(const SizedBox());
    await t.pumpAndSettle();
  });
  testWidgets('Login failure retains login without a demo bypass', (t) async {
    final backend = FakeBackend();
    final storage = MemoryTokens();
    await t.pumpWidget(FtemationApp(api: backend.client(), storage: storage));
    await t.pumpAndSettle();
    await t.enterText(find.byType(TextFormField).at(0), 'fixture');
    await t.enterText(find.byType(TextFormField).at(1), 'wrong');
    await t.ensureVisible(find.text('Masuk'));
    await t.tap(find.text('Masuk'));
    await t.pumpAndSettle();
    expect(
      find.textContaining('Username atau password tidak sesuai.'),
      findsOneWidget,
    );
    expect(storage.value, isNull);
    expect(find.text('Dashboard assessment'), findsNothing);
  });
  for (final size in [
    const Size(320, 568),
    const Size(390, 844),
    const Size(800, 360),
  ]) {
    testWidgets('API navigation, source KPI and overflow at $size', (t) async {
      t.view.physicalSize = size;
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      final backend = FakeBackend();
      final storage = MemoryTokens();
      await enter(t, backend, storage);
      expect(find.text('Dashboard assessment'), findsOneWidget);
      expect(find.text('4,4672'), findsOneWidget);
      for (final path in [
        '/datasets',
        '/results',
        '/activities',
        '/analysis',
        '/overview',
      ]) {
        await t.tap(find.byKey(ValueKey(path)));
        await t.pumpAndSettle();
        expect(t.takeException(), isNull);
      }
      expect(
        backend.requests.where((r) => r.method == 'POST').map((r) => r.path),
        ['/api/mobile/login'],
      );
    });
  }
  testWidgets('Pagination search filters and result details use API', (
    t,
  ) async {
    final backend = FakeBackend();
    final storage = MemoryTokens();
    await enter(t, backend, storage);
    await t.tap(find.byKey(const ValueKey('/activities')));
    await t.pumpAndSettle();
    await t.enterText(find.byType(TextField), 'missing');
    await t.pump(const Duration(milliseconds: 400));
    await t.pumpAndSettle();
    expect(
      find.textContaining('Tidak ada aktivitas yang cocok'),
      findsOneWidget,
    );
    expect(backend.requests.last.queryParameters['search'], 'missing');
    await t.tap(find.byKey(const ValueKey('/results')));
    await t.pumpAndSettle();
    await t.scrollUntilVisible(
      find.text('Detail hasil aktivitas'),
      150,
      scrollable: find.byType(Scrollable).first,
    );
    await t.drag(find.byType(ListView).first, const Offset(0, -220));
    await t.pumpAndSettle();
    await t.tap(find.text('Detail hasil aktivitas'));
    await t.pumpAndSettle();
    expect(find.textContaining('Alasan: Alasan fixture'), findsOneWidget);
    expect(find.byKey(const ValueKey('/overview')).hitTestable(), findsNothing);
    await t.tap(find.byTooltip('Tutup detail'));
    await t.pumpAndSettle();
  });
  testWidgets('Expired API session returns to login and clears workspace', (
    t,
  ) async {
    final backend = FakeBackend();
    final storage = MemoryTokens();
    await enter(t, backend, storage);
    final c = t.element(find.text('Dashboard assessment'));
    final session = c.read<SessionState>();
    final state = c.read<WorkspaceState>();
    backend.valid = false;
    state.select(1);
    await t.pumpAndSettle();
    expect(session.authenticated, false);
    expect(storage.value, isNull);
    expect(state.activeId, isNull);
    expect(find.text('Masuk'), findsOneWidget);
  });
  testWidgets('Dataset switch persists across navigation', (t) async {
    final backend = FakeBackend();
    final storage = MemoryTokens();
    await enter(t, backend, storage);
    final state = t
        .element(find.text('Dashboard assessment'))
        .read<WorkspaceState>();
    state.select(2);
    await t.pumpAndSettle();
    await t.tap(find.byKey(const ValueKey('/activities')));
    await t.pumpAndSettle();
    expect(backend.requests.last.path, '/api/imports/2/activities');
    expect(state.activeId, 2);
  });
  testWidgets('Text scaling preserves login and workspace navigation', (
    t,
  ) async {
    t.platformDispatcher.textScaleFactorTestValue = 1.6;
    addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
    final backend = FakeBackend();
    final storage = MemoryTokens();
    await enter(t, backend, storage);
    await t.tap(find.byKey(const ValueKey('/activities')));
    await t.pumpAndSettle();
    expect(t.takeException(), isNull);
    expect(
      find.byKey(const ValueKey('/overview')).hitTestable(),
      findsOneWidget,
    );
  });
}

import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../datasets/workspace_repository.dart';

class RunState extends ChangeNotifier {
  RunState(
    this.repository,
    this.datasetId, {
    this.pollInterval = const Duration(seconds: 4),
  });
  final WorkspaceRepository repository;
  final int datasetId;
  final Duration pollInterval;
  List<Map<String, dynamic>> history = [];
  Map<String, dynamic>? selected;
  int? selectedId;
  String? error;
  bool loading = false, mutating = false, active = true, disposed = false;
  int generation = 0;
  Timer? timer;
  CancelToken? cancel;
  Future<void> load({bool preferCompleted = false}) async {
    timer?.cancel();
    final current = ++generation;
    cancel?.cancel();
    final token = cancel = CancelToken();
    loading = true;
    error = null;
    notifyListeners();
    try {
      final list = await repository.runs(datasetId, token);
      if (disposed || current != generation) return;
      history = list;
      final choice = preferCompleted
          ? list.where((r) => r['status'] == 'completed').firstOrNull
          : null;
      selectedId ??= (choice ?? list.firstOrNull)?['id'] as int?;
      if (selectedId != null) {
        final data = await repository.run(selectedId!, token);
        if (disposed || current != generation) return;
        if (data['import_id'] != datasetId) {
          throw StateError('Run tidak sesuai dataset.');
        }
        selected = data;
      }
    } catch (e) {
      if (!disposed && current == generation && !token.isCancelled) {
        error = '$e';
      }
    }
    if (!disposed && current == generation) {
      loading = false;
      notifyListeners();
      schedule();
    }
  }

  Future<void> choose(int id) async {
    selectedId = id;
    selected = null;
    await load();
  }

  void schedule() {
    timer?.cancel();
    if (!disposed &&
        active &&
        [
          'queued',
          'processing',
          'cancel_requested',
        ].contains(selected?['status'])) {
      timer = Timer(pollInterval, () => load());
    }
  }

  void setActive(bool value) {
    active = value;
    timer?.cancel();
    if (active) load();
  }

  Future<void> action(String action) async {
    if (mutating) return;
    mutating = true;
    timer?.cancel();
    error = null;
    notifyListeners();
    try {
      final data = await repository.action(
        action == 'start'
            ? '/api/imports/$datasetId/analyses'
            : '/api/analyses/$selectedId/$action',
        data: ['cancel', 'resume'].contains(action)
            ? {'execution_version': selected!['execution_version']}
            : null,
      );
      if (disposed) return;
      selectedId = data['run']['id'] as int;
      await load();
    } catch (e) {
      if (!disposed) error = '$e';
    }
    if (!disposed) {
      mutating = false;
      notifyListeners();
      schedule();
    }
  }

  @override
  void dispose() {
    disposed = true;
    generation++;
    timer?.cancel();
    cancel?.cancel();
    super.dispose();
  }
}

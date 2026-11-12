import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'workspace_repository.dart';

class WorkspaceState extends ChangeNotifier {
  WorkspaceState(this.repository);
  final WorkspaceRepository repository;
  List<Map<String, dynamic>> datasets = [];
  Map<String, dynamic>? activeDataset;
  List<Map<String, dynamic>> get datasetChoices => [
    if (activeDataset != null && !datasets.any((d) => d['id'] == activeId))
      activeDataset!,
    ...datasets,
  ];
  Map<String, dynamic>? summary;
  int? activeId;
  int page = 1, lastPage = 1;
  bool loading = false, loadingDatasets = false;
  String? error;
  int _generation = 0, _listGeneration = 0;
  CancelToken? _cancel;
  Future<void> loadDatasets({int page = 1}) async {
    final generation = ++_listGeneration;
    loadingDatasets = true;
    error = null;
    notifyListeners();
    try {
      final data = await repository.datasets(page);
      if (generation != _listGeneration) return;
      datasets = (data['data'] as List)
          .map((v) => Map<String, dynamic>.from(v))
          .toList();
      this.page = data['current_page'] as int;
      lastPage = data['last_page'] as int;
      if (activeId == null && datasets.isNotEmpty) {
        await select(datasets.first['id'] as int);
      }
    } catch (e) {
      if (generation == _listGeneration) error = '$e';
    }
    if (generation == _listGeneration) {
      loadingDatasets = false;
      notifyListeners();
    }
  }

  Future<void> select(int id) async {
    final generation = ++_generation;
    _cancel?.cancel();
    final cancel = _cancel = CancelToken();
    activeDataset =
        datasets.where((d) => d['id'] == id).firstOrNull ??
        (activeId == id ? activeDataset : null) ??
        {'id': id, 'filename': 'Dataset $id'};
    activeId = id;
    summary = null;
    loading = true;
    error = null;
    notifyListeners();
    try {
      final data = await repository.summary(id, cancel);
      if (generation == _generation) {
        summary = Map<String, dynamic>.from(data['summary']);
        if (data['import'] is Map) {
          activeDataset = Map<String, dynamic>.from(data['import']);
        }
      }
    } catch (e) {
      if (generation == _generation && !cancel.isCancelled) error = '$e';
    }
    if (generation == _generation) {
      loading = false;
      notifyListeners();
    }
  }

  void clear() {
    _generation++;
    _listGeneration++;
    _cancel?.cancel();
    datasets = [];
    activeDataset = null;
    summary = null;
    activeId = null;
    error = null;
    loading = false;
    loadingDatasets = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _generation++;
    _listGeneration++;
    _cancel?.cancel();
    super.dispose();
  }
}

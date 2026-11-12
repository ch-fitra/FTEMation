import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';

class WorkspaceRepository {
  WorkspaceRepository(this.api);
  final ApiClient api;
  Future<Map<String, dynamic>> object(
    String path, {
    Map<String, dynamic>? query,
    CancelToken? cancel,
  }) async => Map<String, dynamic>.from(
    await api.request(path, query: query, cancelToken: cancel),
  );
  Future<Map<String, dynamic>> datasets(int page) =>
      object('/api/imports', query: {'page': page});
  Future<Map<String, dynamic>> summary(int id, CancelToken cancel) =>
      object('/api/imports/$id', cancel: cancel);
  Future<Map<String, dynamic>> activities(
    int id,
    Map<String, dynamic> query,
    CancelToken cancel,
  ) => object('/api/imports/$id/activities', query: query, cancel: cancel);
  Future<List<Map<String, dynamic>>> runs(int id, CancelToken cancel) async =>
      (await api.request(
        '/api/imports/$id/analyses',
        cancelToken: cancel,
      ) as List).map((v) => Map<String, dynamic>.from(v)).toList();
  Future<Map<String, dynamic>> run(int id, CancelToken cancel) =>
      object('/api/analyses/$id', cancel: cancel);
  Future<dynamic> action(String path, {Map<String, dynamic>? data}) =>
      api.request(path, method: 'POST', data: data);
  Future<dynamic> upload(
    List<int> bytes,
    String name,
    ProgressCallback progress,
  ) async => api.request(
    '/api/imports',
    method: 'POST',
    data: FormData.fromMap({
      'file': MultipartFile.fromBytes(bytes, filename: name),
    }),
    onSendProgress: progress,
  );
  Future<ExportFile> export(int run, String format) async {
    final response = await api.request(
      '/api/analyses/$run/export/$format',
      responseType: ResponseType.bytes,
      fullResponse: true,
    ) as Response;
    final expected = {
      'json': 'application/json',
      'pdf': 'application/pdf',
      'xlsx':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }[format];
    final mime = response.headers.value('content-type')?.split(';').first;
    if (mime != expected) {
      throw const ApiException('Format file dari server tidak sesuai.');
    }
    final disposition = response.headers.value('content-disposition') ?? '';
    final match = RegExp(r'filename="([a-zA-Z0-9._-]+)"')
        .firstMatch(disposition);
    return ExportFile(
      List<int>.from(response.data),
      match?.group(1) ?? 'FTEMation-run-$run.$format',
      expected!,
    );
  }
}

class ExportFile {
  const ExportFile(this.bytes, this.name, this.mime);
  final List<int> bytes;
  final String name, mime;
}

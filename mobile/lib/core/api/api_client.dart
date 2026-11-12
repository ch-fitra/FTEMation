import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class ApiException implements Exception {
  const ApiException(this.message, [this.status]);
  final String message;
  final int? status;
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({Dio? dio, String? baseUrl}) : dio = dio ?? Dio() {
    final url = baseUrl ?? const String.fromEnvironment('API_BASE_URL');
    if (url.isNotEmpty) {
      final uri = Uri.parse(url);
      if (uri.host.isEmpty ||
          uri.userInfo.isNotEmpty ||
          uri.hasQuery ||
          uri.hasFragment ||
          (uri.scheme != 'https' && !(kDebugMode && uri.scheme == 'http'))) {
        throw const ApiException('Konfigurasi API harus menggunakan HTTPS.');
      }
    }
    this.dio.options = BaseOptions(
      baseUrl: url,
      headers: {'Accept': 'application/json'},
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 60),
      sendTimeout: const Duration(seconds: 60),
      followRedirects: false,
    );
  }
  final Dio dio;
  String? token;
  VoidCallback? onUnauthorized;

  Future<dynamic> request(
    String path, {
    String method = 'GET',
    dynamic data,
    Map<String, dynamic>? query,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ResponseType? responseType,
    bool fullResponse = false,
  }) async {
    if (dio.options.baseUrl.isEmpty) {
      throw const ApiException(
        'Alamat server belum diatur. Gunakan API_BASE_URL saat build.',
      );
    }
    final sentToken = token;
    try {
      final result = await dio.request<dynamic>(
        path,
        data: data,
        queryParameters: query,
        cancelToken: cancelToken,
        onSendProgress: onSendProgress,
        options: Options(
          method: method,
          responseType: responseType,
          headers: {
            if (sentToken != null) 'Authorization': 'Bearer $sentToken',
          },
        ),
      );
      return fullResponse ? result : result.data;
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) rethrow;
      final status = e.response?.statusCode;
      if (status == 401 && sentToken != null && sentToken == token) {
        onUnauthorized?.call();
      }
      final message = switch (status) {
        400 || 422 => 'Periksa kembali data yang diisi.',
        401 => 'Sesi berakhir. Silakan masuk kembali.',
        403 => 'Anda tidak memiliki izin untuk tindakan ini.',
        404 => 'Data tidak ditemukan.',
        409 => 'Status data berubah. Muat ulang sebelum mencoba lagi.',
        429 => 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.',
        500 || 503 => 'Server sedang bermasalah. Coba lagi nanti.',
        _ => 'Tidak dapat terhubung. Periksa jaringan dan alamat server.',
      };
      final body = e.response?.data;
      final errors = body is Map ? body['errors'] : null;
      final details = errors is Map
          ? errors.values.expand((v) => v is List ? v : [v]).join('\n')
          : '';
      throw ApiException(
        details.isEmpty ? message : '$message\n$details',
        status,
      );
    }
  }
}

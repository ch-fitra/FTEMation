import 'package:flutter/foundation.dart';

import '../../core/api/api_client.dart';
import '../../core/storage/token_storage.dart';

class SessionState extends ChangeNotifier {
  SessionState(this.api, this.storage) {
    api.onUnauthorized = invalidate;
  }
  final ApiClient api;
  final TokenStorage storage;
  bool ready = false, busy = false;
  Map<String, dynamic>? user;
  String? error;
  int _generation = 0;
  Future<void> _pendingClear = Future.value();
  bool get authenticated => user != null;

  Future<void> restore() async {
    try {
      api.token = await storage.read();
      if (api.token != null) {
        user = Map<String, dynamic>.from(
          (await api.request('/api/user'))['user'],
        );
      }
    } catch (e) {
      error = '$e';
    }
    ready = true;
    notifyListeners();
  }

  Future<void> login(String username, String password) async {
    if (busy) return;
    busy = true;
    error = null;
    notifyListeners();
    try {
      final data = await api.request(
        '/api/mobile/login',
        method: 'POST',
        data: {
          'username': username.trim(),
          'password': password,
          'device_name': 'FTEMation Android',
        },
      );
      api.token = data['token'] as String;
      try {
        await _pendingClear;
        await storage.write(api.token!);
      } catch (_) {
        try {
          await api.request('/api/mobile/logout', method: 'POST');
        } catch (_) {}
        api.token = null;
        throw const ApiException(
          'Penyimpanan sesi aman tidak tersedia. Coba kembali.',
        );
      }
      _generation++;
      user = Map<String, dynamic>.from(data['user']);
    } catch (e) {
      error = '$e';
    }
    busy = false;
    notifyListeners();
  }

  void invalidate() {
    _generation++;
    api.token = null;
    user = null;
    error = 'Sesi berakhir. Silakan masuk kembali.';
    _pendingClear = storage.clear().catchError((_) {});
    notifyListeners();
  }

  Future<void> logout() async {
    if (busy) return;
    busy = true;
    error = null;
    notifyListeners();
    final generation = _generation;
    try {
      await api.request('/api/mobile/logout', method: 'POST');
      if (generation == _generation) {
        await storage.clear();
        api.token = null;
        user = null;
        _generation++;
      }
    } catch (e) {
      if (authenticated) {
        error =
            'Logout server belum berhasil. Periksa jaringan lalu coba kembali. $e';
      }
    }
    busy = false;
    notifyListeners();
  }
}

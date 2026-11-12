import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  const TokenStorage({this.key = 'ftemation.session'});
  final String key;
  static const _storage = FlutterSecureStorage();
  Future<String?> read() => _storage.read(key: key);
  Future<void> write(String token) => _storage.write(key: key, value: token);
  Future<void> clear() => _storage.delete(key: key);
}

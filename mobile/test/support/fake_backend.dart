import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:ftemation_mobile/core/api/api_client.dart';
import 'package:ftemation_mobile/core/storage/token_storage.dart';

class MemoryTokens extends TokenStorage {
  String? value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String token) async {
    value = token;
  }

  @override
  Future<void> clear() async {
    value = null;
  }
}

class FakeBackend implements HttpClientAdapter {
  final requests = <RequestOptions>[];
  int? failStatus;
  DioExceptionType? transportFailure;
  String status = 'completed';
  int executionVersion = 0;
  bool valid = true;
  final summary = <String, dynamic>{
    'total_fte': 4.4671875,
    'estimated_fte_saving': 1.672479,
    'activities_count': 60,
    'employees_count': 12,
    'departments_count': 3,
    'analysis_status': 'completed',
    'analysis_run_id': 10,
    'departments': [
      {'department': 'Finance', 'total_fte': 4.4671875},
    ],
    'top_opportunities': [],
    'automation_levels': {'high': 20, 'medium': 30, 'low': 10},
    'warnings': [],
  };
  final activity = <String, dynamic>{
    'activity_id': 'ACT-0001',
    'activity_code': 'ACT-0001',
    'activity_name': 'Rekap invoice',
    'employee': {'name': 'Petugas fixture', 'department': 'Finance'},
    'employee_name': 'Petugas fixture',
    'department': 'Finance',
    'description': 'Data sintetis pengujian.',
    'frequency': 'daily',
    'volume': 1,
    'duration_minutes': 90,
    'fte': 0.1875,
    'estimated_fte_saving': .1125,
    'automation_level': 'high',
    'reason': 'Alasan fixture terisolasi.',
    'recommendation': 'Review pengecualian oleh petugas.',
    'risk_level': 'low',
    'effort_level': 'low',
    'oversight_required': true,
    'oversight_note': 'Keputusan oleh manusia.',
    'factors': {},
    'automation_scope': 'majority_steps',
    'group_name': 'Rekap',
  };
  ApiClient client() {
    final dio = Dio()..httpClientAdapter = this;
    return ApiClient(dio: dio, baseUrl: 'https://fixture.invalid');
  }

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    if (transportFailure != null) {
      throw DioException(requestOptions: options, type: transportFailure!);
    }
    if (failStatus != null) {
      return json({'message': 'Fixture failure'}, failStatus!);
    }
    final path = options.path;
    if (path == '/api/mobile/login') {
      if (options.data['password'] != 'test-password') {
        return json({
          'errors': {
            'username': ['Username atau password tidak sesuai.'],
          },
        }, 422);
      }
      return json({
        'token': 'fixture-token',
        'user': {'id': 1, 'name': 'Fixture'},
        'token_type': 'Bearer',
      });
    }
    if (!valid || options.headers['Authorization'] != 'Bearer fixture-token') {
      return json({}, 401);
    }
    if (path == '/api/user') {
      return json({
        'user': {'id': 1, 'name': 'Fixture'},
      });
    }
    if (path == '/api/mobile/logout') {
      valid = false;
      return json({});
    }
    if (path == '/api/imports') {
      return json({
        'data': [
          {
            'id': 1,
            'filename': 'Fixture.xlsx',
            'activities_count': 60,
            'employees_count': 12,
            'status': 'imported',
          },
          {
            'id': 2,
            'filename': 'Second.xlsx',
            'activities_count': 60,
            'employees_count': 12,
            'status': 'imported',
          },
        ],
        'current_page': options.queryParameters['page'] ?? 1,
        'last_page': 2,
      });
    }
    if (RegExp(r'^/api/imports/[12]$').hasMatch(path)) {
      return json({'summary': summary});
    }
    if (path.endsWith('/activities')) {
      return json({
        'data': options.queryParameters['search'] == 'missing'
            ? []
            : [activity],
        'total': 60,
        'last_page': 3,
      });
    }
    if (path.endsWith('/analyses')) {
      if (options.method == 'POST') {
        status = 'queued';
        return json({
          'run': {'id': 10, 'status': status},
        }, 202);
      }
      return json([
        {'id': 10, 'status': status, 'model_name': 'fixture'},
      ]);
    }
    if (path == '/api/analyses/10') {
      return json({
        'id': 10,
        'import_id': 1,
        'status': status,
        'model_name': 'fixture',
        'prompt_version': 'fixture-v1',
        'execution_version': executionVersion,
        'total': 60,
        'progress': {'success': status == 'completed' ? 60 : 5},
        'failures': [],
        'can_cancel': ['queued', 'processing'].contains(status),
        'can_resume': status == 'cancelled',
        'can_retry': status == 'failed',
        if (status == 'completed')
          'report': {
            'activities': [activity],
            'employees': [],
            'departments': [],
          },
      });
    }
    if (path.endsWith('/cancel') || path.endsWith('/resume')) {
      if (options.data['execution_version'] != executionVersion) {
        return json({}, 409);
      }
      status = path.endsWith('/cancel') ? 'cancelled' : 'queued';
      if (status == 'queued') executionVersion++;
      return json({
        'run': {'id': 10, 'status': status},
      }, 202);
    }
    if (path.endsWith('/retry')) {
      status = 'queued';
      return json({
        'run': {'id': 10},
      }, 202);
    }
    if (path.contains('/export/')) {
      if (status != 'completed') return json({}, 409);
      return ResponseBody.fromString(
        '{}',
        200,
        headers: {
          'content-type': ['application/json'],
          'content-disposition': ['attachment; filename="results.json"'],
        },
      );
    }
    return json({}, 404);
  }

  ResponseBody json(dynamic data, [int status = 200]) =>
      ResponseBody.fromString(
        jsonEncode(data),
        status,
        headers: {
          'content-type': ['application/json'],
        },
      );
  @override
  void close({bool force = false}) {}
}

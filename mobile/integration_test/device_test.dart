import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:ftemation_mobile/app.dart';
import 'package:ftemation_mobile/core/storage/token_storage.dart';
import 'package:ftemation_mobile/core/api/api_client.dart';

import '../test/support/fake_backend.dart';

// Explicit isolated API fixture journey. This does not verify a live account.
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'Android isolated API journey without inference or real mutations',
    (t) async {
      if (const bool.fromEnvironment('CHECK_LOCAL_BACKEND')) {
        await expectLater(
          ApiClient().request('/api/user'),
          throwsA(
            isA<ApiException>().having(
              (e) => e.status,
              'guest HTTP status',
              401,
            ),
          ),
        );
      }
      Future<void> capture(String name) async {
        await t.pumpAndSettle();
        await binding.takeScreenshot(name);
        if (const bool.fromEnvironment('CAPTURE_NATIVE_CHECKPOINTS')) {
          debugPrint('FTEMATION_NATIVE_SCREEN:$name');
          await Future<void>.delayed(const Duration(seconds: 3));
        }
      }

      final backend = FakeBackend();
      const storage = TokenStorage(key: 'ftemation.phase2.integration');
      await storage.clear();
      addTearDown(storage.clear);
      await t.pumpWidget(FtemationApp(api: backend.client(), storage: storage));
      await t.pumpAndSettle();
      await binding.convertFlutterSurfaceToImage();
      await t.pumpAndSettle();
      await capture('phase2-login');
      await t.enterText(find.byType(TextFormField).at(0), 'fixture');
      await t.enterText(find.byType(TextFormField).at(1), 'test-password');
      await t.ensureVisible(find.text('Masuk'));
      await t.tap(find.text('Masuk'));
      await t.pumpAndSettle();
      expect(find.text('4,4672'), findsOneWidget);
      expect(await storage.read(), 'fixture-token');
      await capture('phase2-overview');
      for (final path in [
        '/datasets',
        '/analysis',
        '/results',
        '/activities',
      ]) {
        await t.tap(find.byKey(ValueKey(path)));
        await t.pumpAndSettle();
        expect(t.takeException(), isNull);
        await capture('phase2-${path.substring(1)}');
      }
      expect(
        backend.requests.where((r) => r.method == 'POST').map((r) => r.path),
        ['/api/mobile/login'],
      );
      await t.pumpWidget(const SizedBox());
      await t.pumpAndSettle();
      await t.pumpWidget(
        FtemationApp(key: UniqueKey(), api: backend.client(), storage: storage),
      );
      await t.pumpAndSettle();
      expect(find.text('Dashboard assessment'), findsOneWidget);
      expect(backend.requests.where((r) => r.path == '/api/user'), isNotEmpty);
      await capture('phase2-restored');
      await t.tap(find.byTooltip('Menu lainnya'));
      await t.pumpAndSettle();
      await t.tap(find.text('Keluar dari perangkat'));
      await t.pumpAndSettle();
      expect(find.text('Masuk'), findsOneWidget);
      expect(await storage.read(), isNull);
      await capture('phase2-logout');
    },
  );
}

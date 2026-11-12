import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:ftemation_mobile/app.dart';
import 'package:ftemation_mobile/core/storage/token_storage.dart';
import 'package:ftemation_mobile/core/api/api_client.dart';

import '../test/support/fake_backend.dart';

// Explicit isolated API fixture journey. This does not verify a live account.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
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
      final backend = FakeBackend();
      const storage = TokenStorage(key: 'ftemation.phase2.integration');
      await storage.clear();
      addTearDown(storage.clear);
      await t.pumpWidget(FtemationApp(api: backend.client(), storage: storage));
      await t.pumpAndSettle();
      await t.enterText(find.byType(TextFormField).at(0), 'fixture');
      await t.enterText(find.byType(TextFormField).at(1), 'test-password');
      await t.ensureVisible(find.text('Masuk'));
      await t.tap(find.text('Masuk'));
      await t.pumpAndSettle();
      expect(find.text('4,4672'), findsOneWidget);
      expect(await storage.read(), 'fixture-token');
      for (final path in [
        '/datasets',
        '/analysis',
        '/results',
        '/activities',
      ]) {
        await t.tap(find.byKey(ValueKey(path)));
        await t.pumpAndSettle();
        expect(t.takeException(), isNull);
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
      await t.tap(find.byTooltip('Menu lainnya'));
      await t.pumpAndSettle();
      await t.tap(find.text('Keluar dari perangkat'));
      await t.pumpAndSettle();
      expect(find.text('Masuk'), findsOneWidget);
      expect(await storage.read(), isNull);
    },
  );
}

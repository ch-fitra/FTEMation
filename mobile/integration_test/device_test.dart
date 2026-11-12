import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:ftemation_mobile/app.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Physical Android full preview journey', (t) async {
    await t.pumpWidget(const FtemationApp());
    await t.pumpAndSettle();
    expect(find.text('Masuk ke Demo UI'), findsOneWidget);
    await binding.convertFlutterSurfaceToImage();
    await t.pumpAndSettle();
    await binding.takeScreenshot('01-login');
    await t.ensureVisible(find.text('Masuk ke Demo UI'));
    await t.tap(find.text('Masuk ke Demo UI'));
    await t.pumpAndSettle();
    expect(find.text('Dashboard assessment'), findsOneWidget);
    await binding.takeScreenshot('02-overview');
    for (final path in ['/datasets', '/analysis', '/results', '/activities']) {
      await t.tap(find.byKey(ValueKey(path)));
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      await binding.takeScreenshot(path.substring(1));
    }
    await t.tap(find.byType(TextField));
    await t.enterText(find.byType(TextField), 'Ayu');
    await t.pumpAndSettle();
    await binding.takeScreenshot('07-keyboard');
    FocusManager.instance.primaryFocus?.unfocus();
    await t.pumpAndSettle();
    await t.scrollUntilVisible(
      find.text('Detail aktivitas').first,
      150,
      scrollable: find.byType(Scrollable).first,
    );
    await t.tap(find.text('Detail aktivitas').first);
    await t.pumpAndSettle();
    expect(find.textContaining('Karyawan: Ayu'), findsOneWidget);
    await binding.takeScreenshot('08-detail');
    await t.tap(find.byTooltip('Tutup detail'));
    await t.pumpAndSettle();
    await t.tap(find.byKey(const ValueKey('/datasets')));
    await t.pumpAndSettle();
    await t.tap(find.text('Workload Operasional.xlsx').first);
    await t.pumpAndSettle();
    await t.tap(find.text('Workload Layanan.xlsx').last);
    await t.pumpAndSettle();
    await t.tap(find.byKey(const ValueKey('/overview')));
    await t.pumpAndSettle();
    expect(find.text('0,5000'), findsOneWidget);
    await t.tap(find.byTooltip('Menu lainnya'));
    await t.pumpAndSettle();
    await t.tap(find.text('Pusat Bantuan'));
    await t.pumpAndSettle();
    await binding.takeScreenshot('09-help');
    expect(find.text('Panduan & metodologi FTEMation'), findsOneWidget);
    expect(t.takeException(), isNull);
  });
}

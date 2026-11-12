import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ftemation_mobile/app.dart';
import 'package:ftemation_mobile/core/demo/demo_data.dart';
import 'package:provider/provider.dart';

Future<void> enter(WidgetTester t) async {
  await t.pumpWidget(const FtemationApp());
  await t.pumpAndSettle();
  expect(find.text('Masuk ke Demo UI'), findsOneWidget);
  await t.ensureVisible(find.text('Masuk ke Demo UI'));
  await t.tap(find.text('Masuk ke Demo UI'));
  await t.pumpAndSettle();
}

Future<void> tab(WidgetTester t, String path) async {
  await t.tap(find.byKey(ValueKey(path)));
  await t.pumpAndSettle();
  expect(t.takeException(), isNull);
}

void main() {
  test('Fixtures remain internally consistent', () {
    for (final d in demoDatasets) {
      expect(
        d.activities.fold(0.0, (s, a) => s + a.fte),
        closeTo(d.total, 0.00001),
      );
      expect(
        d.activities.fold(0.0, (s, a) => s + a.saving),
        closeTo(d.saving, 0.00001),
      );
    }
  });
  testWidgets('Startup, all tabs, dataset persistence and dashboard', (
    t,
  ) async {
    await enter(t);
    expect(find.text('Dashboard assessment'), findsOneWidget);
    await tab(t, '/datasets');
    expect(find.text('Import dataset'), findsOneWidget);
    final state = t.element(find.text('Import dataset')).read<DemoState>();
    state.select('demo-2');
    await t.pumpAndSettle();
    await tab(t, '/analysis');
    expect(find.text('Analisis otomatisasi'), findsOneWidget);
    await tab(t, '/results');
    expect(find.text('Hasil analisis AI'), findsOneWidget);
    await tab(t, '/activities');
    expect(find.text('Data aktivitas'), findsOneWidget);
    await tab(t, '/overview');
    expect(find.text('0,5000'), findsOneWidget);
    expect(state.active.id, 'demo-2');
  });
  testWidgets('Search, filters, activity detail and empty state', (t) async {
    await enter(t);
    await tab(t, '/activities');
    await t.enterText(find.byType(TextField), 'Ayu');
    await t.pumpAndSettle();
    await t.scrollUntilVisible(
      find.text('Detail aktivitas').first,
      150,
      scrollable: find.byType(Scrollable).first,
    );
    await t.drag(find.byType(ListView).first, const Offset(0, -180));
    await t.pumpAndSettle();
    await t.tap(find.text('Detail aktivitas').first);
    await t.pumpAndSettle();
    expect(find.textContaining('Karyawan: Ayu'), findsOneWidget);
    expect(find.byKey(const ValueKey('/overview')).hitTestable(), findsNothing);
    await t.tap(find.byTooltip('Tutup detail'));
    await t.pumpAndSettle();
    await t.ensureVisible(find.byType(TextField));
    await t.enterText(find.byType(TextField), 'tidak-ada');
    await t.pumpAndSettle();
    expect(
      find.textContaining('Tidak ada aktivitas yang cocok'),
      findsOneWidget,
    );
    await t.enterText(find.byType(TextField), '');
    await t.pumpAndSettle();
    await t.tap(find.text('Semua').first);
    await t.pumpAndSettle();
    await t.tap(find.text('Finance').last);
    await t.pumpAndSettle();
    expect(find.text('2 aktivitas ditampilkan'), findsOneWidget);
    expect(t.takeException(), isNull);
  });
  for (final size in [
    const Size(320, 568),
    const Size(390, 844),
    const Size(800, 360),
  ]) {
    testWidgets('No overflow at $size', (t) async {
      t.view.physicalSize = size;
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      await enter(t);
      for (final path in [
        '/datasets',
        '/analysis',
        '/overview',
        '/results',
        '/activities',
      ]) {
        await tab(t, path);
        await t.drag(find.byType(ListView).first, const Offset(0, -400));
        await t.pumpAndSettle();
        expect(t.takeException(), isNull);
      }
    });
  }
  testWidgets('Backend action explains integration and help menu works', (
    t,
  ) async {
    await enter(t);
    await tab(t, '/datasets');
    await t.ensureVisible(find.text('Informasi import Excel'));
    await t.tap(find.text('Informasi import Excel'));
    await t.pumpAndSettle();
    expect(find.text('Tersedia pada Tahap 2'), findsOneWidget);
    await t.tap(find.text('Mengerti'));
    await t.pumpAndSettle();
    await t.tap(find.byTooltip('Menu lainnya'));
    await t.pumpAndSettle();
    await t.tap(find.text('Pusat Bantuan'));
    await t.pumpAndSettle();
    expect(find.text('Panduan & metodologi FTEMation'), findsOneWidget);
    expect(t.takeException(), isNull);
  });
  testWidgets(
    'Analysis scenarios, result filtering and recommendation detail',
    (t) async {
      await enter(t);
      await tab(t, '/analysis');
      for (final status in [
        'Dalam antrean',
        'Sedang dianalisis',
        'Dibatalkan',
        'Gagal',
        'Menunggu pembatalan',
        'Selesai',
      ]) {
        final menu = find.byType(DropdownButtonFormField<String>).last;
        await t.ensureVisible(menu);
        await t.tap(menu);
        await t.pumpAndSettle();
        await t.tap(find.text(status).last);
        await t.pumpAndSettle();
        expect(t.takeException(), isNull);
      }
      await tab(t, '/results');
      await t.scrollUntilVisible(
        find.text('Low'),
        150,
        scrollable: find.byType(Scrollable).first,
      );
      await t.ensureVisible(find.text('Low'));
      await t.tap(find.text('Low'));
      await t.pumpAndSettle();
      await t.scrollUntilVisible(
        find.text('Detail hasil aktivitas').first,
        150,
        scrollable: find.byType(Scrollable).first,
      );
      await t.drag(find.byType(ListView).first, const Offset(0, -180));
      await t.pumpAndSettle();
      await t.tap(find.text('Detail hasil aktivitas').first);
      await t.pumpAndSettle();
      expect(find.text('Rekomendasi ilustratif'), findsOneWidget);
      expect(t.takeException(), isNull);
    },
  );

  testWidgets('Back returns to Overview and empty dataset has no fake result', (
    t,
  ) async {
    await enter(t);
    await tab(t, '/activities');
    await t.binding.handlePopRoute();
    await t.pumpAndSettle();
    expect(find.text('Dashboard assessment'), findsOneWidget);
    final state = t
        .element(find.text('Dashboard assessment'))
        .read<DemoState>();
    state.select('demo-3');
    await t.pumpAndSettle();
    expect(find.textContaining('Belum ada aktivitas'), findsOneWidget);
    await tab(t, '/results');
    expect(find.textContaining('Belum ada hasil'), findsOneWidget);
    await tab(t, '/activities');
    expect(find.text('0 aktivitas ditampilkan'), findsOneWidget);
    expect(t.takeException(), isNull);
  });
}

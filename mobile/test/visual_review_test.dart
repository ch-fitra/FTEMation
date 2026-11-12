import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ftemation_mobile/app.dart';

import 'support/fake_backend.dart';

// Opt-in screenshots from the Flutter test renderer, never physical-device proof.
void main() {
  setUpAll(() async {
    if (!const bool.fromEnvironment('CAPTURE_REVIEW')) return;
    final textFont = const String.fromEnvironment('REVIEW_FONT');
    final iconFont = const String.fromEnvironment('REVIEW_ICON_FONT');
    if (textFont.isEmpty || iconFont.isEmpty) {
      throw StateError(
        'Set REVIEW_FONT and REVIEW_ICON_FONT to real font files for readable screenshots.',
      );
    }
    for (final entry in {
      'Roboto': textFont,
      'MaterialIcons': iconFont,
    }.entries) {
      final loader = FontLoader(entry.key)
        ..addFont(
          Future.value(
            ByteData.sublistView(await File(entry.value).readAsBytes()),
          ),
        );
      await loader.load();
    }
  });
  testWidgets('Capture isolated API visual review', (t) async {
    t.view.physicalSize = const Size(390, 844);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.resetPhysicalSize);
    addTearDown(t.view.resetDevicePixelRatio);
    await t.pumpWidget(
      FtemationApp(api: FakeBackend().client(), storage: MemoryTokens()),
    );
    await t.pumpAndSettle();
    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('../build/phase2-review/01-login.png'),
    );
    await t.enterText(find.byType(TextFormField).at(0), 'fixture');
    await t.enterText(find.byType(TextFormField).at(1), 'test-password');
    await t.ensureVisible(find.text('Masuk'));
    await t.tap(find.text('Masuk'));
    await t.pumpAndSettle();
    await expectLater(
      find.byType(MaterialApp),
      matchesGoldenFile('../build/phase2-review/02-overview.png'),
    );
    for (final path in ['/datasets', '/analysis', '/results', '/activities']) {
      await t.tap(find.byKey(ValueKey(path)));
      await t.pumpAndSettle();
      await expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile('../build/phase2-review/${path.substring(1)}.png'),
      );
      expect(t.takeException(), isNull);
    }
  }, skip: !const bool.fromEnvironment('CAPTURE_REVIEW'));
}

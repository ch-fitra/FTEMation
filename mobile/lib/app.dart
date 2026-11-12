import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import 'core/demo/demo_data.dart';
import 'core/theme/app_theme.dart';
import 'navigation/app_router.dart';

class FtemationApp extends StatefulWidget {
  const FtemationApp({super.key});
  @override
  State<FtemationApp> createState() => _AppState();
}

class _AppState extends State<FtemationApp> {
  late final GoRouter router = createAppRouter();
  @override
  void dispose() {
    router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ChangeNotifierProvider(
    create: (_) => DemoState(),
    child: MaterialApp.router(
      title: 'FTEMation',
      debugShowCheckedModeBanner: false,
      theme: appTheme(),
      routerConfig: router,
    ),
  );
}

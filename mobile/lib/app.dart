import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import 'core/api/api_client.dart';
import 'core/storage/token_storage.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/session_state.dart';
import 'features/datasets/workspace_repository.dart';
import 'features/datasets/workspace_state.dart';
import 'navigation/app_router.dart';

class FtemationApp extends StatefulWidget {
  const FtemationApp({super.key, this.api, this.storage});
  final ApiClient? api;
  final TokenStorage? storage;
  @override
  State<FtemationApp> createState() => _AppState();
}

class _AppState extends State<FtemationApp> {
  late final ApiClient api = widget.api ?? ApiClient();
  late final SessionState session = SessionState(
    api,
    widget.storage ?? const TokenStorage(),
  );
  late final WorkspaceState workspace = WorkspaceState(
    WorkspaceRepository(api),
  );
  late final GoRouter router = createAppRouter(session);
  bool wasAuthenticated = false;
  @override
  void initState() {
    super.initState();
    session.addListener(sync);
    session.restore();
  }

  void sync() {
    if (session.authenticated && !wasAuthenticated) {
      workspace.loadDatasets();
    }
    if (!session.authenticated && wasAuthenticated) {
      workspace.clear();
    }
    wasAuthenticated = session.authenticated;
  }

  @override
  void dispose() {
    session.removeListener(sync);
    router.dispose();
    workspace.dispose();
    session.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MultiProvider(
    providers: [
      ChangeNotifierProvider.value(value: session),
      ChangeNotifierProvider.value(value: workspace),
    ],
    child: MaterialApp.router(
      title: 'FTEMation',
      debugShowCheckedModeBanner: false,
      theme: appTheme(),
      routerConfig: router,
    ),
  );
}

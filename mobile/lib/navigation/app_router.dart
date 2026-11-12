import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/demo/demo_data.dart';
import '../features/splash/splash_page.dart';
import '../features/auth/login_page.dart';
import '../features/overview/overview_page.dart';
import '../features/datasets/datasets_page.dart';
import '../features/analysis/analysis_page.dart';
import '../features/results/results_page.dart';
import '../features/activities/activities_page.dart';
import '../features/help/help_page.dart';
import 'workspace_shell.dart';

GoRouter createAppRouter() => GoRouter(
  initialLocation: '/splash',
  errorBuilder: (c, s) => Scaffold(
    body: Center(
      child: TextButton(
        onPressed: () => c.go('/overview'),
        child: const Text('Halaman tidak ditemukan - Kembali ke Overview'),
      ),
    ),
  ),
  routes: [
    GoRoute(path: '/splash', builder: (c, s) => const SplashPage()),
    GoRoute(path: '/login', builder: (c, s) => const LoginPage()),
    ShellRoute(
      builder: (c, s, child) => WorkspaceShell(path: s.uri.path, child: child),
      routes: [
        GoRoute(path: '/overview', builder: (c, s) => const OverviewPage()),
        GoRoute(path: '/datasets', builder: (c, s) => const DatasetsPage()),
        GoRoute(
          path: '/analysis',
          builder: (c, s) =>
              AnalysisPage(key: ValueKey(c.watch<DemoState>().active.id)),
        ),
        GoRoute(
          path: '/results',
          builder: (c, s) =>
              ResultsPage(key: ValueKey(c.watch<DemoState>().active.id)),
        ),
        GoRoute(
          path: '/activities',
          builder: (c, s) =>
              ActivitiesPage(key: ValueKey(c.watch<DemoState>().active.id)),
        ),
        GoRoute(path: '/help', builder: (c, s) => const HelpPage()),
      ],
    ),
  ],
);

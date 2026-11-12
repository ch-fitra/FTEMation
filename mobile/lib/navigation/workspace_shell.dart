import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../features/auth/session_state.dart';

import '../core/theme/app_theme.dart';
import '../core/widgets/brand.dart';
import 'app_navigation.dart';

class WorkspaceShell extends StatelessWidget {
  const WorkspaceShell({super.key, required this.child, required this.path});
  final Widget child;
  final String path;
  @override
  Widget build(BuildContext context) => AnnotatedRegion<SystemUiOverlayStyle>(
    value: SystemUiOverlayStyle.light.copyWith(
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
    child: PopScope(
      canPop: path == '/overview' || path == '/help',
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) context.go('/overview');
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Brand(),
          actions: [
            PopupMenuButton<String>(
              tooltip: 'Menu lainnya',
              onSelected: (v) {
                if (v == 'about') {
                  showAboutDialog(
                    context: context,
                    applicationName: 'FTEMation Mobile',
                    applicationVersion: '1.0.0 - Integrasi Laravel',
                    children: [
                      const Text(
                        'Data assessment berasal dari Laravel. Keputusan tetap di tangan manusia.',
                      ),
                    ],
                  );
                } else if (v == 'help') {
                  context.push('/help');
                } else {
                  context.read<SessionState>().logout();
                }
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'help', child: Text('Pusat Bantuan')),
                PopupMenuItem(
                  value: 'about',
                  child: Text('Informasi aplikasi'),
                ),
                PopupMenuItem(
                  value: 'login',
                  child: Text('Keluar dari perangkat'),
                ),
              ],
            ),
          ],
        ),
        body: SafeArea(
          top: false,
          bottom: false,
          child: Column(
            children: [
              if (context.watch<SessionState>().error case final String error)
                MaterialBanner(
                  content: Text(error),
                  actions: [
                    TextButton(
                      onPressed: () => context.read<SessionState>().logout(),
                      child: const Text('Coba logout lagi'),
                    ),
                  ],
                ),
              Expanded(child: child),
            ],
          ),
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          child: Container(
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(top: BorderSide(color: AppColors.border)),
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: destinations.map((d) {
                final active = path == d.path;
                final center = d.path == '/overview';
                return Expanded(
                  child: Semantics(
                    selected: active,
                    child: InkWell(
                      key: ValueKey(d.path),
                      onTap: () {
                        FocusManager.instance.primaryFocus?.unfocus();
                        context.go(d.path);
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              height: 40,
                              width: 48,
                              decoration: BoxDecoration(
                                color: center
                                    ? AppColors.navy
                                    : active
                                    ? AppColors.cyan.withValues(alpha: 0.13)
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(13),
                              ),
                              child: Icon(
                                d.icon,
                                color: center
                                    ? AppColors.cyan
                                    : active
                                    ? AppColors.primary
                                    : AppColors.muted,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              d.label,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: active
                                    ? FontWeight.w700
                                    : FontWeight.w500,
                                color: active
                                    ? AppColors.navy
                                    : AppColors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
    ),
  );
}

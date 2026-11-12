import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app_dropdown.dart';
import '../../features/datasets/workspace_state.dart';
import '../theme/app_theme.dart';

class Panel extends StatelessWidget {
  const Panel({super.key, required this.child, this.accent = false});
  final Widget child;
  final bool accent;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    margin: const EdgeInsets.only(bottom: 16),
    padding: const EdgeInsets.all(AppSpace.gap),
    decoration: BoxDecoration(
      color: accent ? AppColors.navy : AppColors.surface,
      borderRadius: BorderRadius.circular(AppSpace.radius),
      border: Border.all(color: AppColors.border),
    ),
    child: Material(color: Colors.transparent, child: child),
  );
}

class PageBody extends StatelessWidget {
  const PageBody({
    super.key,
    required this.title,
    required this.subtitle,
    required this.children,
  });
  final String title, subtitle;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) {
    final state = context.watch<WorkspaceState>();
    return ListView(
      key: ValueKey('$title-${state.activeId}'),
      padding: const EdgeInsets.all(AppSpace.gap),
      children: [
        Text(title, style: Theme.of(context).textTheme.headlineMedium),
        Text(subtitle, style: const TextStyle(color: AppColors.muted)),
        const SizedBox(height: 20),
        AppDropdown<int>(
          key: ValueKey('${state.activeId}-${state.page}'),
          value:
              state.datasetChoices.any((d) => d['id'] == state.activeId)
              ? state.activeId
              : null,
          label: 'Dataset aktif',
          items: state.datasetChoices
              .map(
                (d) => AppDropdownItem(
                  value: d['id'] as int,
                  label: d['filename'] as String? ?? 'Dataset ${d["id"]}',
                ),
              )
              .toList(),
          onChanged: (id) {
            if (id != null) state.select(id);
          },
        ),
        const SizedBox(height: 20),
        if (state.loading) const LinearProgressIndicator(),
        if (state.error != null) Notice(state.error!),
        ...children,
        const SizedBox(height: 24),
      ],
    );
  }
}

class Notice extends StatelessWidget {
  const Notice(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Panel(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.info_outline, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(child: Text(text)),
      ],
    ),
  );
}

class LevelBadge extends StatelessWidget {
  const LevelBadge(this.level, {super.key});
  final String level;
  @override
  Widget build(BuildContext context) => Chip(
    label: Text(
      level.isEmpty ? level : '${level[0].toUpperCase()}${level.substring(1)}',
    ),
    side: BorderSide.none,
    backgroundColor: level.toLowerCase() == 'high'
        ? AppColors.highBackground
        : level.toLowerCase() == 'medium'
        ? AppColors.mediumBackground
        : AppColors.canvas,
  );
}

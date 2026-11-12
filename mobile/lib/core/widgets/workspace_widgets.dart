import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../demo/demo_data.dart';
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
    final state = context.watch<DemoState>();
    return ListView(
      key: ValueKey('$title-${state.active.id}'),
      padding: const EdgeInsets.all(AppSpace.gap),
      children: [
        Text(title, style: Theme.of(context).textTheme.headlineMedium),
        Text(subtitle, style: const TextStyle(color: AppColors.muted)),
        const SizedBox(height: 20),
        DropdownButtonFormField<String>(
          key: ValueKey(state.active.id),
          initialValue: state.active.id,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Dataset aktif · DEMO'),
          items: demoDatasets
              .map(
                (d) => DropdownMenuItem(
                  value: d.id,
                  child: Text(d.name, overflow: TextOverflow.ellipsis),
                ),
              )
              .toList(),
          onChanged: (id) {
            if (id != null) state.select(id);
          },
        ),
        const SizedBox(height: 20),
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
    label: Text(level),
    side: BorderSide.none,
    backgroundColor: level == 'High'
        ? AppColors.highBackground
        : level == 'Medium'
        ? AppColors.mediumBackground
        : AppColors.canvas,
  );
}

void integrationNotice(BuildContext context) => showDialog<void>(
  context: context,
  builder: (c) => AlertDialog(
    title: const Text('Tersedia pada Tahap 2'),
    content: const Text(
      'Preview ini tidak mengunggah file, menjalankan AI, atau mengubah data server. Integrasi Laravel REST API tersedia pada Tahap 2.',
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(c),
        child: const Text('Mengerti'),
      ),
    ],
  ),
);

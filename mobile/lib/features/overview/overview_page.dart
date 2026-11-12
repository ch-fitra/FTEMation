import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import '../../core/demo/demo_data.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/workspace_widgets.dart';

class OverviewPage extends StatelessWidget {
  const OverviewPage({super.key});
  @override
  Widget build(BuildContext context) {
    final d = context.watch<DemoState>().active;
    return PageBody(
      title: 'Dashboard assessment',
      subtitle: 'Kapasitas & peluang otomatisasi',
      children: [
        const Notice(
          'DATA DEMO - Angka dan rekomendasi sintetis, bukan hasil DeepSeek.',
        ),
        if (d.activities.isEmpty)
          const Notice('Belum ada aktivitas. Pilih dataset demo lain.')
        else ...[
          LayoutBuilder(
            builder: (c, box) {
              final metrics = [
                ('Total workload', fte(d.total), 'FTE aktivitas tercatat'),
                ('Estimasi saving', fte(d.saving), 'FTE kapasitas waktu'),
                ('Karyawan', '${d.employees}', 'Dalam dataset aktif'),
                (
                  'Departemen',
                  '${d.departments.length}',
                  'Unit kerja tercatat',
                ),
              ];
              return Wrap(
                spacing: 12,
                children: metrics.indexed
                    .map(
                      (entry) => SizedBox(
                        width: box.maxWidth >= 340
                            ? (box.maxWidth - 12) / 2
                            : box.maxWidth,
                        child: Panel(
                          accent: entry.$1 == 1,
                          child: DefaultTextStyle(
                            style: TextStyle(
                              color: entry.$1 == 1
                                  ? Colors.white
                                  : AppColors.navy,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(entry.$2.$1),
                                const SizedBox(height: 12),
                                Text(
                                  entry.$2.$2,
                                  style: const TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  entry.$2.$3,
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    )
                    .toList(),
              );
            },
          ),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'FTE per departemen',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 4),
                const Text('Perbandingan workload - snapshot demo'),
                const SizedBox(height: 20),
                ...d.departments.map((name) {
                  final total = d.activities
                      .where((a) => a.department == name)
                      .fold(0.0, (sum, a) => sum + a.fte);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$name - ${fte(total)} FTE'),
                        const SizedBox(height: 8),
                        Semantics(
                          label: '$name ${fte(total)} FTE',
                          child: LinearProgressIndicator(
                            value: total / d.total,
                            minHeight: 10,
                            borderRadius: BorderRadius.circular(8),
                            color: AppColors.primary,
                            backgroundColor: AppColors.canvas,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Peluang otomatisasi',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                ...d.activities
                    .where((a) => a.level == 'High')
                    .take(3)
                    .map(
                      (a) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(a.name),
                        subtitle: Text(
                          '${a.department} - ${fte(a.saving)} FTE saving',
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => context.go('/results'),
                      ),
                    ),
                TextButton(
                  onPressed: () => context.go('/results'),
                  child: const Text('Lihat seluruh hasil'),
                ),
              ],
            ),
          ),
          const Notice(
            'Saving adalah estimasi kapasitas waktu, bukan realisasi efisiensi atau keputusan pengurangan karyawan.',
          ),
        ],
      ],
    );
  }
}

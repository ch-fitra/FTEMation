import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/widgets/workspace_widgets.dart';
import '../../core/format.dart';
import '../analysis/analysis_page.dart' show analysisStates;
import '../datasets/workspace_state.dart';

class OverviewPage extends StatelessWidget {
  const OverviewPage({super.key});
  @override
  Widget build(BuildContext context) {
    final state = context.watch<WorkspaceState>();
    final s = state.summary;
    return RefreshIndicator(
      onRefresh: () async {
        if (state.activeId != null) await state.select(state.activeId!);
      },
      child: PageBody(
        title: 'Dashboard assessment',
        subtitle: 'Kapasitas & peluang otomatisasi',
        children: [
          if (s == null && !state.loading)
            const Notice('Pilih atau import dataset untuk melihat assessment.'),
          if (s != null) ...[
            Text(
              'Status terbaru: ${analysisStates[s['analysis_status']] ?? 'Belum dimulai'} - Sumber KPI: ${s['analysis_run_id'] == null ? 'baseline' : 'Run ${s['analysis_run_id']}'}',
            ),
            const SizedBox(height: 16),
            LayoutBuilder(
              builder: (context, box) => Wrap(
                spacing: 12,
                children:
                    [
                          ('Total workload', number(s['total_fte'])),
                          (
                            'Estimasi saving',
                            number(s['estimated_fte_saving']),
                          ),
                          ('Aktivitas', '${s['activities_count']}'),
                          ('Karyawan', '${s['employees_count']}'),
                          ('Departemen', '${s['departments_count']}'),
                        ]
                        .map(
                          (v) => SizedBox(
                            width: box.maxWidth >= 340
                                ? (box.maxWidth - 12) / 2
                                : box.maxWidth,
                            child: Panel(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(v.$1),
                                  const SizedBox(height: 12),
                                  Text(
                                    v.$2,
                                    style: Theme.of(context)
                                        .textTheme
                                        .headlineMedium,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )
                        .toList(),
              ),
            ),
            Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'FTE per departemen',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  for (final d in s['departments'] as List)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${d['department']} - ${number(d['total_fte'])} FTE',
                          ),
                          const SizedBox(height: 8),
                          LinearProgressIndicator(
                            value: num.parse('${s['total_fte']}') > 0
                                ? (num.parse('${d['total_fte']}') /
                                          num.parse('${s['total_fte']}'))
                                      .clamp(0, 1)
                                      .toDouble()
                                : 0,
                          ),
                        ],
                      ),
                    ),
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
                  if ((s['top_opportunities'] as List).isEmpty)
                    const Text('Belum ada completed run.'),
                  for (final a in s['top_opportunities'] as List)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('${a['activity_name']}'),
                      subtitle: Text(
                        '${a['recommendation']}\n${number(a['estimated_fte_saving'])} FTE saving',
                      ),
                    ),
                  Text(
                    'Distribusi otomatisasi: ${s['automation_levels'] ?? 'Belum tersedia'}',
                  ),
                ],
              ),
            ),
            for (final warning in s['warnings'] as List) Notice('$warning'),
          ],
          const Notice(
            'Saving adalah estimasi kapasitas waktu, bukan realisasi efisiensi atau keputusan pengurangan karyawan.',
          ),
        ],
      ),
    );
  }
}

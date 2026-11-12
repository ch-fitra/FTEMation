import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/demo/demo_data.dart';
import '../../core/widgets/workspace_widgets.dart';
import '../activities/activity_detail.dart';

class ResultsPage extends StatefulWidget {
  const ResultsPage({super.key});
  @override
  State<ResultsPage> createState() => _ResultsState();
}

class _ResultsState extends State<ResultsPage> {
  String level = 'Semua';
  int run = 1;
  @override
  Widget build(BuildContext context) {
    final d = context.watch<DemoState>().active;
    return PageBody(
      title: 'Hasil analisis AI',
      subtitle: 'Rekomendasi & detail hasil ilustratif',
      children: [
        const Notice(
          'Klasifikasi dan rekomendasi adalah data demo, bukan hasil penilaian DeepSeek.',
        ),
        if (d.activities.isEmpty)
          const Notice('Belum ada hasil untuk dataset kosong ini.')
        else ...[
          DropdownButtonFormField<int>(
            initialValue: run,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Riwayat snapshot demo',
            ),
            items: const [
              DropdownMenuItem(
                value: 1,
                child: Text('Snapshot 1 - Selesai - Demo'),
              ),
              DropdownMenuItem(
                value: 2,
                child: Text('Snapshot 2 - Dibatalkan - Demo'),
              ),
            ],
            onChanged: (v) => setState(() => run = v!),
          ),
          const SizedBox(height: 16),
          if (run == 2)
            const Notice(
              'Snapshot dibatalkan. Hasil final dan export belum tersedia.',
            )
          else ...[
            Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Ringkasan dataset',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${d.employees} karyawan - ${d.departments.length} departemen',
                  ),
                  ...d.departments.map(
                    (dept) => Text(
                      '$dept: ${d.activities.where((a) => a.department == dept).map((a) => a.employee).toSet().join(', ')}',
                    ),
                  ),
                ],
              ),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: ['Semua', 'High', 'Medium', 'Low']
                  .map(
                    (l) => ChoiceChip(
                      label: Text(l),
                      selected: level == l,
                      onSelected: (_) => setState(() => level = l),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 16),
            ...d.activities
                .where((a) => level == 'Semua' || a.level == level)
                .map(
                  (a) => Panel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        LevelBadge(a.level),
                        const SizedBox(height: 8),
                        Text(
                          a.name,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text('${a.employee} - ${a.department}'),
                        const SizedBox(height: 12),
                        Text(a.recommendation),
                        TextButton(
                          onPressed: () =>
                              showActivityDetail(context, a, result: true),
                          child: const Text('Detail hasil aktivitas'),
                        ),
                      ],
                    ),
                  ),
                ),
            if (!d.activities.any((a) => level == 'Semua' || a.level == level))
              const Notice('Tidak ada hasil pada klasifikasi ini.'),
            OutlinedButton.icon(
              onPressed: () => integrationNotice(context),
              icon: const Icon(Icons.file_download_outlined),
              label: const Text('Informasi export'),
            ),
          ],
        ],
      ],
    );
  }
}

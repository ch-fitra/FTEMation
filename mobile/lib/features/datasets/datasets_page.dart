import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/demo/demo_data.dart';
import '../../core/widgets/workspace_widgets.dart';

class DatasetsPage extends StatelessWidget {
  const DatasetsPage({super.key});
  @override
  Widget build(BuildContext context) {
    final state = context.watch<DemoState>();
    return PageBody(
      title: 'Import dataset',
      subtitle: 'Kelola sumber assessment workload',
      children: [
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.cloud_upload_outlined, size: 42),
              const SizedBox(height: 12),
              Text(
                'Mulai dari data yang tepat',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              const Text(
                'Excel .xlsx - satu sheet Workload - sembilan kolom wajib. Upload asli tersedia pada Tahap 2.\n\nKolom: activity_id, employee_id, employee_name, department, activity_name, description, frequency, volume, duration_minutes.',
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () => integrationNotice(context),
                icon: const Icon(Icons.upload_file),
                label: const Text('Informasi import Excel'),
              ),
            ],
          ),
        ),
        Text(
          'Dataset demo tersedia',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 16),
        ...demoDatasets.map(
          (d) => Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(d.name, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Text(
                  '${d.activities.length} aktivitas - ${d.employees} karyawan - ${d.departments.length} departemen',
                ),
                const SizedBox(height: 8),
                Text(
                  d.activities.isEmpty
                      ? 'Demo kosong'
                      : 'Siap ditinjau - data sintetis',
                ),
                FilledButton.tonal(
                  onPressed: state.active == d
                      ? null
                      : () => state.select(d.id),
                  child: Text(
                    state.active == d ? 'Dataset aktif' : 'Gunakan dataset',
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

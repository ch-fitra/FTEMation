import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/demo/demo_data.dart';
import '../../core/widgets/workspace_widgets.dart';

const analysisStates = {
  'queued': 'Dalam antrean',
  'processing': 'Sedang dianalisis',
  'completed': 'Selesai',
  'cancelled': 'Dibatalkan',
  'failed': 'Gagal',
  'cancel_requested': 'Menunggu pembatalan',
};

class AnalysisPage extends StatefulWidget {
  const AnalysisPage({super.key});
  @override
  State<AnalysisPage> createState() => _AnalysisState();
}

class _AnalysisState extends State<AnalysisPage> {
  String scenario = 'completed';
  @override
  Widget build(BuildContext context) {
    final d = context.watch<DemoState>().active;
    final progress = scenario == 'completed'
        ? 1.0
        : scenario == 'queued'
        ? 0.0
        : 0.5;
    return PageBody(
      title: 'Analisis otomatisasi',
      subtitle: 'Status & penggunaan AI',
      children: [
        const Notice(
          'Galeri status demo. Pemilihan skenario hanya mengubah contoh tampilan, tidak menjalankan analisis.',
        ),
        if (d.activities.isEmpty)
          const Notice('Dataset belum memiliki aktivitas.')
        else ...[
          DropdownButtonFormField<String>(
            initialValue: scenario,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Skenario tampilan demo',
            ),
            items: analysisStates.entries
                .map(
                  (s) => DropdownMenuItem(value: s.key, child: Text(s.value)),
                )
                .toList(),
            onChanged: (v) => setState(() => scenario = v!),
          ),
          const SizedBox(height: 16),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  analysisStates[scenario]!,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 16),
                LinearProgressIndicator(
                  value: progress,
                  minHeight: 8,
                  borderRadius: BorderRadius.circular(8),
                ),
                const SizedBox(height: 12),
                Text(
                  '${(progress * 100).round()}% - ilustrasi progres, bukan proses server',
                ),
                const Divider(height: 32),
                const Text(
                  'Provider Tahap 2: DeepSeek\nModel / prompt / token aktual: belum tersedia\nRequest server: tidak dilakukan',
                ),
                const SizedBox(height: 16),
                if (scenario == 'failed')
                  const Text(
                    'Contoh error: layanan tidak tersedia. Hasil sukses dipertahankan; retry terbatas pada bagian belum berhasil.',
                  ),
                if (scenario == 'cancel_requested' || scenario == 'cancelled')
                  const Text(
                    'Hasil sukses tetap disimpan. Request yang sudah diterima provider dapat tetap memakai saldo. Resume menggunakan run dan snapshot asli.',
                  ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    OutlinedButton(
                      onPressed: () => integrationNotice(context),
                      child: const Text('Info mulai / retry'),
                    ),
                    OutlinedButton(
                      onPressed: () => integrationNotice(context),
                      child: const Text('Info cancel / resume'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

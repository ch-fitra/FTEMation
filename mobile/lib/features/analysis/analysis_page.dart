import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/widgets/app_dropdown.dart';
import '../../core/widgets/workspace_widgets.dart';
import '../datasets/workspace_state.dart';
import 'run_state.dart';

const analysisStates = {
  'queued': 'Dalam antrean',
  'processing': 'Sedang diproses',
  'cancel_requested': 'Menunggu pembatalan',
  'cancelled': 'Dibatalkan',
  'completed': 'Selesai',
  'failed': 'Gagal',
  'partial_failed': 'Sebagian gagal',
};

class AnalysisPage extends StatefulWidget {
  const AnalysisPage({super.key});
  @override
  State<AnalysisPage> createState() => _AnalysisState();
}

class _AnalysisState extends State<AnalysisPage> with WidgetsBindingObserver {
  RunState? runs;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final state = context.read<WorkspaceState>();
    if (state.activeId != null) {
      runs = RunState(state.repository, state.activeId!);
      runs!.addListener(update);
      runs!.load();
    }
  }

  void update() {
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    runs?.setActive(state == AppLifecycleState.resumed);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    runs?.removeListener(update);
    runs?.dispose();
    super.dispose();
  }

  Future<void> action(String action) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(
          action == 'cancel' ? 'Batalkan analisis?' : 'Jalankan analisis AI?',
        ),
        content: Text(
          action == 'cancel'
              ? 'Hasil sukses tetap disimpan. Request yang sudah diterima provider mungkin tetap memakai saldo API.'
              : 'Tindakan ini dapat menggunakan saldo DeepSeek. Pastikan Anda berwenang menggunakan layanan AI.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Kembali'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Konfirmasi'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await runs!.action(action);
      if (mounted) {
        final state = context.read<WorkspaceState>();
        if (state.activeId != null) state.select(state.activeId!);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = runs?.selected;
    final success = (r?['progress']?['success'] as num? ?? 0).toInt();
    final total = (r?['total'] as num? ?? 0).toInt();
    return RefreshIndicator(
      onRefresh: () async {
        await runs?.load();
      },
      child: PageBody(
        title: 'Analisis otomatisasi',
        subtitle: 'Status & penggunaan AI',
        children: [
          if (runs == null) const Notice('Pilih dataset terlebih dahulu.'),
          if (runs != null) ...[
            if (runs!.loading) const LinearProgressIndicator(),
            if (runs!.error != null) Notice(runs!.error!),
            if (runs!.history.isNotEmpty)
              AppDropdown<int>(
                key: ValueKey(runs!.selectedId),
                value: runs!.selectedId,
                label: 'Riwayat analisis',
                items: runs!.history
                    .map(
                      (v) => AppDropdownItem(
                        value: v['id'] as int,
                        label: 'Run ${v['id']} \u00b7 ${analysisStates[v['status']] ?? v['status']}',
                      ),
                    )
                    .toList(),
                onChanged: runs!.mutating ? null : (v) => runs!.choose(v!),
              ),
            const SizedBox(height: 16),
            if (r != null)
              Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      analysisStates[r['status']] ?? '${r['status']}',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    if (r['resumed_at'] != null)
                      const Text('Dilanjutkan pada run dan snapshot asli.'),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(
                      value: total == 0 ? 0 : success / total,
                    ),
                    Text('$success / $total aktivitas sukses'),
                    Text(
                      'Run ${r['id']} - versi ${r['execution_version']}\nModel: ${r['actual_model'] ?? r['model_name']}\nPrompt: ${r['prompt_version']}',
                    ),
                    Text(
                      'Antrean: ${r['queue_health']?['worker_status'] == 'recently_seen' ? 'Sinyal worker baru terdeteksi' : 'Belum ada sinyal worker baru; lihat diagnosis server'}',
                    ),
                    if (r['error_message'] != null)
                      Text('${r['error_message']}'),
                    for (final f in r['failures'] as List? ?? [])
                      Text('${f['activity_id']}: ${f['message']}'),
                  ],
                ),
              ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton(
                  onPressed:
                      runs!.mutating ||
                          runs!.loading ||
                          [
                            'queued',
                            'processing',
                            'cancel_requested',
                          ].contains(r?['status'])
                      ? null
                      : () => action('start'),
                  child: const Text('Mulai analisis baru'),
                ),
                if (r?['can_retry'] == true)
                  OutlinedButton(
                    onPressed: runs!.mutating ? null : () => action('retry'),
                    child: const Text('Retry bagian gagal'),
                  ),
                if (r?['can_cancel'] == true ||
                    r?['can_finalize_cancel'] == true)
                  OutlinedButton(
                    onPressed: runs!.mutating ? null : () => action('cancel'),
                    child: const Text('Batalkan analisis'),
                  ),
                if (r?['can_resume'] == true)
                  OutlinedButton(
                    onPressed: runs!.mutating ? null : () => action('resume'),
                    child: const Text('Lanjutkan analisis'),
                  ),
              ],
            ),
            const Notice(
              'Status dibaca dari server. Membuka halaman ini tidak menyalakan worker atau mengirim inference.',
            ),
          ],
        ],
      ),
    );
  }
}

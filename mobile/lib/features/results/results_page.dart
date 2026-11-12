import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/widgets/app_dropdown.dart';
import '../../core/widgets/workspace_widgets.dart';
import '../datasets/workspace_state.dart';
import '../analysis/run_state.dart';
import '../analysis/analysis_page.dart';
import '../activities/activity_detail.dart';
import '../../core/format.dart';

class ResultsPage extends StatefulWidget {
  const ResultsPage({super.key});
  @override
  State<ResultsPage> createState() => _ResultsState();
}

class _ResultsState extends State<ResultsPage> {
  RunState? runs;
  String level = 'Semua';
  bool exporting = false;
  String? exportMessage;
  @override
  void initState() {
    super.initState();
    final state = context.read<WorkspaceState>();
    if (state.activeId != null) {
      runs = RunState(state.repository, state.activeId!);
      runs!.active = false;
      runs!.addListener(update);
      runs!.load(preferCompleted: true);
    }
  }

  void update() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    runs?.removeListener(update);
    runs?.dispose();
    super.dispose();
  }

  Future<void> export(String format) async {
    final id = runs!.selectedId!;
    setState(() {
      exporting = true;
      exportMessage = null;
    });
    try {
      final file = await runs!.repository.export(id, format);
      if (!mounted) return;
      final uri = await FilePicker.saveFile(
        fileName: file.name,
        bytes: Uint8List.fromList(file.bytes),
        mimeType: file.mime,
      );
      if (mounted) {
        setState(
          () => exportMessage = uri == null
              ? 'Penyimpanan dibatalkan.'
              : 'File berhasil disimpan melalui pemilih lokasi Android.',
        );
      }
    } catch (e) {
      if (mounted) setState(() => exportMessage = '$e');
    }
    if (mounted) setState(() => exporting = false);
  }

  @override
  Widget build(BuildContext context) {
    final r = runs?.selected;
    final report = r?['report'];
    return RefreshIndicator(
      onRefresh: () async {
        await runs?.load();
      },
      child: PageBody(
        title: 'Hasil analisis AI',
        subtitle: 'Rekomendasi & snapshot Laravel',
        children: [
          if (runs?.loading == true) const LinearProgressIndicator(),
          if (runs?.error != null) Notice(runs!.error!),
          if (runs != null && runs!.history.isNotEmpty)
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
              onChanged: exporting
                  ? null
                  : (v) {
                      level = 'Semua';
                      exportMessage = null;
                      runs!.choose(v!);
                    },
            ),
          const SizedBox(height: 16),
          if (report == null)
            const Notice(
              'Hasil final dan export tersedia setelah seluruh aktivitas serta kesimpulan selesai.',
            ),
          if (r != null)
            Text(
              'Dataset ${r['import_id']} - Run ${r['id']} - ${analysisStates[r['status']]}\nModel: ${r['actual_model'] ?? r['model_name']} - Prompt: ${r['prompt_version']}\n${r['progress']?['success'] ?? 0} / ${r['total']} aktivitas sukses',
            ),
          if (report != null) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: ['Semua', 'high', 'medium', 'low']
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
            for (final a in (report['activities'] as List).where(
              (a) => level == 'Semua' || a['automation_level'] == level,
            ))
              Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    LevelBadge('${a['automation_level']}'),
                    Text(
                      '${a['activity_name']}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text('${a['employee_name']} - ${a['department']}'),
                    Text('${a['reason']}'),
                    Text('${a['recommendation']}'),
                    Text('${number(a['estimated_fte_saving'])} FTE saving'),
                    TextButton(
                      onPressed: () => showActivityDetail(
                        context,
                        Map<String, dynamic>.from(a),
                        result: true,
                      ),
                      child: const Text('Detail hasil aktivitas'),
                    ),
                  ],
                ),
              ),
            for (final section in ['employees', 'departments'])
              ExpansionTile(
                title: Text(
                  section == 'employees'
                      ? 'Ringkasan karyawan'
                      : 'Ringkasan departemen',
                ),
                children: [
                  for (final e in report[section] as List)
                    ListTile(
                      title: Text('${e['employee_name'] ?? e['department']}'),
                      subtitle: Text(
                        '${number(e['total_fte'])} FTE - ${number(e['estimated_fte_saving'])} saving\n${e['summary'] ?? ''}\n${e['opportunities'] ?? ''}\n${e['oversight_note'] ?? ''}',
                      ),
                    ),
                ],
              ),
            Wrap(
              spacing: 8,
              children: ['pdf', 'xlsx', 'json']
                  .map(
                    (f) => OutlinedButton.icon(
                      onPressed: exporting ? null : () => export(f),
                      icon: const Icon(Icons.file_download_outlined),
                      label: Text('Simpan ${f.toUpperCase()}'),
                    ),
                  )
                  .toList(),
            ),
            if (exporting) const LinearProgressIndicator(),
            if (exportMessage != null) Notice(exportMessage!),
          ],
        ],
      ),
    );
  }
}

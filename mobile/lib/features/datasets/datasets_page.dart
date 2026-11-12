import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';

import '../../core/widgets/workspace_widgets.dart';
import 'workspace_state.dart';

class DatasetsPage extends StatefulWidget {
  const DatasetsPage({super.key});
  @override
  State<DatasetsPage> createState() => _DatasetsState();
}

class _DatasetsState extends State<DatasetsPage> {
  bool uploading = false;
  double progress = 0;
  String? error;
  Future<void> upload() async {
    final state = context.read<WorkspaceState>();
    try {
      final picked = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['xlsx'],
      );
      if (picked.isEmpty || !mounted) return;
      final file = picked.single;
      final size = await file.length();
      if (!mounted) return;
      if (!file.name.toLowerCase().endsWith('.xlsx') ||
          (size ?? 0) > 5 * 1024 * 1024 ||
          (size ?? 0) == 0) {
        throw Exception('Pilih file .xlsx berukuran maksimal 5 MB.');
      }
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          title: const Text('Import dataset?'),
          content: Text(
            '${file.name}\nFile akan divalidasi dan disimpan privat oleh Laravel.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('Batal'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(c, true),
              child: const Text('Upload'),
            ),
          ],
        ),
      );
      if (confirmed != true || !mounted) return;
      final sessionToken = state.repository.api.token;
      final selectedBeforeUpload = state.activeId;
      setState(() {
        uploading = true;
        error = null;
        progress = 0;
      });
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty || bytes.length > 5 * 1024 * 1024) {
        throw Exception('Ukuran file tidak sesuai batas 5 MB.');
      }
      if (state.repository.api.token != sessionToken) return;
      final result = await state.repository.upload(bytes, file.name, (
        sent,
        total,
      ) {
        if (mounted && total > 0) setState(() => progress = sent / total);
      });
      if (state.repository.api.token != sessionToken) return;
      await state.loadDatasets();
      if (state.repository.api.token == sessionToken &&
          state.activeId == selectedBeforeUpload) {
        await state.select(result['import']['id'] as int);
      }
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    }
    if (mounted) setState(() => uploading = false);
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<WorkspaceState>();
    return RefreshIndicator(
      onRefresh: () => state.loadDatasets(page: state.page),
      child: PageBody(
        title: 'Import dataset',
        subtitle: 'Kelola sumber assessment workload',
        children: [
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.cloud_upload_outlined, size: 42),
                const SizedBox(height: 12),
                const Text(
                  'Excel .xlsx - maksimal 5 MB - satu sheet Workload - sembilan kolom wajib.',
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: uploading ? null : upload,
                  icon: const Icon(Icons.upload_file),
                  label: const Text('Pilih Excel'),
                ),
                if (uploading) LinearProgressIndicator(value: progress),
                if (error != null) Text(error!),
              ],
            ),
          ),
          if (state.loadingDatasets) const LinearProgressIndicator(),
          if (state.datasets.isEmpty && !state.loadingDatasets)
            const Notice('Belum ada dataset.'),
          for (final d in state.datasets)
            Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${d['filename']}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    '${d['activities_count']} aktivitas - ${d['employees_count']} karyawan - ${d['status']}',
                  ),
                  FilledButton.tonal(
                    onPressed: state.activeId == d['id']
                        ? null
                        : () => state.select(d['id'] as int),
                    child: Text(
                      state.activeId == d['id']
                          ? 'Dataset aktif'
                          : 'Gunakan dataset',
                    ),
                  ),
                ],
              ),
            ),
          Wrap(
            spacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TextButton(
                onPressed: state.page > 1 && !state.loadingDatasets
                    ? () => state.loadDatasets(page: state.page - 1)
                    : null,
                child: const Text('Sebelumnya'),
              ),
              Text('${state.page} / ${state.lastPage}'),
              TextButton(
                onPressed: state.page < state.lastPage && !state.loadingDatasets
                    ? () => state.loadDatasets(page: state.page + 1)
                    : null,
                child: const Text('Berikutnya'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

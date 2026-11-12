import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/widgets/workspace_widgets.dart';
import '../datasets/workspace_state.dart';
import '../../core/format.dart';
import 'activity_detail.dart';

class ActivitiesPage extends StatefulWidget {
  const ActivitiesPage({super.key});
  @override
  State<ActivitiesPage> createState() => _ActivitiesState();
}

class _ActivitiesState extends State<ActivitiesPage> {
  String query = '', department = '', frequency = '';
  int page = 1, lastPage = 1, total = 0, generation = 0;
  List<Map<String, dynamic>> rows = [];
  bool loading = false;
  String? error;
  CancelToken? cancel;
  Timer? debounce;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) load();
    });
  }

  Future<void> load() async {
    final state = context.read<WorkspaceState>();
    final id = state.activeId;
    if (id == null) return;
    final current = ++generation;
    cancel?.cancel();
    final token = cancel = CancelToken();
    setState(() {
      loading = true;
      error = null;
      rows = [];
    });
    try {
      final data = await state.repository.activities(id, {
        'page': page,
        'per_page': 20,
        if (query.isNotEmpty) 'search': query,
        if (department.isNotEmpty) 'department': department,
        if (frequency.isNotEmpty) 'frequency': frequency,
      }, token);
      if (!mounted || current != generation) return;
      setState(() {
        rows = (data['data'] as List)
            .map((v) => Map<String, dynamic>.from(v))
            .toList();
        lastPage = data['last_page'] as int;
        total = data['total'] as int;
      });
    } catch (e) {
      if (mounted && current == generation && !token.isCancelled) {
        setState(() => error = '$e');
      }
    }
    if (mounted && current == generation) setState(() => loading = false);
  }

  void changed() {
    page = 1;
    load();
  }

  @override
  void dispose() {
    generation++;
    debounce?.cancel();
    cancel?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<WorkspaceState>();
    final departments = (state.summary?['departments'] as List? ?? [])
        .map((d) => '${d['department']}')
        .toList();
    return RefreshIndicator(
      onRefresh: load,
      child: PageBody(
        title: 'Data aktivitas',
        subtitle: 'Input workload & FTE deterministik',
        children: [
          TextField(
            decoration: const InputDecoration(
              labelText: 'Cari aktivitas atau karyawan',
              prefixIcon: Icon(Icons.search),
            ),
            onChanged: (v) {
              query = v;
              debounce?.cancel();
              debounce = Timer(const Duration(milliseconds: 350), changed);
            },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: department,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Departemen'),
            items: ['', ...departments]
                .map(
                  (v) => DropdownMenuItem(
                    value: v,
                    child: Text(v.isEmpty ? 'Semua' : frequencyLabels[v] ?? v),
                  ),
                )
                .toList(),
            onChanged: (v) {
              department = v!;
              changed();
            },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: frequency,
            decoration: const InputDecoration(labelText: 'Frekuensi'),
            items: ['', 'daily', 'weekly', 'monthly']
                .map(
                  (v) => DropdownMenuItem(
                    value: v,
                    child: Text(v.isEmpty ? 'Semua' : frequencyLabels[v] ?? v),
                  ),
                )
                .toList(),
            onChanged: (v) {
              frequency = v!;
              changed();
            },
          ),
          const SizedBox(height: 16),
          if (loading) const LinearProgressIndicator(),
          if (error != null) Notice(error!),
          Text('$total aktivitas - halaman $page / $lastPage'),
          if (!loading && rows.isEmpty)
            const Notice(
              'Tidak ada aktivitas yang cocok. Ubah pencarian, filter, atau dataset.',
            ),
          for (final a in rows)
            Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${a['activity_code']}'),
                  Text(
                    '${a['activity_name']}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    '${a['employee']['name']} - ${a['employee']['department']}',
                  ),
                  Text('${number(a['fte'])} FTE'),
                  TextButton(
                    onPressed: () => showActivityDetail(context, a),
                    child: const Text('Detail aktivitas'),
                  ),
                ],
              ),
            ),
          Wrap(
            spacing: 16,
            children: [
              TextButton(
                onPressed: !loading && page > 1
                    ? () {
                        page--;
                        load();
                      }
                    : null,
                child: const Text('Sebelumnya'),
              ),
              TextButton(
                onPressed: !loading && page < lastPage
                    ? () {
                        page++;
                        load();
                      }
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

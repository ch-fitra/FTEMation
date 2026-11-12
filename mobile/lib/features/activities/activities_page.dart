import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/demo/demo_data.dart';
import '../../core/widgets/workspace_widgets.dart';
import 'activity_detail.dart';

class ActivitiesPage extends StatefulWidget {
  const ActivitiesPage({super.key});
  @override
  State<ActivitiesPage> createState() => _ActivitiesState();
}

class _ActivitiesState extends State<ActivitiesPage> {
  String query = '', department = 'Semua', frequency = 'Semua';
  @override
  Widget build(BuildContext context) {
    final d = context.watch<DemoState>().active;
    final filtered = d.activities
        .where(
          (a) =>
              '${a.id} ${a.name} ${a.employee}'.toLowerCase().contains(
                query.toLowerCase(),
              ) &&
              (department == 'Semua' || department == a.department) &&
              (frequency == 'Semua' || frequency == a.frequency),
        )
        .toList();
    return PageBody(
      title: 'Data aktivitas',
      subtitle: 'Input workload & FTE deterministik - demo',
      children: [
        TextField(
          decoration: const InputDecoration(
            labelText: 'Cari aktivitas atau karyawan',
            prefixIcon: Icon(Icons.search),
          ),
          onChanged: (v) => setState(() => query = v),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: department,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Departemen'),
          items: [
            'Semua',
            ...d.departments,
          ].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
          onChanged: (v) => setState(() => department = v!),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: frequency,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Frekuensi'),
          items: [
            'Semua',
            'Harian',
            'Mingguan',
            'Bulanan',
          ].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
          onChanged: (v) => setState(() => frequency = v!),
        ),
        const SizedBox(height: 16),
        Text('${filtered.length} aktivitas ditampilkan'),
        const SizedBox(height: 12),
        if (filtered.isEmpty)
          const Notice(
            'Tidak ada aktivitas yang cocok. Ubah pencarian, filter, atau dataset.',
          ),
        ...filtered.map(
          (a) => Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(a.id, style: Theme.of(context).textTheme.bodySmall),
                Text(a.name, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Text(
                  '${a.employee} - ${a.department}\n${a.frequency} - ${a.duration} menit/unit',
                ),
                Text('${fte(a.fte)} FTE'),
                TextButton(
                  onPressed: () => showActivityDetail(context, a),
                  child: const Text('Detail aktivitas'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

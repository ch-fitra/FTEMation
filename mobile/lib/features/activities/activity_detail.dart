import 'package:flutter/material.dart';

import '../../core/widgets/workspace_widgets.dart';
import '../../core/format.dart';

void showActivityDetail(
  BuildContext context,
  Map<String, dynamic> a, {
  bool result = false,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useRootNavigator: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (c) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: .75,
    minChildSize: .4,
    maxChildSize: .95,
    builder: (c, controller) => SingleChildScrollView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: IconButton(
              tooltip: 'Tutup detail',
              onPressed: () => Navigator.pop(c),
              icon: const Icon(Icons.close),
            ),
          ),
          Text(
            '${a['activity_name']}',
            style: Theme.of(c).textTheme.titleLarge,
          ),
          Text('${a['activity_id'] ?? a['activity_code']}'),
          const Divider(height: 32),
          Text(
            'Karyawan: ${a['employee_name'] ?? a['employee']?['name']}\nDepartemen: ${a['department'] ?? a['employee']?['department']}\nFrekuensi: ${a['frequency']}\nVolume: ${a['volume']}\nDurasi: ${a['duration_minutes']} menit\nWorkload: ${number(a['fte'])} FTE',
          ),
          Text('${a['description'] ?? ''}'),
          if (result) ...[
            LevelBadge('${a['automation_level']}'),
            Text('Alasan: ${a['reason']}'),
            Text('Rekomendasi: ${a['recommendation']}'),
            Text('Risiko: ${a['risk_level']} - Effort: ${a['effort_level']}'),
            Text('Saving: ${number(a['estimated_fte_saving'])} FTE'),
            Text(
              'Kontrol manusia: ${a['oversight_required'] == true ? 'Diperlukan' : 'Lihat catatan exception'}\n${a['oversight_note'] ?? ''}',
            ),
            Text(
              'Faktor: ${a['factors']}\nScope: ${a['automation_scope']}\nGrup: ${a['group_name']}',
            ),
          ],
        ],
      ),
    ),
  ),
);

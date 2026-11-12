import 'package:flutter/material.dart';

import '../../core/demo/demo_data.dart';
import '../../core/widgets/workspace_widgets.dart';

void showActivityDetail(
  BuildContext context,
  DemoActivity a, {
  bool result = false,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useRootNavigator: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (c) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.75,
    minChildSize: 0.4,
    maxChildSize: 0.95,
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
          Text(a.name, style: Theme.of(c).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text('${a.id} - DATA DEMO'),
          const Divider(height: 32),
          Text(
            'Karyawan: ${a.employee}\nDepartemen: ${a.department}\nFrekuensi: ${a.frequency}\nDurasi per unit: ${a.duration} menit\nWorkload: ${fte(a.fte)} FTE',
          ),
          if (result) ...[
            const SizedBox(height: 20),
            LevelBadge(a.level),
            const SizedBox(height: 16),
            Text(
              'Rekomendasi ilustratif',
              style: Theme.of(c).textTheme.titleMedium,
            ),
            Text(a.recommendation),
            const SizedBox(height: 12),
            Text(
              'Estimasi saving: ${fte(a.saving)} FTE\nKontrol manusia: review pengecualian dan keputusan final.\nKlasifikasi ini hanya fixture UI, bukan hasil inference.',
            ),
          ],
        ],
      ),
    ),
  ),
);

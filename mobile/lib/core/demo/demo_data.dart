import 'package:flutter/foundation.dart';

class DemoActivity {
  const DemoActivity(
    this.id,
    this.name,
    this.employee,
    this.department,
    this.frequency,
    this.duration,
    this.fte,
    this.saving,
    this.level,
    this.recommendation,
  );
  final String id, name, employee, department, frequency, level, recommendation;
  final int duration;
  final double fte, saving;
}

class DemoDataset {
  const DemoDataset(
    this.id,
    this.name,
    this.activities,
    this.total,
    this.saving,
  );
  final String id, name;
  final List<DemoActivity> activities;
  final double total, saving;
  List<String> get departments =>
      activities.map((a) => a.department).toSet().toList();
  int get employees => activities.map((a) => a.employee).toSet().length;
}

// Precomputed synthetic fixtures, not model output or production data.
const demoDatasets = [
  DemoDataset(
    'demo-1',
    'Workload Operasional.xlsx',
    [
      DemoActivity(
        'DEMO-001',
        'Rekap invoice harian',
        'Ayu',
        'Finance',
        'Harian',
        30,
        0.25,
        0.15,
        'High',
        'Bantu rekap data terstruktur bila format telah dikonfirmasi. Review pengecualian oleh manusia.',
      ),
      DemoActivity(
        'DEMO-002',
        'Validasi biaya',
        'Bima',
        'Finance',
        'Mingguan',
        60,
        0.125,
        0.0375,
        'Medium',
        'Bantu validasi kelengkapan; persetujuan biaya tetap oleh penanggung jawab.',
      ),
      DemoActivity(
        'DEMO-003',
        'Pembaruan data karyawan',
        'Citra',
        'HR',
        'Harian',
        20,
        0.1667,
        0.1000,
        'High',
        'Bantu validasi field setelah sumber data disepakati.',
      ),
      DemoActivity(
        'DEMO-004',
        'Wawancara kandidat',
        'Deni',
        'HR',
        'Mingguan',
        60,
        0.125,
        0.0125,
        'Low',
        'Bantu catatan; evaluasi dan keputusan tetap oleh manusia.',
      ),
      DemoActivity(
        'DEMO-005',
        'Rekap pesanan',
        'Eka',
        'Operations',
        'Harian',
        30,
        0.25,
        0.15,
        'High',
        'Bantu konsolidasi pesanan terstruktur dengan review pengecualian.',
      ),
      DemoActivity(
        'DEMO-006',
        'Review mitra',
        'Eka',
        'Operations',
        'Bulanan',
        120,
        0.0833,
        0.0083,
        'Low',
        'Bantu rangkuman; negosiasi dan keputusan tetap oleh pemilik proses.',
      ),
    ],
    1.0,
    0.4583,
  ),
  DemoDataset(
    'demo-2',
    'Workload Layanan.xlsx',
    [
      DemoActivity(
        'DEMO-101',
        'Klasifikasi tiket',
        'Fani',
        'Customer Care',
        'Harian',
        45,
        0.375,
        0.1125,
        'Medium',
        'Bantu klasifikasi awal; eskalasi kasus ambigu kepada petugas.',
      ),
      DemoActivity(
        'DEMO-102',
        'Rekap layanan',
        'Gilang',
        'Customer Care',
        'Mingguan',
        60,
        0.125,
        0.075,
        'High',
        'Bantu rekap field terstruktur yang tersedia.',
      ),
    ],
    0.5,
    0.1875,
  ),
  DemoDataset('demo-3', 'Dataset Kosong.xlsx', [], 0, 0),
];

class DemoState extends ChangeNotifier {
  DemoDataset _active = demoDatasets.first;
  DemoDataset get active => _active;
  void select(String id) {
    final next = demoDatasets.firstWhere((d) => d.id == id);
    if (next == _active) return;
    _active = next;
    notifyListeners();
  }
}

String fte(double value) => value.toStringAsFixed(4).replaceAll('.', ',');

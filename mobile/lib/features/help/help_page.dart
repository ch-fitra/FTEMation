import 'package:flutter/material.dart';

import '../../core/widgets/workspace_widgets.dart';

class HelpPage extends StatelessWidget {
  const HelpPage({super.key});
  @override
  Widget build(BuildContext context) => PageBody(
    title: 'Pusat Bantuan',
    subtitle: 'Panduan & metodologi FTEMation',
    children: [
      const Notice(
        'FTEMation membantu assessment beban kerja dan peluang otomatisasi. Data dan hasil berasal dari Laravel.',
      ),
      ...const <(String, String)>[
        (
          'Bagaimana memulai?',
          'Pilih dataset pada Import Dataset. Buka Overview, tinjau Data Aktivitas, lalu tinjau status Analisis AI dan detail Hasil Analisis. Analisis baru memerlukan konfirmasi biaya.',
        ),
        (
          'Apa arti High, Medium, Low?',
          'High: mayoritas langkah administratif dapat diotomasi. Medium: sebagian langkah dengan review manusia. Low: bantuan terbatas; judgment manusia dominan. Keputusan final berisiko tetap diawasi manusia.',
        ),
        (
          'Bagaimana FTE dihitung?',
          'Laravel menghitung menit tahunan dibagi kapasitas 115.200 menit (1.920 jam). Faktor: harian 240, mingguan 48, bulanan 12. Flutter hanya menampilkan nilai snapshot, tidak menghitung ulang FTE atau saving.',
        ),
        (
          'Apakah saving berarti pengurangan karyawan?',
          'Tidak. Saving adalah estimasi kapasitas waktu, bukan efisiensi terealisasi atau keputusan pengurangan pegawai. Konfirmasi asumsi bersama pemilik proses.',
        ),
        (
          'Bagaimana cancel / resume bekerja?',
          'Hasil sukses dipertahankan. Request yang sudah diterima provider dapat tetap memakai saldo. Resume melanjutkan bagian belum sukses pada run dan snapshot yang sama.',
        ),
        (
          'Informasi aplikasi',
          'FTEMation Mobile 1.0.0+1 - Flutter Android - REST API Laravel. AI hanya diakses oleh backend.',
        ),
      ].map(
        (entry) => Panel(
          child: ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: Text(entry.$1),
            children: [
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(entry.$2),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

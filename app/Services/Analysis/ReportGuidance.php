<?php

namespace App\Services\Analysis;

class ReportGuidance
{
    public const WORKLOAD = 'Beban aktivitas tercatat melebihi satu FTE berdasarkan asumsi volume, durasi, dan kapasitas tahunan. Verifikasi periode pencatatan, pembagian pekerjaan, dan durasi aktual sebelum menarik kesimpulan.';

    public const OVERSIGHT = 'Routine human approval: persetujuan setiap transaksi. Exception review: manusia menangani kasus di luar kriteria. Human decision required: keputusan final oleh manusia berwenang. Label AI tidak merinci seluruh jenis kontrol; konfirmasi peran dan pemicu bersama pemilik proses.';

    public static function oversight(bool $required): string
    {
        return $required
            ? 'Kontrol manusia diwajibkan oleh label AI. Lihat catatan untuk persetujuan rutin, review pengecualian, atau kewenangan keputusan final.'
            : 'Kontrol manusia tidak diwajibkan oleh label AI; bukan jaminan tanpa manusia. Review pengecualian tetap mengikuti rekomendasi; konfirmasi pemicu dan penanggung jawab dengan pemilik proses.';
    }
}

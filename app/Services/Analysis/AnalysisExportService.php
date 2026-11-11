<?php

namespace App\Services\Analysis;

use Dompdf\Dompdf;
use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AnalysisExportService
{
    public function download(array $report, string $format)
    {
        // Round only the presentation copy, after all aggregates have been computed.
        array_walk_recursive($report, function (&$value) {
            if (is_float($value)) {
                $value = round($value, 6);
            }
        });
        if ($format === 'json') {
            return response(json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 200, ['Content-Type' => 'application/json; charset=utf-8', 'Content-Disposition' => 'attachment; filename="results.json"', 'Cache-Control' => 'private, no-store']);
        }
        if ($format === 'pdf') {
            $pdf = new Dompdf(['isRemoteEnabled' => false, 'isPhpEnabled' => false, 'isJavascriptEnabled' => false]);
            $pdf->loadHtml(view('reports.analysis', ['report' => $report])->render());
            $pdf->setPaper('a4');
            $pdf->render();

            return response($pdf->output(), 200, ['Content-Type' => 'application/pdf', 'Content-Disposition' => 'attachment; filename="FTEMation-analysis-'.$report['run_id'].'.pdf"', 'Cache-Control' => 'private, no-store']);
        }

        return response()->streamDownload(function () use ($report) {
            $book = new Spreadsheet;
            $book->removeSheetByIndex(0);
            $this->overview($book->createSheet()->setTitle('Overview'), $report);
            foreach (['Employees' => $report['employees'], 'Departments' => $report['departments'], 'Groups' => $report['groups'], 'Activities' => $report['activities'], 'Assumptions' => [$report['calculation']]] as $name => $rows) {
                $sheet = $book->createSheet()->setTitle($name);
                if (! $rows) {
                    continue;
                }
                $headers = array_keys($rows[0]);
                foreach ($headers as $col => $header) {
                    $sheet->setCellValue([$col + 1, 1], $header);
                }
                foreach ($rows as $i => $row) {
                    foreach ($headers as $col => $key) {
                        $value = $row[$key] ?? '';
                        if (is_array($value)) {
                            $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
                        }
                        if (is_bool($value)) {
                            $value = $value ? 'Yes' : 'No';
                        }
                        $numeric = is_int($value) || is_float($value);
                        $sheet->setCellValueExplicit([$col + 1, $i + 2], $value, $numeric ? DataType::TYPE_NUMERIC : DataType::TYPE_STRING);
                        if ($numeric) {
                            $sheet->getStyle([$col + 1, $i + 2])->getNumberFormat()->setFormatCode(str_contains($key, 'fte') ? '#,##0.000000' : (str_contains($key, 'score') ? '0.00' : '#,##0.######'));
                        }
                    }
                }
                $sheet->getStyle('1:1')->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
                $sheet->getStyle('1:1')->getFill()->setFillType('solid')->getStartColor()->setARGB('FF0B2347');
                $sheet->freezePane('A2');
                $sheet->setAutoFilter($sheet->calculateWorksheetDimension());
                foreach ($headers as $col => $header) {
                    $sheet->getColumnDimensionByColumn($col + 1)->setWidth(in_array($header, ['reason', 'recommendation', 'summary', 'opportunities']) ? 65 : 24);
                }
                $sheet->getStyle($sheet->calculateWorksheetDimension())->getAlignment()->setWrapText(true)->setVertical('top');
            }
            $book->setActiveSheetIndex(0);
            (new Xlsx($book))->save('php://output');
            $book->disconnectWorksheets();
        }, 'FTEMation-analysis-'.$report['run_id'].'.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Cache-Control' => 'private, no-store']);
    }

    private function overview(Worksheet $sheet, array $report): void
    {
        $sheet->setShowGridlines(false);
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Calibri')->setSize(11);
        foreach (['A' => 12, 'B' => 14, 'C' => 18, 'D' => 20, 'E' => 16, 'F' => 14] as $column => $width) {
            $sheet->getColumnDimension($column)->setWidth($width);
        }
        $sheet->getStyle('A1:F38')->getAlignment()->setVertical('center')->setWrapText(true);
        $sheet->getStyle('A1:F38')->getFont()->getColor()->setARGB('FF21324B');
        $sheet->getDefaultRowDimension()->setRowHeight(25);
        $text = function (string $range, mixed $value) use ($sheet) {
            if (str_contains($range, ':')) {
                $sheet->mergeCells($range);
            }
            $sheet->setCellValueExplicit(explode(':', $range)[0], (string) $value, DataType::TYPE_STRING);
        };
        $section = function (int $row, string $title) use ($sheet, $text) {
            $text("A{$row}:F{$row}", $title);
            $sheet->getStyle("A{$row}:F{$row}")->applyFromArray(['font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']], 'fill' => ['fillType' => 'solid', 'startColor' => ['argb' => 'FF0B2347']]]);
        };
        $section(1, 'FTEMation | Hasil analisis workload');
        $sheet->getRowDimension(1)->setRowHeight(38);
        $sheet->getStyle('A1')->getFont()->setSize(20);
        foreach ([3 => ['Analysis Run ID', $report['run_id']], 4 => ['Model AI', $report['actual_model'] ?? $report['model'] ?? 'Tidak tersedia'], 5 => ['Prompt aktivitas', $report['prompt_version'] ?? 'Tidak tersedia'], 6 => ['Tanggal analisis (Asia/Jakarta)', isset($report['completed_at']) ? Carbon::parse($report['completed_at'])->timezone('Asia/Jakarta')->format('d M Y H:i') : 'Tidak tersedia']] as $row => [$label, $value]) {
            $text("A{$row}:C{$row}", $label);
            $text("D{$row}:F{$row}", $value);
        }
        $section(8, 'Ringkasan kapasitas waktu');
        foreach ([10 => ['Total aktivitas', 'activities_count', 'aktivitas'], 11 => ['Total karyawan', 'employees_count', 'karyawan'], 12 => ['Total departemen', 'departments_count', 'departemen'], 14 => ['Total workload', 'total_fte', 'FTE'], 15 => ['Estimated saving', 'estimated_fte_saving', 'FTE'], 16 => ['Remaining workload', 'remaining_fte', 'FTE'], 18 => ['Kontrol manusia diwajibkan oleh label AI', 'oversight_count', 'aktivitas']] as $row => [$label, $key, $unit]) {
            $text("A{$row}:C{$row}", $label);
            $sheet->mergeCells("D{$row}:E{$row}");
            $value = $report['totals'][$key] ?? null;
            $sheet->setCellValueExplicit("D{$row}", $value ?? 'Tidak tersedia', $value === null ? DataType::TYPE_STRING : DataType::TYPE_NUMERIC);
            $sheet->getStyle("D{$row}")->getNumberFormat()->setFormatCode($unit === 'FTE' ? '#,##0.000000' : '#,##0');
            $text("F{$row}", $unit);
            $sheet->getStyle("A{$row}:F{$row}")->getBorders()->getBottom()->setBorderStyle('hair')->getColor()->setARGB('FFDCE4ED');
        }
        $sheet->getRowDimension(18)->setRowHeight(34);
        $sheet->getStyle('A14:F16')->getFill()->setFillType('solid')->getStartColor()->setARGB('FFE8F7FC');
        $sheet->getStyle('D14:E16')->getFont()->setBold(true)->setSize(16);
        $section(20, 'Distribusi peluang otomatisasi');
        $text('A21:C21', 'Level');
        $text('D21', 'Aktivitas');
        $text('E21:F21', 'Proporsi');
        foreach (['high', 'medium', 'low'] as $i => $level) {
            $row = 22 + $i;
            $text("A{$row}:C{$row}", ucfirst($level));
            $count = $report['totals']['levels'][$level] ?? 0;
            $sheet->setCellValueExplicit("D{$row}", $count, DataType::TYPE_NUMERIC);
            $sheet->mergeCells("E{$row}:F{$row}");
            $sheet->setCellValueExplicit("E{$row}", ($report['totals']['activities_count'] ?? 0) > 0 ? $count / $report['totals']['activities_count'] : 0, DataType::TYPE_NUMERIC);
            $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode('0.0%');
        }
        $section(26, 'Interpretasi dan kontrol');
        $text('A27:F28', 'Saving merupakan estimasi kapasitas waktu, belum terbukti secara operasional dan bukan pengurangan karyawan yang telah terealisasi.');
        $text('A30:F32', ReportGuidance::OVERSIGHT.' Nilai false bukan jaminan tanpa manusia; lihat recommendation dan oversight_note di Activities.');
        $aboveCapacity = collect($report['employees'])->where('total_fte', '>', 1)->count();
        $text('A34:F36', $aboveCapacity > 0 ? $aboveCapacity.' karyawan memiliki aktivitas tercatat di atas satu FTE. '.ReportGuidance::WORKLOAD : 'FTE menggambarkan kapasitas waktu dari aktivitas yang dicatat. Verifikasi kelengkapan aktivitas dan asumsi bersama pemilik proses sebelum menarik kesimpulan tentang kapasitas individu.');
        $text('A38:F38', 'Detail: Employees, Departments, Groups, Activities. Metode: Assumptions. Angka memakai snapshot run terpilih.');
        $sheet->getRowDimension(38)->setRowHeight(34);
        $sheet->freezePane('D9');
        $sheet->getPageSetup()->setPrintArea('A1:F38')->setFitToWidth(1)->setFitToHeight(1);
    }
}

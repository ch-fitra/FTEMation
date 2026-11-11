<?php

namespace App\Services\Analysis;

use Dompdf\Dompdf;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
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
            foreach (['Overview' => [$report['totals']], 'Employees' => $report['employees'], 'Departments' => $report['departments'], 'Groups' => $report['groups'], 'Activities' => $report['activities'], 'Assumptions' => [$report['calculation']]] as $name => $rows) {
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
            (new Xlsx($book))->save('php://output');
            $book->disconnectWorksheets();
        }, 'FTEMation-analysis-'.$report['run_id'].'.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Cache-Control' => 'private, no-store']);
    }
}

<?php

namespace App\Console\Commands;

use App\Models\AnalysisRun;
use App\Services\Analysis\AnalysisExportService;
use App\Services\Analysis\AnalysisReportService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportAnalysis extends Command
{
    protected $signature = 'workload:export {run : ID analisis lengkap}';

    protected $description = 'Simpan export JSON, Excel dan PDF di storage privat';

    public function handle(AnalysisReportService $reports, AnalysisExportService $exports): int
    {
        $run = AnalysisRun::findOrFail($this->argument('run'));
        $reports->assertComplete($run);
        $report = $reports->build($run);
        $folder = storage_path('app/private/exports/run-'.$run->id);
        File::ensureDirectoryExists($folder);
        foreach (['json', 'xlsx', 'pdf'] as $format) {
            $response = $exports->download($report, $format);
            if ($response instanceof StreamedResponse) {
                ob_start();
                $response->sendContent();
                $content = ob_get_clean();
            } else {
                $content = $response->getContent();
            }
            File::put($folder.'/'.($format === 'json' ? 'results.json' : 'FTEMation.'.$format), $content);
        }
        $this->info(json_encode(['run' => $run->id, 'status' => $run->status, 'requests' => $run->requests_count, 'input_tokens' => $run->input_tokens, 'output_tokens' => $run->output_tokens, 'actual_model' => $run->actual_model, 'totals' => $report['totals'], 'employees' => count($report['employees']), 'departments' => count($report['departments']), 'groups' => count($report['groups']), 'folder' => $folder], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return self::SUCCESS;
    }
}

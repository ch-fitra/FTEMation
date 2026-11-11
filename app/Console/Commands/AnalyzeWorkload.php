<?php

namespace App\Console\Commands;

use App\Models\WorkloadImport;
use App\Services\Analysis\AnalysisRunService;
use Illuminate\Console\Command;

class AnalyzeWorkload extends Command
{
    protected $signature = 'workload:analyze {import : ID dataset yang sudah diimpor}';

    protected $description = 'Antrekan analisis DeepSeek untuk dataset lokal';

    public function handle(AnalysisRunService $service): int
    {
        $import = WorkloadImport::findOrFail($this->argument('import'));
        $run = $service->start($import);
        $this->info('Analisis #'.$run->id.' berstatus '.$run->status.'. Jalankan worker queue analysis.');

        return self::SUCCESS;
    }
}

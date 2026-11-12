<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class WorkAnalysisQueue extends Command
{
    protected $signature = 'workload:work {--allow-paid : Explicitly authorize processing queued AI requests}';

    protected $description = 'Start the analysis worker with validated timeout settings and explicit cost authorization';

    public function handle(): int
    {
        if (! $this->option('allow-paid')) {
            $this->error('Worker belum dijalankan. Memproses antrean dapat memakai saldo DeepSeek. Gunakan --allow-paid hanya setelah mendapat izin biaya.');

            return self::FAILURE;
        }
        if ((int) config('queue.connections.database.retry_after') <= 400 || config('cache.default') === 'array') {
            $this->error('Worker belum dijalankan. Diperlukan retry_after > 400 dan shared cache untuk lock.');

            return self::FAILURE;
        }
        if (blank(config('ftemation.ai.api_key'))) {
            $this->error('Worker belum dijalankan. Konfigurasi API key belum tersedia.');

            return self::FAILURE;
        }
        if (! extension_loaded('pcntl')) {
            $this->warn('PCNTL tidak tersedia: timeout HTTP tetap berlaku, tetapi timeout proses keras memerlukan Linux/PCNTL.');
        }

        return $this->call('queue:work', ['connection' => 'database', '--queue' => 'analysis', '--timeout' => 360, '--tries' => 40, '--sleep' => 2]);
    }
}

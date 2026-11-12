<?php

namespace App\Services\Analysis;

use App\Models\AnalysisRun;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use JsonException;

class DeepSeekClient
{
    public function json(AnalysisRun $run, string $prompt, array $input, callable $validate): array
    {
        if (blank(config('ftemation.ai.api_key'))) {
            throw new AnalysisException('DEEPSEEK_API_KEY belum diisi. Isi .env lalu jalankan php artisan config:clear.', false);
        }
        $snapshot = $run->config_snapshot;
        $last = new AnalysisException('AI belum menghasilkan respons valid.');
        for ($attempt = 1; $attempt <= config('ftemation.ai.attempts'); $attempt++) {
            app(AnalysisCancellation::class)->admitRequest($run);
            try {
                $verify = config('ftemation.ai.ca_bundle') ?: true;
                if (is_string($verify) && ! str_starts_with($verify, '/') && ! preg_match('/^[A-Za-z]:/', $verify)) {
                    $verify = base_path($verify);
                }
                if (is_string($verify) && ! is_file($verify)) {
                    throw new AnalysisException('File DEEPSEEK_CA_BUNDLE tidak ditemukan. Perbaiki path sertifikat TLS di .env.', false);
                }
                $response = Http::acceptJson()->asJson()->withToken(config('ftemation.ai.api_key'))
                    ->withOptions(['verify' => $verify])->connectTimeout(15)->timeout(config('ftemation.ai.timeout'))
                    ->post(rtrim($snapshot['provider_url'], '/').'/chat/completions', [
                        'model' => $run->model_name,
                        'thinking' => ['type' => 'disabled'],
                        'temperature' => 0,
                        'max_tokens' => $snapshot['max_tokens'],
                        'response_format' => ['type' => 'json_object'],
                        'messages' => [
                            ['role' => 'system', 'content' => $prompt],
                            ['role' => 'user', 'content' => json_encode($input, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)],
                        ],
                    ]);
                if (! $response->successful()) {
                    $status = $response->status();
                    $message = match ($status) {
                        401, 403 => 'Akses DeepSeek ditolak. Periksa API key dan izin akun.',
                        402 => 'Saldo DeepSeek tidak mencukupi. Isi saldo lalu retry run ini.',
                        429 => 'Batas permintaan DeepSeek tercapai. Tunggu sebelum retry.',
                        400, 404, 422 => 'Konfigurasi endpoint/model atau payload DeepSeek ditolak. Periksa model dan dokumentasi API.',
                        default => 'Layanan DeepSeek tidak tersedia sementara (HTTP '.$status.').',
                    };
                    throw new AnalysisException($message, $status === 429 || $status >= 500);
                }
                $envelope = $response->json();
                $run->increment('input_tokens', max(0, (int) data_get($envelope, 'usage.prompt_tokens', 0)));
                $run->increment('output_tokens', max(0, (int) data_get($envelope, 'usage.completion_tokens', 0)));
                $actual = data_get($envelope, 'model');
                if (is_string($actual)) {
                    $run->forceFill(['actual_model' => mb_substr($actual, 0, 255)])->save();
                }
                $content = data_get($envelope, 'choices.0.message.content');
                if (data_get($envelope, 'choices.0.finish_reason') !== 'stop' || ! is_string($content) || trim($content) === '') {
                    throw new AnalysisException('Respons AI kosong atau terpotong. Retry atau sesuaikan batch/max_tokens.');
                }
                $data = json_decode($content, true, 64, JSON_THROW_ON_ERROR);
                if (! is_array($data)) {
                    throw new AnalysisException('Respons AI harus berupa JSON object.');
                }

                return $validate($data);
            } catch (ConnectionException $e) {
                if (str_contains($e->getMessage(), 'cURL error 60')) {
                    throw new AnalysisException('Sertifikat TLS PHP belum tersedia. Isi DEEPSEEK_CA_BUNDLE dengan CA bundle tepercaya; jangan matikan verifikasi TLS.', false);
                }
                $last = new AnalysisException('Koneksi DeepSeek gagal atau timeout. Periksa jaringan lalu retry.');
            } catch (JsonException) {
                $last = new AnalysisException('DeepSeek mengembalikan JSON yang tidak valid.');
            } catch (AnalysisException $e) {
                if (! $e->retryable) {
                    throw $e;
                }
                $last = $e;
            }
            if ($attempt < config('ftemation.ai.attempts')) {
                usleep((int) config('ftemation.ai.retry_delay_ms') * $attempt * 1000);
            }
        }
        throw $last;
    }
}

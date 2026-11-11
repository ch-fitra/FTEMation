<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::command('ftemation:check-database', function () {
    if (config('database.default') !== 'mysql' || config('database.connections.mysql.database') !== 'ftemation') {
        $this->error('DB_CONNECTION harus mysql dan DB_DATABASE harus ftemation. Tidak ada perubahan dilakukan.');

        return 1;
    }
    try {
        $server = DB::selectOne('SELECT DATABASE() AS database_name, VERSION() AS server_version');
        if ($server->database_name !== 'ftemation') {
            $this->error('Database aktif bukan ftemation. Hentikan migration.');

            return 1;
        }
        $this->info('Koneksi berhasil: '.$server->database_name.'; server '.$server->server_version);

        return 0;
    } catch (Throwable $e) {
        $this->error('Koneksi gagal. Periksa MySQL di XAMPP, DB_HOST, DB_PORT, DB_USERNAME dan DB_PASSWORD di .env.');

        return 1;
    }
})->purpose('Verify the existing ftemation database without creating or changing a database');

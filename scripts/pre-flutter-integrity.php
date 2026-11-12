<?php

// Read-only metadata audit: no credentials, provider calls, jobs or data updates.
use App\Models\AnalysisRun;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$checks = [
    'orphan_import_owners' => DB::table('imports as i')->leftJoin('users as u', 'u.id', '=', 'i.user_id')->whereNull('u.id')->count(),
    'activity_employee_dataset_mismatch' => DB::table('activities as a')->join('employees as e', 'e.id', '=', 'a.employee_id')->whereColumn('a.import_id', '!=', 'e.import_id')->count(),
    'analysis_activity_dataset_mismatch' => DB::table('activity_analyses as a')->join('analysis_runs as r', 'r.id', '=', 'a.analysis_run_id')->join('activities as w', 'w.id', '=', 'a.activity_id')->whereColumn('r.import_id', '!=', 'w.import_id')->count(),
    'missing_private_uploads' => DB::table('imports')->where('status', 'imported')->get()->filter(fn ($i) => ! $i->file_path || ! Storage::disk('local')->exists($i->file_path))->count(),
];
$passwords = DB::table('users')->pluck('password');
$demo = User::where('username', config('ftemation.demo_username'))->first();
$output = [
    'integrity_violations' => $checks,
    'password_storage' => ['accounts' => $passwords->count(), 'legacy_plaintext' => $passwords->filter(fn ($p) => password_get_info($p)['algoName'] === 'unknown')->count()],
    'configured_demo' => ['username_exists' => (bool) $demo, 'credentials_match' => $demo && app('auth')->createUserProvider('users')->validateCredentials($demo, ['password' => config('ftemation.demo_password')])],
    'environment' => [
        'app_env' => config('app.env'), 'debug' => config('app.debug'),
        'database_driver' => DB::connection()->getDriverName(), 'database_version' => DB::selectOne('select version() as v')->v,
        'session_http_only' => config('session.http_only'), 'session_secure' => config('session.secure'), 'session_same_site' => config('session.same_site'),
        'private_disk_root_is_private' => config('filesystems.disks.local.root') === storage_path('app/private'),
        'personal_access_tokens_table' => DB::getSchemaBuilder()->hasTable('personal_access_tokens'),
    ],
    'runs' => AnalysisRun::orderBy('id')->get()->map(fn ($r) => [
        'id' => $r->id, 'status' => $r->status, 'execution_version' => $r->execution_version,
        'activities' => $r->import->activities()->count(), 'results' => $r->analyses()->count(),
        'success' => $r->analyses()->where('status', 'success')->count(), 'requests' => $r->requests_count,
    ])->all(),
];
echo json_encode($output, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;

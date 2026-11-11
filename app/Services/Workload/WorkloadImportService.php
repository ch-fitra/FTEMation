<?php

namespace App\Services\Workload;

use App\Models\User;
use App\Models\WorkloadImport;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class WorkloadImportService
{
    public function __construct(private WorkloadWorkbookReader $reader, private FteCalculator $calculator) {}

    public function import(UploadedFile $file, User $user): WorkloadImport
    {
        $path = $file->store('imports', 'local');
        if (! $path) {
            abort(503, 'File tidak dapat disimpan. Periksa izin storage/app/private.');
        }
        try {
            $import = WorkloadImport::create([
                'user_id' => $user->id,
                'filename' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
                'file_path' => $path,
                'status' => 'pending',
            ]);
        } catch (Throwable $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        }
        try {
            $data = $this->reader->read(Storage::disk('local')->path($path));

            return DB::transaction(function () use ($data, $import) {
                $employees = [];
                foreach ($data['rows'] as $row) {
                    $employee = $employees[$row['employee_id']] ??= $import->employees()->create([
                        'employee_code' => $row['employee_id'], 'name' => $row['employee_name'], 'department' => $row['department'],
                    ]);
                    $import->activities()->create([
                        'employee_id' => $employee->id,
                        'activity_code' => $row['activity_id'],
                        'activity_name' => $row['activity_name'],
                        'description' => $row['description'],
                        'frequency' => $row['frequency'],
                        'volume' => $row['volume'],
                        'duration_minutes' => $row['duration_minutes'],
                        'fte' => $this->calculator->calculate((float) $row['volume'], (float) $row['duration_minutes'], $row['frequency']),
                    ]);
                }
                $import->update(['status' => 'imported', 'warnings' => $data['warnings']]);

                return $import->fresh();
            });
        } catch (ValidationException $e) {
            $import->update(['status' => 'failed', 'validation_errors' => $e->errors()]);
            throw $e;
        } catch (Throwable $e) {
            $import->update(['status' => 'failed', 'validation_errors' => ['file' => ['Penyimpanan gagal. Tidak ada aktivitas/karyawan dari import ini yang tersimpan.']]]);
            report($e);
            abort(503, 'Import gagal disimpan. Periksa koneksi database dan log Laravel, lalu coba lagi.');
        }
    }
}

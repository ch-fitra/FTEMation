<?php

namespace App\Services\Workload;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx;
use Throwable;
use ZipArchive;

class WorkloadWorkbookReader
{
    public const HEADERS = ['activity_id', 'employee_id', 'employee_name', 'department', 'activity_name', 'description', 'frequency', 'volume', 'duration_minutes'];

    /** @return array{rows: array, warnings: array} */
    public function read(string $path): array
    {
        $this->checkArchive($path);
        $reader = new Xlsx;
        $workbook = null;
        try {
            if ($reader->listWorksheetNames($path) !== ['Workload']) {
                throw ValidationException::withMessages(['file' => ['Workbook harus berisi tepat satu sheet bernama Workload. File evaluasi bukan dataset input.']]);
            }
            $info = $reader->listWorksheetInfo($path)[0];
            if ($info['totalRows'] > config('ftemation.max_import_rows') + 1 || $info['totalColumns'] > 9) {
                throw ValidationException::withMessages(['file' => ['Workbook melebihi 10.000 baris data atau sembilan kolom. Hapus baris/kolom tambahan.']]);
            }
            // Keep formulas visible. Never calculate uploaded expressions or trust their cached values.
            $reader->setReadEmptyCells(false);
            $workbook = $reader->load($path);
            $sheet = $workbook->getSheetByName('Workload');
            $headers = array_map(fn ($v) => is_string($v) ? trim($v) : $v, $sheet->rangeToArray('A1:I1', null, false, false)[0]);
            if ($headers !== self::HEADERS) {
                throw ValidationException::withMessages(['header' => ['Baris 1 harus berisi tepat sembilan kolom, berurutan: '.implode(', ', self::HEADERS).'.']]);
            }

            $rows = $errors = $seen = $employees = $departments = [];
            for ($rowNumber = 2; $rowNumber <= $info['totalRows']; $rowNumber++) {
                $values = $sheet->rangeToArray("A$rowNumber:I$rowNumber", null, false, false)[0];
                if (count(array_filter($values, fn ($v) => $v !== null && $v !== '')) === 0) {
                    continue;
                }
                $row = array_combine(self::HEADERS, $values);
                foreach (self::HEADERS as $i => $field) {
                    if ($sheet->getCell([$i + 1, $rowNumber])->getDataType() === DataType::TYPE_FORMULA) {
                        $errors["rows.$rowNumber.$field"][] = "Baris $rowNumber: formula tidak diizinkan; gunakan nilai asli.";
                    }
                    if (is_string($row[$field])) {
                        $row[$field] = trim($row[$field]);
                    }
                }
                foreach (['employee_name', 'department'] as $field) {
                    if (is_string($row[$field])) {
                        $row[$field] = preg_replace('/\s+/u', ' ', $row[$field]);
                    }
                }
                if (is_string($row['frequency'])) {
                    $row['frequency'] = strtolower($row['frequency']);
                }
                $validator = Validator::make($row, [
                    'activity_id' => ['required', 'string', 'max:100', 'regex:/^[\pL\pN][\pL\pN_.-]*$/u'],
                    'employee_id' => ['required', 'string', 'max:100', 'regex:/^[\pL\pN][\pL\pN_.-]*$/u'],
                    'employee_name' => ['required', 'string', 'max:255'],
                    'department' => ['required', 'string', 'max:255'],
                    'activity_name' => ['required', 'string', 'max:255'],
                    'description' => ['required', 'string', 'max:10000'],
                    'frequency' => ['required', 'in:daily,weekly,monthly'],
                    'volume' => ['required', 'numeric', 'gt:0', 'max:999999999', 'decimal:0,6'],
                    'duration_minutes' => ['required', 'numeric', 'gt:0', 'max:999999999', 'decimal:0,6'],
                ]);
                if ($validator->fails()) {
                    foreach ($validator->errors()->messages() as $field => $messages) {
                        $errors["rows.$rowNumber.$field"] = array_map(fn ($m) => "Baris $rowNumber ($field): $m", $messages);
                    }

                    continue;
                }
                // Mirror MySQL's case-insensitive uniqueness and normalize department spelling.
                $activityKey = mb_strtolower($row['activity_id']);
                $employeeKey = mb_strtolower($row['employee_id']);
                $deptKey = mb_strtolower($row['department']);
                $row['department'] = $departments[$deptKey] ??= $row['department'];
                if (isset($seen[$activityKey])) {
                    $errors["rows.$rowNumber.activity_id"][] = "Baris $rowNumber: activity_id duplikat dengan baris {$seen[$activityKey]}.";
                }
                $seen[$activityKey] = $rowNumber;
                if (isset($employees[$employeeKey])) {
                    $employee = $employees[$employeeKey];
                    if ($employee['name'] !== $row['employee_name'] || $employee['department'] !== $row['department']) {
                        $errors["rows.$rowNumber.employee_id"][] = "Baris $rowNumber: nama/departemen employee_id tidak konsisten dengan baris {$employee['row']}.";
                    }
                    $row['employee_id'] = $employee['code'];
                } else {
                    $employees[$employeeKey] = ['code' => $row['employee_id'], 'name' => $row['employee_name'], 'department' => $row['department'], 'row' => $rowNumber];
                }
                $rows[] = $row;
            }
            if ($rows === [] && $errors === []) {
                $errors['file'] = ['Sheet Workload tidak memiliki baris aktivitas.'];
            }
            if ($errors !== []) {
                throw ValidationException::withMessages($errors);
            }
            $warnings = [];
            if (count($rows) < 50 || count($employees) < 10 || count($departments) < 3) {
                $warnings[] = 'Dataset valid, tetapi belum memenuhi minimum assessment: 50 aktivitas, 10 karyawan, dan 3 departemen.';
            }

            return compact('rows', 'warnings');
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            report($e);
            throw ValidationException::withMessages(['file' => ['Workbook tidak dapat dibaca. Simpan ulang sebagai .xlsx tanpa password lalu unggah kembali.']]);
        } finally {
            $workbook?->disconnectWorksheets();
        }
    }

    private function checkArchive(string $path): void
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            throw ValidationException::withMessages(['file' => ['File bukan workbook .xlsx yang valid.']]);
        }
        try {
            $bytes = 0;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $bytes += $zip->statIndex($i)['size'];
                if ($bytes > config('ftemation.max_uncompressed_bytes')) {
                    throw ValidationException::withMessages(['file' => ['Isi workbook setelah dekompresi melebihi 50 MB. Kurangi data atau format berlebih.']]);
                }
            }
        } finally {
            $zip->close();
        }
    }
}

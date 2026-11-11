<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportWorkloadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return ['file' => ['required', 'file', 'extensions:xlsx', 'mimes:xlsx', 'max:5120']];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Pilih workbook Excel yang akan diimpor.',
            'file.mimes' => 'File harus workbook .xlsx asli.',
            'file.extensions' => 'Ekstensi file harus .xlsx.',
            'file.max' => 'Ukuran workbook maksimal 5 MB.',
        ];
    }
}

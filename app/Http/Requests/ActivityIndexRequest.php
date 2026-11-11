<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ActivityIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'frequency' => ['nullable', Rule::in(['daily', 'weekly', 'monthly'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}

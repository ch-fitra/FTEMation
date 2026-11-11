<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('filename');
            $table->string('file_path')->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->json('validation_errors')->nullable();
            $table->json('warnings')->nullable();
            $table->timestamps();
        });
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_id')->constrained()->cascadeOnDelete();
            $table->string('employee_code', 100);
            $table->string('name');
            $table->string('department');
            $table->string('job_title')->nullable();
            $table->timestamps();
            $table->unique(['import_id', 'employee_code']);
            $table->index(['import_id', 'department']);
        });
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('activity_code', 100);
            $table->string('activity_name');
            $table->text('description');
            $table->string('frequency', 10);
            $table->decimal('volume', 16, 6);
            $table->decimal('duration_minutes', 16, 6);
            $table->decimal('fte', 30, 12);
            $table->timestamps();
            $table->unique(['import_id', 'activity_code']);
        });
        Schema::create('analysis_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_id')->constrained()->cascadeOnDelete();
            $table->string('model_name');
            $table->string('prompt_version');
            $table->json('config_snapshot');
            $table->json('summary_json')->nullable();
            $table->string('status', 20)->default('queued')->index();
            $table->unsignedInteger('input_tokens')->nullable();
            $table->unsignedInteger('output_tokens')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
        Schema::create('activity_groups', function (Blueprint $table) {
            $table->id();
            $table->string('code', 100)->unique();
            $table->string('name');
            $table->text('description');
            $table->timestamps();
        });
        Schema::create('activity_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('analysis_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('activity_id')->constrained()->cascadeOnDelete();
            $table->foreignId('activity_group_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('automation_level', 10)->nullable();
            $table->text('reason')->nullable();
            $table->text('recommendation')->nullable();
            $table->json('factors')->nullable();
            $table->string('risk_level', 10)->nullable();
            $table->string('effort_level', 10)->nullable();
            $table->boolean('oversight_required')->nullable();
            $table->text('oversight_note')->nullable();
            $table->decimal('estimated_fte_saving', 30, 12)->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->string('cache_key', 64)->nullable()->index();
            $table->text('error_message')->nullable();
            $table->timestamps();
            $table->unique(['analysis_run_id', 'activity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_analyses');
        Schema::dropIfExists('activity_groups');
        Schema::dropIfExists('analysis_runs');
        Schema::dropIfExists('activities');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('imports');
    }
};

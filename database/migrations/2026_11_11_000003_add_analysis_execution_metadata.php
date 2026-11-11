<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('analysis_runs', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('heartbeat_at')->nullable();
            $table->string('summary_status', 20)->default('pending');
            $table->string('actual_model')->nullable();
            $table->unsignedInteger('requests_count')->default(0);
        });
        Schema::table('activity_analyses', function (Blueprint $table) {
            $table->string('automation_scope', 30)->nullable();
            $table->decimal('priority_score', 9, 4)->nullable();
            $table->unsignedInteger('attempts')->default(0);
            $table->boolean('cache_hit')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('activity_analyses', fn (Blueprint $table) => $table->dropColumn(['automation_scope', 'priority_score', 'attempts', 'cache_hit']));
        Schema::table('analysis_runs', fn (Blueprint $table) => $table->dropColumn(['started_at', 'completed_at', 'heartbeat_at', 'summary_status', 'actual_model', 'requests_count']));
    }
};

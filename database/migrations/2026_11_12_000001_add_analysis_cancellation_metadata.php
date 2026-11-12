<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('analysis_runs', function (Blueprint $table) {
            $table->unsignedInteger('execution_version')->default(0);
            $table->timestamp('cancellation_requested_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('resumed_at')->nullable();
            $table->json('lifecycle_events')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('analysis_runs', fn (Blueprint $table) => $table->dropColumn(['execution_version', 'cancellation_requested_at', 'cancelled_at', 'resumed_at', 'lifecycle_events']));
    }
};

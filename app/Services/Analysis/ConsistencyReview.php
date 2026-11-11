<?php

namespace App\Services\Analysis;

class ConsistencyReview
{
    /** Advisory candidates only: a shared mechanism does not establish semantic equivalence. */
    public function candidates(array $rows): array
    {
        return collect($rows)->groupBy('group_id')->filter(fn ($items) => $items->pluck('automation_level')->unique()->count() > 1)
            ->map(fn ($items, $group) => [
                'group_id' => $group,
                'status' => 'needs_review',
                'message' => 'Level berbeda pada mekanisme sekelompok. Bandingkan langkah, exception, judgment dan risiko; perbedaan dapat valid. Ini kandidat review, bukan bukti inkonsistensi.',
                'activities' => $items->map(fn ($row) => array_intersect_key($row, array_flip(['activity_id', 'activity_name', 'department', 'automation_level', 'reason', 'factors'])))->values()->all(),
            ])->values()->all();
    }
}

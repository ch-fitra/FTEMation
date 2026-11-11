<?php

namespace Database\Seeders;

use App\Models\ActivityGroup;
use Illuminate\Database\Seeder;

class ActivityGroupSeeder extends Seeder
{
    public function run(): void
    {
        $groups = json_decode(file_get_contents(database_path('data/group_taxonomy.json')), true, flags: JSON_THROW_ON_ERROR);
        foreach ($groups as $group) {
            ActivityGroup::updateOrCreate(['code' => $group['code']], $group);
        }
    }
}

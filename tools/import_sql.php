<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();


$arg = $argv[1] ?? null;
$countTable = $argv[2] ?? 'skills';
if (!is_string($arg) || trim($arg) === '') {
    fwrite(STDERR, "Usage: php tools/import_sql.php <sql-file> [count-table]\n");
    fwrite(STDERR, "Example (skills): php tools/import_sql.php python_scripts/sql/ingest_skills_pages_31_37.sql skills\n");
    fwrite(STDERR, "Example (job titles): php tools/import_sql.php python_scripts/sql/ingest_job_titles.sql job_occupations\n");
    exit(1);
}

if (!is_string($countTable) || trim($countTable) === '') {
    $countTable = 'skills';
}

$input = trim($arg);

// Accept absolute paths or workspace-relative paths.
$isWindowsAbs = (bool) preg_match('/^[A-Za-z]:\\\\/', $input);
$isUnixAbs = str_starts_with($input, '/');

$path = ($isWindowsAbs || $isUnixAbs) ? $input : base_path($input);

if (!is_file($path)) {
    fwrite(STDERR, "SQL file not found: {$path}\n");
    exit(1);
}

$sql = file_get_contents($path);
if ($sql === false || trim($sql) === '') {
    fwrite(STDERR, "SQL file is empty or unreadable: {$path}\n");
    exit(1);
}

$before = 0;
if (Schema::hasTable($countTable)) {
    $before = DB::table($countTable)->count();
}
DB::unprepared($sql);
$after = 0;
if (Schema::hasTable($countTable)) {
    $after = DB::table($countTable)->count();
}

fwrite(STDOUT, "Imported SQL: {$path}\n");
fwrite(STDOUT, "Table:         {$countTable}\n");
fwrite(STDOUT, "Rows before:   {$before}\n");
fwrite(STDOUT, "Rows after:    {$after}\n");
fwrite(STDOUT, "Inserted:      " . ($after - $before) . "\n");

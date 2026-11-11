<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Keep front-controller metadata consistent when PHP's development server
// resolves a nested index file. Routing must receive the full request URI.
if (PHP_SAPI === 'cli-server') {
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['SCRIPT_FILENAME'] = __FILE__;
    $_SERVER['PHP_SELF'] = '/index.php';
    unset($_SERVER['PATH_INFO']);
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());

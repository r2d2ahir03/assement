<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected $commands = [
        // Register the command
        \App\Console\Commands\ScrapeBeyondChats::class,
    ];

    protected function schedule(Schedule $schedule)
    {
        // $schedule->command('scrape:beyondchats')->daily();
    }

    protected function commands()
    {
        // require base_path('routes/console.php');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'body',
        'source_url',
        'published_at',
        'scraped_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'scraped_at' => 'datetime',
    ];
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ArticleController extends Controller
{
    public function index()
    {
        return Article::orderBy('published_at', 'desc')->paginate(15);
    }

    public function show(Article $article)
    {
        return $article;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required',
            'excerpt' => 'nullable|string',
            'published_at' => 'nullable|date',
            'source_url' => 'nullable|url',
        ]);

        $data['slug'] = Str::slug($data['title']);
        $data['scraped_at'] = now();

        $article = Article::create($data);

        return response()->json($article, 201);
    }

    public function update(Request $request, Article $article)
    {
        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'body' => 'sometimes|required',
            'excerpt' => 'nullable|string',
            'published_at' => 'nullable|date',
            'source_url' => 'nullable|url',
        ]);

        if (isset($data['title'])) {
            $data['slug'] = Str::slug($data['title']);
        }

        $article->update($data);

        return response()->json($article);
    }

    public function destroy(Article $article)
    {
        $article->delete();

        return response()->json(null, 204); 
    }
}

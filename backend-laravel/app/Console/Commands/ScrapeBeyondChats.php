<?php

namespace App\Console\Commands;

use App\Models\Article;
use GuzzleHttp\Client;
use Illuminate\Console\Command;
use Symfony\Component\DomCrawler\Crawler;
use Illuminate\Support\Str;

class ScrapeBeyondChats extends Command
{
    protected $signature = 'scrape:beyondchats {--limit=5}';

    protected $description = 'Scrape the oldest 5 articles from BeyondChats blogs (last page) and save to database';

    public function handle()
    {
        $limit = (int)$this->option('limit');
        $client = new Client(['timeout' => 20.0]);

        $this->info('Fetching blog listing...');
        $res = $client->get('https://beyondchats.com/blogs/');
        $html = (string)$res->getBody();
        $crawler = new Crawler($html);

        // Find last page link via pagination; fallback to pagination number extraction
        $lastPageUrl = null;

        try {
            $lastPageLink = $crawler->filter('a[rel="last"]')->first();
            if ($lastPageLink->count()) {
                $lastPageUrl = $lastPageLink->attr('href');
            }
        } catch (\Exception $e) {}

        if (!$lastPageUrl) {
            // Find pagination links and take the last number
            $pagination = $crawler->filter('.pagination a');
            if ($pagination->count()) {
                $lastHref = null;
                $pagination->each(function (Crawler $node) use (&$lastHref){
                    $lastHref = $node->attr('href');
                });
                $lastPageUrl = $lastHref;
            }
        }

        if (!$lastPageUrl) {
            $this->error('Could not find last page; proceeding with the main page.');
            $lastPageUrl = 'https://beyondchats.com/blogs/';
        }

        $this->info('Fetching last page: '.$lastPageUrl);
        $res2 = $client->get($lastPageUrl);
        $html2 = (string)$res2->getBody();
        $crawler2 = new Crawler($html2);

        // Select article links on the listing page; adapt selector based on markup
        $links = [];
        $crawler2->filter('a')->each(function (Crawler $node) use (&$links) {
            $href = $node->attr('href');
            $text = trim($node->text());
            // Heuristic: article URLs often contain '/blog/' or '/blogs/' and are not same as listing
            if ($href && preg_match('#/blog/#', $href) && strlen($text) > 5) {
                // normalize absolute url
                if (strpos($href, 'http') !== 0) {
                    $href = 'https://beyondchats.com' . (strpos($href, '/') === 0 ? $href : '/' . $href);
                }
                $links[$href] = $text;
            }
        });

        // keep unique and take first $limit since last page contains oldest, take first N
        $links = array_unique(array_keys($links));
        $links = array_slice($links, 0, $limit);

        $this->info('Found '.count($links).' article links; scraping each...');

        foreach ($links as $link) {
            try {
                $this->info('Scraping: '.$link);
                $r = $client->get($link);
                $doc = (string)$r->getBody();
                $c = new Crawler($doc);

                // Extract title
                $title = $c->filterXPath('//h1')->count() ? trim($c->filterXPath('//h1')->first()->text()) : null;

                // Extract main content; try common selectors
                $bodyNode = null;
                $possibleSelectors = ['article', '.post-content', '.entry-content', '.article-content', '#content'];
                foreach ($possibleSelectors as $sel) {
                    if ($c->filter($sel)->count()) {
                        $bodyNode = $c->filter($sel)->first();
                        break;
                    }
                }

                if (!$bodyNode) {
                    // fallback: the largest <div> by text length
                    $longest = '';
                    $c->filter('div')->each(function (Crawler $node) use (&$longest) {
                        $t = trim($node->text());
                        if (strlen($t) > strlen($longest)) $longest = $t;
                    });
                    $bodyText = $longest;
                } else {
                    $bodyText = trim($bodyNode->text());
                }

                if (!$title || !$bodyText) {
                    $this->warn('Skipping, could not extract title or content.');
                    continue;
                }

                $excerpt = Str::limit(strip_tags($bodyText), 200);
                $slug = Str::slug($title) ?: uniqid('a_');

                // Save or update
                $article = Article::firstOrCreate([
                    'slug' => $slug,
                ], [
                    'title' => $title,
                    'excerpt' => $excerpt,
                    'body' => $bodyText,
                    'source_url' => $link,
                    'published_at' => now(),
                    'scraped_at' => now(),
                ]);

                $this->info('Saved article: '.$article->title);
            } catch (\Exception $e) {
                $this->error('Error scraping '.$link.': '.$e->getMessage());
            }
        }

        $this->info('Done.');

        return 0;
    }
}

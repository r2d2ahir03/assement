# Backend (Laravel)

This folder contains a Laravel API for storing and managing scraped articles from BeyondChats.

Quick setup (local):

1. Ensure PHP 8.1+, Composer, and a DB (MySQL/Postgres) are installed.
2. From this folder run:

   composer create-project laravel/laravel . "^10.0" --prefer-dist

3. Copy `.env.example` to `.env` and configure DB connection.
4. Run `php artisan key:generate`.
5. Install dependencies for scraping:

   composer require guzzlehttp/guzzle symfony/dom-crawler symfony/css-selector

6. Run migrations:

   php artisan migrate

7. To scrape the 5 oldest articles from BeyondChats run:

   php artisan scrape:beyondchats

8. API endpoints (once app is running):

   - GET /api/articles
   - POST /api/articles
   - GET /api/articles/{id}
   - PUT /api/articles/{id}
   - DELETE /api/articles/{id}

Notes:
- The scraper command will fetch the last page of the blog listing and store up to 5 oldest articles.
- See `app/Console/Commands/ScrapeBeyondChats.php` for scraping logic.

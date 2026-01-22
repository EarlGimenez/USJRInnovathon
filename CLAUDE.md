# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkillMatch is an AI-powered job and seminar matching platform for the Philippine market (Taguig/BGC region). It matches job seekers with opportunities based on their skills using a natural language agent interface.

**Stack:** Laravel 12 (PHP 8.2+) backend with React 19 frontend, Vite bundler, Tailwind CSS 4.0, SQLite database.

## Development Commands

```bash
# Full setup (install deps, create .env, migrate, build)
composer run setup

# Start all development servers (Laravel, queue, logs, Vite HMR)
composer run dev

# Run tests
composer run test

# Individual commands
php artisan serve          # Laravel server only
npm run dev                # Vite dev server only
npm run build              # Production build
php artisan migrate        # Run migrations
php artisan tinker         # Interactive PHP shell
```

## Architecture

### Backend (Laravel)
- **API Controllers:** `app/Http/Controllers/Api/` - JobController, SeminarController, SessionController
- **Services:** `app/Services/CareerJetService.php` - External job API with caching and mock fallback
- **Routes:** `routes/api.php` - All REST endpoints prefixed with `/api/`
- **Session storage:** Cache-based with 24-hour TTL (not database users)

### Frontend (React)
- **Entry:** `resources/js/app.jsx` -> `components/App.jsx` (router)
- **Pages:** `resources/js/pages/` - LandingPage (AI agent), MapView (dashboard), JobDetails, SeminarDetails, ApplyPage
- **Components:** `resources/js/components/` - organized by type (agent/, cards/, charts/, map/, ui/)
- **State:** `resources/js/context/SkillContext.jsx` - Global skill state via React Context
- **Services:** `resources/js/services/MockJobGenerator.js` - Generates AI-matched jobs from user skills

### Key Patterns
- All frontend routes served by React Router; Laravel provides SPA catch-all
- CareerJet API results cached 1 hour; falls back to mock data when unavailable
- Skill matching: `SkillContext.calculateMatchPercentage()` compares user skills to job requirements
- AI agent in LandingPage extracts skills via keyword matching from natural language input
- localStorage persists sessionId and skills client-side

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/session` | POST | Create session with skills |
| `/api/session/{id}` | GET | Retrieve session |
| `/api/jobs` | GET | List jobs (query, city, lat, lng params) |
| `/api/jobs/{id}` | GET | Job details |
| `/api/seminars` | GET | List seminars |
| `/api/seminars/{id}` | GET | Seminar details |
| `/api/seminars/{id}/register` | POST | Register for seminar |
| `/api/seminars/{id}/verify` | POST | Verify attendance via QR |

## Environment Variables

Required in `.env`:
- `CAREERJET_API_KEY` - For live job data (optional; mock data used as fallback)

## Testing

Backend tests use PHPUnit. Test files in `tests/` directory:
```bash
php artisan test                    # Run all tests
php artisan test --filter=TestName  # Run specific test
```

No frontend component tests currently.

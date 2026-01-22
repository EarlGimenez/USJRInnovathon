# LangGraph Agentic Service

**AI-powered job and training recommendation engine using LangChain + LangGraph**

This service provides an agentic workflow that intelligently routes user prompts to either job search or skill improvement paths, performs intelligent matching, and returns structured results for the SkillMatch frontend.

## Architecture

```
┌─────────────┐
│   React     │
│  Frontend   │
└──────┬──────┘
       │ POST /api/prompt-ai
       ↓
┌─────────────────┐
│     Laravel     │
│   (Proxy API)   │
└──────┬──────────┘
       │ HTTP POST /prompt
       ↓
┌──────────────────────────────────┐
│   LangGraph Service (Node.js)    │
│  ┌────────────────────────────┐  │
│  │  LangGraph Workflow        │  │
│  │  ┌──────────────────────┐  │  │
│  │  │ ParseIntentNode      │  │  │
│  │  │ LoadUserProfileNode  │  │  │
│  │  │ JobSearchNode        │  │  │
│  │  │ GapAnalysisNode      │  │  │
│  │  │ TrainingRecommendNode│  │  │
│  │  │ AssembleResponseNode │  │  │
│  │  └──────────────────────┘  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
       │ Calls Laravel API via tools
       ↓
┌─────────────────┐
│   Laravel API   │
│ /jobs, /events, │
│  /courses, etc. │
└─────────────────┘
```

## Features

- **True Agentic Workflow**: Uses LangGraph for state management and conditional routing
- **Intent Detection**: LLM-powered classification of JOB_SEARCH vs SKILL_IMPROVEMENT
- **Skill Matching**: Deterministic algorithm for job-to-skill matching with scores
- **Gap Analysis**: Automatic identification of missing skills
- **Training Recommendations**: Smart recommendations based on skill gaps
- **Debug Logging**: Full transparency into workflow decisions
- **Threshold-Based Decisions**: Configurable thresholds for match quality

## Prerequisites

- Node.js 18+ and npm
- TypeScript
- OpenAI API key (for intent parsing)
- Running Laravel backend on http://localhost:8000

## Installation

### 1. Install Dependencies

```bash
cd langgraph-service
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
LARAVEL_API_URL=http://localhost:8000/api
OPENAI_API_KEY=sk-your-actual-api-key
PORT=3001
GOOD_MATCH_THRESHOLD=60
MIN_GOOD_MATCHES=2
```

### 3. Start the Service

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm run build
npm start
```

The service will start on `http://localhost:3001`.

## API Endpoints

### POST /prompt

Main agentic workflow endpoint.

**Request:**

```json
{
  "user_id": 1,
  "prompt": "I want to work as a Full Stack Developer"
}
```

**Response:**

```json
{
  "intent": "JOB_SEARCH",
  "query": "Full Stack Developer",
  "jobs": [
    {
      "id": 123,
      "title": "Senior Full Stack Developer",
      "company": "Tech Corp",
      "lat": 14.5547,
      "lng": 121.0244,
      "match_score": 85.7,
      "coverage": 60.0,
      "matched_skills": ["php", "react", "javascript"],
      "missing_skills": ["docker", "kubernetes"],
      "why": "Good match. You have most required skills..."
    }
  ],
  "trainings": [...],
  "ui": {
    "show_skill_gap_popup": true,
    "popup_title": "Skill Gap Detected",
    "popup_body": "You match 76% of requirements...",
    "suggested_next_steps": ["Complete Docker training..."]
  }
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "service": "langgraph-prompt-router",
  "version": "1.0.0",
  "config": {
    "laravelApiUrl": "http://localhost:8000/api",
    "openaiConfigured": true,
    "goodMatchThreshold": 60,
    "minGoodMatches": 2
  }
}
```

## Workflow Nodes

### 1. ParseIntentNode

- Uses GPT-4 to classify intent (JOB_SEARCH or SKILL_IMPROVEMENT)
- Extracts the job title or skill from the prompt
- Falls back to regex patterns if LLM fails

### 2. LoadUserProfileNode

- Fetches user skills from Laravel API
- Normalizes skills to lowercase
- Extracts proficiency if available

### 3. JobSearchNode (JOB_SEARCH intent only)

- Calls Laravel `/api/jobs` endpoint
- Matches user skills against job requirements
- Calculates match_score and coverage
- Identifies missing skills

### 4. GapAnalysisNode (JOB_SEARCH intent only)

- Analyzes missing skills across all jobs
- Calculates gap severity (LOW/MEDIUM/HIGH)
- Decides if training recommendations needed

### 5. TrainingRecommendNode

- For JOB_SEARCH: Recommends trainings for skill gaps
- For SKILL_IMPROVEMENT: Recommends trainings for query
- Handles both skill names and job titles
- Ranks trainings by relevance score

### 6. AssembleResponseNode

- Builds final JSON response
- Constructs UI configuration for popup
- Generates suggested next steps

## Testing

### Test with curl

```bash
# Test job search
curl -X POST http://localhost:3001/prompt \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "prompt": "I want to work as a React Developer"}'

# Test skill improvement
curl -X POST http://localhost:3001/prompt \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "prompt": "I want to learn Docker"}'

# Health check
curl http://localhost:3001/health
```

### Test via Laravel

```bash
# Health check
curl http://localhost:8000/api/prompt-ai/health

# Full workflow
curl -X POST http://localhost:8000/api/prompt-ai \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "prompt": "I want to work as a Full Stack Developer"}'
```

## Configuration

### Thresholds

Adjust in `.env`:

- `GOOD_MATCH_THRESHOLD`: Minimum match score to be considered "good" (default: 60%)
- `MIN_GOOD_MATCHES`: Minimum number of good matches to skip training (default: 2)

### LLM Model

Change in `src/graph/nodes.ts`:

```typescript
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini', // Change to 'gpt-4o' for better accuracy
  temperature: 0,
  openAIApiKey: config.openaiApiKey,
});
```

## Troubleshooting

### Service won't start

- Check if port 3001 is available
- Verify OpenAI API key is valid
- Ensure Laravel is running on port 8000

### OpenAI API errors

- Verify API key in `.env`
- Check API quota and billing
- Service will fall back to regex-based intent detection

### Laravel connection errors

- Ensure Laravel is running: `php artisan serve`
- Check `LARAVEL_API_URL` in `.env`
- Verify Laravel endpoints are accessible

## Development

### File Structure

```
langgraph-service/
├── src/
│   ├── index.ts              # Express server
│   ├── types.ts              # TypeScript types
│   ├── config.ts             # Configuration
│   └── graph/
│       ├── graph.ts          # LangGraph workflow definition
│       ├── nodes.ts          # Node implementations
│       └── tools.ts          # LangChain tools
├── package.json
├── tsconfig.json
├── .env
└── README.md
```

### Adding New Nodes

1. Define node function in `src/graph/nodes.ts`
2. Add node to workflow in `src/graph/graph.ts`
3. Connect with edges or conditional edges
4. Update state type in `src/types.ts` if needed

### Adding New Tools

1. Define tool in `src/graph/tools.ts`
2. Use `tool()` from `@langchain/core/tools`
3. Provide Zod schema for parameters
4. Call tool in node functions

## License

MIT

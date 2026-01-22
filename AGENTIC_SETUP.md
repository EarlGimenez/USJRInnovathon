# Agentic AI Setup Guide

This guide covers the **LangChain + LangGraph agentic workflow** implementation for SkillMatch.

## Overview

SkillMatch now has **two prompt processing systems**:

1. **Simple Router** (`/api/prompt`) - Basic Laravel services with deterministic matching
2. **Agentic Workflow** (`/api/prompt-ai`) - LangGraph-powered AI agent with LangChain tools ⭐ **NEW**

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      React Frontend                           │
│  (LandingPage with prompt input → MapView with results)      │
└───────────────┬────────────────────────┬─────────────────────┘
                │                        │
       POST /api/prompt          POST /api/prompt-ai
                │                        │
                ↓                        ↓
┌───────────────────────┐    ┌───────────────────────┐
│  Laravel Backend      │    │  Laravel Backend      │
│  PromptController     │    │  AgenticPromptController│
│  (Simple services)    │    │  (Proxies to Node)    │
└───────────────────────┘    └──────────┬────────────┘
                                        │ HTTP
                                        ↓
                            ┌───────────────────────┐
                            │  Node.js Service      │
                            │  LangGraph Workflow   │
                            │  - ParseIntentNode    │
                            │  - LoadProfileNode    │
                            │  - JobSearchNode      │
                            │  - GapAnalysisNode    │
                            │  - TrainingRecommend  │
                            │  - AssembleResponse   │
                            └──────────┬────────────┘
                                       │ Tools call
                                       ↓
                            ┌───────────────────────┐
                            │  Laravel API          │
                            │  /jobs, /events, etc. │
                            └───────────────────────┘
```

## Quick Start

### 1. Install LangGraph Service

```bash
cd langgraph-service
npm install
```

### 2. Configure Environment

The `.env` file is already created with your OpenAI API key. Verify:

```bash
cat langgraph-service/.env
```

Should contain:

```env
LARAVEL_API_URL=http://localhost:8000/api
OPENAI_API_KEY=sk-proj-...
PORT=3001
```

### 3. Start All Services

**Terminal 1 - Laravel:**

```bash
composer run dev
# or
php artisan serve
```

**Terminal 2 - LangGraph Service:**

```bash
cd langgraph-service
npm run dev
```

**Terminal 3 - Vite (if needed):**

```bash
npm run dev
```

### 4. Test the Agentic Workflow

```bash
# Test health check
curl http://localhost:8000/api/prompt-ai/health

# Test job search
curl -X POST http://localhost:8000/api/prompt-ai \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "prompt": "I want to work as a Full Stack Developer"
  }'

# Test skill improvement
curl -X POST http://localhost:8000/api/prompt-ai \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "prompt": "I want to learn Docker and Kubernetes"
  }'
```

## Frontend Integration

### Option 1: Update Existing LandingPage

Replace the fetch call in your LandingPage component:

```jsx
// OLD: Simple router
const response = await fetch('/api/prompt', { ... });

// NEW: Agentic workflow
const response = await fetch('/api/prompt-ai', { ... });
```

### Option 2: Add Toggle for Testing

```jsx
const [useAgentic, setUseAgentic] = useState(true);

const handlePromptSubmit = async (userPrompt) => {
  const endpoint = useAgentic ? '/api/prompt-ai' : '/api/prompt';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: currentUserId,
      prompt: userPrompt,
    }),
  });

  const data = await response.json();

  // Both endpoints return the same JSON structure
  navigate('/map', { state: data });

  if (data.ui.show_skill_gap_popup) {
    showSkillGapPopup(data.ui);
  }
};
```

## API Response Format

Both `/api/prompt` and `/api/prompt-ai` return the **same JSON structure**:

```json
{
  "intent": "JOB_SEARCH" | "SKILL_IMPROVEMENT",
  "query": "Full Stack Developer",
  "jobs": [
    {
      "id": 123,
      "title": "...",
      "company": "...",
      "lat": 14.5547,
      "lng": 121.0244,
      "match_score": 85.7,
      "coverage": 60.0,
      "matched_skills": ["php", "react"],
      "missing_skills": ["docker"],
      "why": "Good match. You have most required skills..."
    }
  ],
  "trainings": [
    {
      "id": 5,
      "title": "...",
      "provider": "...",
      "mode": "OFFLINE" | "ONLINE" | "HYBRID",
      "lat": 14.5547,
      "lng": 121.0244,
      "relevance_score": 90.0,
      "target_skills": ["docker"],
      "why": "Covers your missing skills..."
    }
  ],
  "ui": {
    "show_skill_gap_popup": true,
    "popup_title": "Skill Gap Detected",
    "popup_body": "You match 76% of requirements...",
    "suggested_next_steps": [
      "Complete 'Docker Training' to fill critical gaps",
      "Consider learning kubernetes for better matches"
    ]
  }
}
```

## Differences Between Systems

| Feature | Simple Router | Agentic Workflow |
|---------|--------------|------------------|
| **Endpoint** | `/api/prompt` | `/api/prompt-ai` |
| **Technology** | Laravel services | LangChain + LangGraph |
| **Intent Detection** | Regex patterns | GPT-4 + fallback |
| **State Management** | None | LangGraph state |
| **Workflow** | Linear | Conditional graph |
| **Debugging** | Limited | Full debug logs |
| **Extensibility** | Manual coding | Add nodes/edges |
| **Cost** | Free | OpenAI API calls |

## When to Use Which?

### Use Simple Router (`/api/prompt`) when:

- You want zero external dependencies
- You need predictable, deterministic behavior
- You want to minimize costs
- You're doing batch processing

### Use Agentic Workflow (`/api/prompt-ai`) when:

- You want intelligent intent understanding
- You need complex multi-step reasoning
- You want to leverage LLM capabilities
- You need extensible workflow logic

## Monitoring & Debugging

### View LangGraph Logs

Watch the Node.js console for detailed workflow logs:

```
⚡ Starting LangGraph workflow...

=== DEBUG LOGS ===
→ ParseIntentNode: Starting intent classification
✓ Intent: JOB_SEARCH, Query: "Full Stack Developer"
→ LoadUserProfileNode: Fetching user skills
✓ Loaded 8 skills for user 1
  Skills: [php, laravel, react, javascript, html, css, git, mysql]
→ JobSearchNode: Searching jobs for "Full Stack Developer"
✓ Found 12 jobs
  Average match score: 76.3%
  Good matches (≥60%): 8
→ GapAnalysisNode: Analyzing skill gaps
  Top missing skills: [docker, kubernetes, typescript, aws, redis]
  Gap severity: MEDIUM
  Needs training: false
→ AssembleResponseNode: Building final response
✓ Response assembled: 12 jobs, 0 trainings
  Popup: NO
==================

✅ Workflow completed successfully
```

### Check Service Health

```bash
# Direct Node service
curl http://localhost:3001/health

# Via Laravel proxy
curl http://localhost:8000/api/prompt-ai/health
```

## Troubleshooting

### "Cannot connect to LangGraph service"

1. Check if Node service is running:
   ```bash
   curl http://localhost:3001/health
   ```

2. Start the service:
   ```bash
   cd langgraph-service
   npm run dev
   ```

3. Check port 3001 is not in use:
   ```bash
   netstat -ano | findstr :3001  # Windows
   lsof -i :3001                 # Mac/Linux
   ```

### OpenAI API Errors

If you see OpenAI errors, the workflow will automatically fall back to regex-based intent detection. To fix:

1. Verify API key in `langgraph-service/.env`
2. Check OpenAI billing: https://platform.openai.com/usage
3. Test API key:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

### Laravel Connection Errors

If Node service can't reach Laravel:

1. Ensure Laravel is running on port 8000
2. Check `LARAVEL_API_URL` in `langgraph-service/.env`
3. Test endpoints:
   ```bash
   curl http://localhost:8000/api/jobs?query=developer
   ```

## Extending the Workflow

### Add a New Node

1. Define node in `langgraph-service/src/graph/nodes.ts`:

```typescript
export async function myNewNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const logs = [...state.debug_logs, '→ MyNewNode: Doing something'];

  // Your logic here

  return {
    // Updated state fields
    debug_logs: logs,
  };
}
```

2. Add to graph in `langgraph-service/src/graph/graph.ts`:

```typescript
workflow.addNode('my_new_node', myNewNode);
workflow.addEdge('some_node', 'my_new_node');
```

### Add a New Tool

1. Define in `langgraph-service/src/graph/tools.ts`:

```typescript
export const myNewTool = tool(
  async ({ param }: { param: string }) => {
    // Call Laravel API or external service
    const response = await axios.get(`${config.laravelApiUrl}/my-endpoint`);
    return JSON.stringify(response.data);
  },
  {
    name: 'myNewTool',
    description: 'What this tool does',
    schema: z.object({
      param: z.string().describe('Parameter description'),
    }),
  }
);
```

2. Use in node:

```typescript
const result = await myNewTool.invoke({ param: 'value' });
const data = JSON.parse(result);
```

## Production Deployment

### Deploy Node Service

```bash
cd langgraph-service
npm run build
npm start
```

### Configure Production URLs

Update `.env` files:

**Laravel `.env`:**
```env
LANGGRAPH_SERVICE_URL=https://your-langgraph-service.com
```

**LangGraph `.env`:**
```env
LARAVEL_API_URL=https://your-api.com/api
```

### Process Manager

Use PM2 to keep Node service running:

```bash
npm install -g pm2
pm2 start dist/index.js --name langgraph-service
pm2 save
pm2 startup
```

## Next Steps

1. ✅ Test both endpoints (`/api/prompt` and `/api/prompt-ai`)
2. ✅ Update frontend to use `/api/prompt-ai`
3. ✅ Test with various prompts
4. ✅ Monitor debug logs
5. ✅ Adjust thresholds in `.env` if needed
6. ✅ Add more nodes/tools as needed

## Support

- LangGraph Service README: `langgraph-service/README.md`
- Project README: `CLAUDE.md`
- Issues: Check console logs in both Laravel and Node services

---

**🎉 You now have a production-ready agentic AI workflow powered by LangChain + LangGraph!**

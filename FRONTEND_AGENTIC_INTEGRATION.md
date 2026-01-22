# Frontend Agentic Workflow Integration

This document explains how the LangGraph agentic workflow is integrated into the React frontend.

## 🎯 Overview

The agentic workflow allows users to type natural language prompts like:
- "I want to work as a Full Stack Developer"
- "I want to improve my React skills"

The system uses **LangGraph + LangChain** to intelligently:
1. Parse intent (JOB_SEARCH vs SKILL_IMPROVEMENT)
2. Extract the query (job title or skill)
3. Match user skills against opportunities
4. Recommend trainings for skill gaps
5. Return structured results for the UI

## 📊 Architecture Flow

```
┌──────────────┐
│ User types   │
│ prompt in    │──────────────────────┐
│ LandingPage  │                      │
└──────────────┘                      │
                                      ↓
                              POST /api/prompt-ai
                              {user_id, prompt}
                                      │
                                      ↓
                         ┌────────────────────────┐
                         │  Laravel Backend       │
                         │  AgenticPromptController
                         └──────────┬─────────────┘
                                    │ HTTP
                                    ↓
                         ┌────────────────────────┐
                         │  LangGraph Service     │
                         │  (Node.js:3001)        │
                         │  - ParseIntentNode     │
                         │  - LoadProfileNode     │
                         │  - JobSearchNode       │
                         │  - GapAnalysisNode     │
                         │  - TrainingRecommend   │
                         │  - AssembleResponse    │
                         └──────────┬─────────────┘
                                    │ Returns JSON
                                    ↓
                         ┌────────────────────────┐
                         │  React Frontend        │
                         │  LoadingSequence       │
                         │  (animated display)    │
                         └──────────┬─────────────┘
                                    │
                                    ↓
                         ┌────────────────────────┐
                         │  MapView               │
                         │  - Shows jobs/trainings│
                         │  - SkillGapPopup       │
                         │  - Success banner      │
                         └────────────────────────┘
```

## 🔧 Components Modified

### 1. LandingPage.jsx

**Location**: `resources/js/pages/LandingPage.jsx`

**What it does**:
- Displays the prompt input box
- Calls `/api/prompt-ai` endpoint when user submits
- Handles loading states and errors
- Passes agentic data to LoadingSequence

**Key code**:
```jsx
const handlePromptSubmit = async (prompt) => {
    const response = await axios.post('/api/prompt-ai', {
        user_id: 1,
        prompt: prompt
    });

    const data = response.data;
    setAgenticData(data); // Store LangGraph response
};
```

### 2. LoadingSequence.jsx

**Location**: `resources/js/components/agent/LoadingSequence.jsx`

**What it does**:
- Shows animated loading steps while "AI thinks"
- Displays intent, query, and result count
- Shows skill gap warning if detected
- Navigates to MapView when done

**Key features**:
- Animates through 5 steps (analyze, skills, collate, location, match)
- Extracts data from LangGraph response
- Shows different messages for JOB_SEARCH vs SKILL_IMPROVEMENT

### 3. MapView.jsx

**Location**: `resources/js/pages/MapView.jsx`

**What it does**:
- Receives agentic data via navigation state
- Displays jobs or trainings based on intent
- Shows success banner with query
- Triggers SkillGapPopup if gaps detected

**Key handling**:
```jsx
useEffect(() => {
    if (fromAgentic && agenticData) {
        // Set tab based on intent
        if (agenticData.intent === 'SKILL_IMPROVEMENT') {
            setActiveTab('seminars');
            setSeminarFilter('online');
        } else {
            setActiveTab('jobs');
        }

        // Load jobs
        if (agenticData.jobs) {
            setJobs(agenticData.jobs);
        }

        // Load trainings
        if (agenticData.trainings) {
            const events = agenticData.trainings.filter(t => t.mode === 'OFFLINE');
            const courses = agenticData.trainings.filter(t => t.mode === 'ONLINE');
            setEvents(events);
            setCourses(courses);
        }

        // Show skill gap popup
        if (agenticData.ui?.show_skill_gap_popup) {
            setTimeout(() => setShowSkillGapPopup(true), 1500);
        }
    }
}, [fromAgentic, agenticData]);
```

### 4. SkillGapPopup.jsx

**Location**: `resources/js/components/ui/SkillGapPopup.jsx`

**What it does**:
- Modal popup that shows skill gaps
- Displays match percentage with progress bar
- Lists missing skills
- Shows suggested next steps from LangGraph
- Button to view training programs

**Props from LangGraph response**:
```jsx
<SkillGapPopup
    skillGaps={agenticData.jobs?.[0]?.missing_skills || []}
    matchPercentage={Math.round(agenticData.average_match_score)}
    suggestedSteps={agenticData.ui.suggested_next_steps}
    onClose={() => setShowSkillGapPopup(false)}
    onViewTraining={() => {
        setActiveTab('seminars');
        setSeminarFilter('online');
    }}
/>
```

## 📝 LangGraph Response Format

The LangGraph service returns this JSON structure:

```json
{
  "intent": "JOB_SEARCH" | "SKILL_IMPROVEMENT",
  "query": "Full Stack Developer",
  "user_skills": ["php", "react", "javascript"],
  "jobs": [
    {
      "id": 123,
      "title": "Senior Full Stack Developer",
      "company": "Tech Corp",
      "lat": 14.5547,
      "lng": 121.0244,
      "match_score": 85.7,
      "coverage": 60.0,
      "matched_skills": ["php", "react"],
      "missing_skills": ["docker", "kubernetes"],
      "why": "Good match. You have most required skills..."
    }
  ],
  "trainings": [
    {
      "id": 5,
      "title": "Docker Training",
      "provider": "TechAcademy",
      "mode": "ONLINE",
      "lat": 14.5547,
      "lng": 121.0244,
      "relevance_score": 90.0,
      "target_skills": ["docker"],
      "why": "Covers your missing skills"
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

## 🚀 Running the Full System

### Prerequisites

1. **Laravel Backend** running on `http://localhost:8000`
2. **LangGraph Service** running on `http://localhost:3001`
3. **Vite Dev Server** for React hot reload (optional)

### Step 1: Start Laravel

```bash
# Terminal 1
php artisan serve
```

### Step 2: Start LangGraph Service

```bash
# Terminal 2
cd langgraph-service
npm run dev
```

### Step 3: Start Vite (Optional)

```bash
# Terminal 3
npm run dev
```

### Step 4: Test the Flow

1. Open `http://localhost:8000` in your browser
2. You'll see the LandingPage with prompt box
3. Type: "I want to work as a React Developer"
4. Watch the LoadingSequence animation (5 steps)
5. You'll be redirected to MapView with:
   - Jobs matched to your prompt
   - Success banner showing job count
   - Skill gap popup if you're missing skills
   - Training recommendations in the Seminars tab

## 🎨 UI/UX Flow

### 1. Landing Page

- Clean, modern design
- AI badge showing "Powered by LangGraph AI"
- Prompt box with examples
- Error handling for failed requests

### 2. Loading Sequence

- 5 animated steps:
  1. Analyzing your profile
  2. Mapping your skillset
  3. Collating job data
  4. Finding locations
  5. Calculating match scores
- Shows user's prompt
- Displays final count with animation
- Skill gap warning banner

### 3. Map View

- **Success Banner**: Shows intent and query
  - Green for JOB_SEARCH
  - Blue for SKILL_IMPROVEMENT
- **Job Listings**: Sorted by match_score
  - Shows match percentage
  - Lists matched/missing skills
- **Skill Gap Popup**: Modal overlay
  - Match percentage bar
  - Missing skills tags
  - Suggested next steps
  - "View Training Programs" button

## 🔧 Customization

### Change Intent Detection

Edit `langgraph-service/src/graph/nodes.ts`:
```typescript
const detectIntent = (prompt) => {
    // Add your own patterns
    const jobPatterns = [
        /\b(want to work|looking for|job)\b/,
        // Add more...
    ];
};
```

### Adjust Match Thresholds

Edit `langgraph-service/.env`:
```env
GOOD_MATCH_THRESHOLD=60
MIN_GOOD_MATCHES=2
```

### Customize UI Messages

Edit `langgraph-service/src/graph/nodes.ts` in `assembleResponseNode`:
```typescript
popupTitle = 'Your Custom Title';
popupBody = `Custom message with ${avgScore}% match`;
```

## 🐛 Troubleshooting

### "AI service is not available"

**Problem**: Frontend can't connect to LangGraph service

**Solution**:
```bash
# Check if LangGraph service is running
curl http://localhost:3001/health

# If not, start it
cd langgraph-service
npm run dev
```

### "Cannot connect to LangGraph service"

**Problem**: Laravel can't reach Node service

**Solution**:
1. Check `.env` has: `LANGGRAPH_SERVICE_URL=http://localhost:3001`
2. Test Laravel → Node connection:
   ```bash
   curl http://localhost:8000/api/prompt-ai/health
   ```

### Jobs/Trainings not showing

**Problem**: LangGraph returns empty arrays

**Solution**:
1. Check Laravel API endpoints are working:
   ```bash
   curl http://localhost:8000/api/jobs?query=developer
   curl http://localhost:8000/api/events
   ```
2. Check LangGraph logs for errors
3. Verify `LARAVEL_API_URL` in `langgraph-service/.env`

### Skill Gap Popup not appearing

**Problem**: Popup doesn't show even with skill gaps

**Solution**:
- Check console: `agenticData.ui.show_skill_gap_popup` should be `true`
- Verify average_match_score < 60
- Check MapView useEffect runs: look for "⚠️ Skill gap detected"

## 📚 Related Documentation

- **Backend Setup**: [AGENTIC_SETUP.md](AGENTIC_SETUP.md)
- **LangGraph Service**: [langgraph-service/README.md](langgraph-service/README.md)
- **Project Overview**: [CLAUDE.md](CLAUDE.md)

## ✅ Testing Checklist

- [ ] LandingPage renders with prompt box
- [ ] Can type and submit prompt
- [ ] LoadingSequence shows all 5 steps
- [ ] MapView loads with results
- [ ] Success banner shows correct intent/query
- [ ] Jobs show match scores
- [ ] Skill gap popup appears when threshold not met
- [ ] "View Training Programs" button works
- [ ] Can dismiss popup
- [ ] Trainings tab shows relevant courses
- [ ] Error handling works (try with service stopped)

## 🎉 Success Criteria

When everything works, you should see:

1. **Type prompt** → Instant submission
2. **Animated loading** → 5 smooth steps
3. **Results appear** → Jobs/trainings loaded
4. **Banner confirmation** → Shows what was found
5. **Skill gap feedback** → Popup with recommendations
6. **Seamless navigation** → Can explore jobs/trainings

The entire flow should feel like an AI-powered, intelligent job search assistant!

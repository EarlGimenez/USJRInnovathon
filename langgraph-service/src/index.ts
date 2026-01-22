import express from 'express';
import { createWorkflowGraph } from './graph/graph';
import { WorkflowState, ApiResponse } from './types';
import { config } from './config';

const app = express();
app.use(express.json());

// Enable CORS for Laravel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const workflow = createWorkflowGraph();

// ============================================================================
// POST /prompt - Main agentic workflow endpoint
// ============================================================================
app.post('/prompt', async (req, res) => {
  const { user_id, prompt } = req.body;

  if (!user_id || !prompt) {
    return res.status(400).json({
      error: 'Missing required fields: user_id, prompt',
    });
  }

  console.log(`\n[${new Date().toISOString()}] New request from user ${user_id}: "${prompt}"`);

  try {
    // Initialize state
    const initialState: WorkflowState = {
      user_id,
      prompt,
      intent: null,
      query: '',
      user_skills: [],
      user_skill_proficiency: {},
      jobs: [],
      average_match_score: 0,
      has_good_matches: false,
      skill_gaps: [],
      gap_severity: 'LOW',
      trainings: [],
      ui_config: {
        show_skill_gap_popup: false,
        popup_title: '',
        popup_body: '',
        suggested_next_steps: [],
      },
      needs_training: false,
      debug_logs: [],
    };

    // Run the LangGraph workflow
    console.log('⚡ Starting LangGraph workflow...');
    const result = await workflow.invoke(initialState);

    // Log debug info
    console.log('\n=== DEBUG LOGS ===');
    result.debug_logs.forEach((log: string) => console.log(log));
    console.log('==================\n');

    // Build API response
    const response: ApiResponse = {
      intent: result.intent!,
      query: result.query,
      jobs: result.jobs,
      trainings: result.trainings,
      ui: result.ui_config,
    };

    console.log(`✅ Workflow completed successfully`);
    console.log(`   Intent: ${response.intent}`);
    console.log(`   Jobs: ${response.jobs.length}`);
    console.log(`   Trainings: ${response.trainings.length}`);

    res.json(response);
  } catch (error: any) {
    console.error('❌ Error processing prompt:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /health - Health check endpoint
// ============================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'langgraph-prompt-router',
    version: '1.0.0',
    config: {
      laravelApiUrl: config.laravelApiUrl,
      openaiConfigured: !!config.openaiApiKey,
      goodMatchThreshold: config.goodMatchThreshold,
      minGoodMatches: config.minGoodMatches,
    },
  });
});

// ============================================================================
// Start server
// ============================================================================
app.listen(config.port, () => {
  console.log('\n🚀 LangGraph Agentic Service Started');
  console.log('=====================================');
  console.log(`   Service URL: http://localhost:${config.port}`);
  console.log(`   Laravel API: ${config.laravelApiUrl}`);
  console.log(`   OpenAI API: ${config.openaiApiKey ? '✅ Configured' : '❌ NOT CONFIGURED'}`);
  console.log(`   Thresholds: Match ≥${config.goodMatchThreshold}%, Min Good Matches ≥${config.minGoodMatches}`);
  console.log('=====================================\n');

  if (!config.openaiApiKey) {
    console.warn('⚠️  WARNING: OpenAI API key not configured! Intent parsing will use fallback logic.');
    console.warn('   Set OPENAI_API_KEY in .env to enable LLM-based intent detection.\n');
  }
});

import { ChatOpenAI } from '@langchain/openai';
import { WorkflowState, JobMatch, TrainingMatch } from '../types';
import { config } from '../config';
import { getUserProfileTool, searchJobsTool, searchTrainingsTool, inferSkillsForRoleTool } from './tools';

const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini', // Use cheap model for intent parsing
  temperature: 0,
  openAIApiKey: config.openaiApiKey,
});

// ============================================================================
// Node 1: Parse Intent
// ============================================================================
export async function parseIntentNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const logs = [...state.debug_logs, '→ ParseIntentNode: Starting intent classification'];

  const prompt = `Analyze this user prompt and extract:
1. Intent: Is the user looking for a JOB (JOB_SEARCH) or wanting to LEARN/IMPROVE skills (SKILL_IMPROVEMENT)?
2. Query: What is the specific job title or skill they mentioned?

User prompt: "${state.prompt}"

Respond ONLY with valid JSON:
{
  "intent": "JOB_SEARCH" | "SKILL_IMPROVEMENT",
  "query": "extracted job title or skill name"
}`;

  try {
    const response = await llm.invoke(prompt);
    const content = response.content as string;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    logs.push(`✓ Intent: ${parsed.intent}, Query: "${parsed.query}"`);

    return {
      intent: parsed.intent,
      query: parsed.query,
      debug_logs: logs,
    };
  } catch (error: any) {
    logs.push(`✗ Error parsing intent: ${error.message}`);

    // Fallback: simple pattern matching
    const lower = state.prompt.toLowerCase();
    let intent: 'JOB_SEARCH' | 'SKILL_IMPROVEMENT' = 'JOB_SEARCH';
    let query = state.prompt;

    if (lower.includes('improve') || lower.includes('learn') || lower.includes('training')) {
      intent = 'SKILL_IMPROVEMENT';
      const match = state.prompt.match(/(?:improve|learn|study)\s+(?:my\s+)?(.+?)(?:\.|$)/i);
      query = match ? match[1].trim() : state.prompt;
    } else {
      const match = state.prompt.match(/(?:work as|job as|become|find work)\s+(?:a\s+)?(.+?)(?:\.|$)/i);
      query = match ? match[1].trim() : state.prompt;
    }

    logs.push(`⚠ Fallback intent detection: ${intent}, Query: "${query}"`);

    return {
      intent,
      query,
      debug_logs: logs,
    };
  }
}

// ============================================================================
// Node 2: Load User Profile
// ============================================================================
export async function loadUserProfileNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const logs = [...state.debug_logs, '→ LoadUserProfileNode: Fetching user skills'];

  try {
    const result = await getUserProfileTool.invoke({ user_id: state.user_id });
    const data = JSON.parse(result);

    logs.push(`✓ Loaded ${data.skills.length} skills for user ${state.user_id}`);
    logs.push(`  Skills: [${data.skills.slice(0, 10).join(', ')}${data.skills.length > 10 ? '...' : ''}]`);

    return {
      user_skills: data.skills,
      user_skill_proficiency: data.proficiency,
      debug_logs: logs,
    };
  } catch (error: any) {
    logs.push(`✗ Error loading profile: ${error.message}`);
    return {
      user_skills: [],
      user_skill_proficiency: {},
      debug_logs: logs,
    };
  }
}

// ============================================================================
// Node 3: Job Search
// ============================================================================
export async function jobSearchNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const logs = [...state.debug_logs, `→ JobSearchNode: Searching jobs for "${state.query}"`];

  try {
    const result = await searchJobsTool.invoke({ job_title: state.query });
    const data = JSON.parse(result);

    logs.push(`✓ Found ${data.jobs.length} jobs`);

    // Match jobs against user skills
    const matchedJobs: JobMatch[] = data.jobs.map((job: any) => {
      const requiredSkills = job.required_skills || [];
      const matched = requiredSkills.filter((s: string) => state.user_skills.includes(s));
      const missing = requiredSkills.filter((s: string) => !state.user_skills.includes(s));

      const matchScore = requiredSkills.length > 0 ? (matched.length / requiredSkills.length) * 100 : 0;

      const coverage = state.user_skills.length > 0 ? (matched.length / state.user_skills.length) * 100 : 0;

      // Generate "why" explanation
      let why = '';
      if (matchScore >= 80) {
        why = `Excellent match! You have ${matched.length} of ${requiredSkills.length} required skills.`;
      } else if (matchScore >= 60) {
        why = `Good match. You have most required skills, only missing: ${missing.slice(0, 3).join(', ')}.`;
      } else if (matchScore > 0) {
        why = `Partial match. Consider upskilling in: ${missing.slice(0, 3).join(', ')}.`;
      } else {
        why = 'Skills not clearly specified, but matches your search query.';
      }

      return {
        id: job.id,
        title: job.title,
        company: job.company,
        lat: job.lat,
        lng: job.lng,
        match_score: Math.round(matchScore * 10) / 10,
        coverage: Math.round(coverage * 10) / 10,
        matched_skills: matched,
        missing_skills: missing,
        why,
      };
    });

    // Sort by match score
    matchedJobs.sort((a, b) => b.match_score - a.match_score);

    const avgScore = matchedJobs.length > 0 ? matchedJobs.reduce((sum, j) => sum + j.match_score, 0) / matchedJobs.length : 0;

    const goodMatches = matchedJobs.filter((j) => j.match_score >= config.goodMatchThreshold);

    logs.push(`  Average match score: ${avgScore.toFixed(1)}%`);
    logs.push(`  Good matches (≥${config.goodMatchThreshold}%): ${goodMatches.length}`);

    return {
      jobs: matchedJobs.slice(0, 10), // Top 10
      average_match_score: avgScore,
      has_good_matches: goodMatches.length >= config.minGoodMatches,
      debug_logs: logs,
    };
  } catch (error: any) {
    logs.push(`✗ Error in job search: ${error.message}`);
    return {
      jobs: [],
      average_match_score: 0,
      has_good_matches: false,
      debug_logs: logs,
    };
  }
}

// ============================================================================
// Node 4: Gap Analysis
// ============================================================================
export async function gapAnalysisNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const logs = [...state.debug_logs, '→ GapAnalysisNode: Analyzing skill gaps'];

  // Collect all missing skills from jobs
  const allMissingSkills: string[] = [];
  state.jobs.forEach((job) => {
    allMissingSkills.push(...job.missing_skills);
  });

  // Count frequency
  const skillFrequency: Record<string, number> = {};
  allMissingSkills.forEach((skill) => {
    skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
  });

  // Get top missing skills
  const topMissingSkills = Object.entries(skillFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill]) => skill);

  logs.push(`  Top missing skills: [${topMissingSkills.join(', ')}]`);

  // Determine severity
  let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (state.average_match_score < 40) {
    severity = 'HIGH';
  } else if (state.average_match_score < 60) {
    severity = 'MEDIUM';
  }

  // Decide if training is needed
  const needsTraining = !state.has_good_matches || state.average_match_score < 60;

  logs.push(`  Gap severity: ${severity}`);
  logs.push(`  Needs training: ${needsTraining}`);

  return {
    skill_gaps: topMissingSkills,
    gap_severity: severity,
    needs_training: needsTraining,
    debug_logs: logs,
  };
}

// ============================================================================
// Node 5: Training Recommend
// ============================================================================
export async function trainingRecommendNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const logs = [...state.debug_logs, '→ TrainingRecommendNode: Finding relevant trainings'];

  let targetSkills: string[] = [];

  // Determine target skills based on intent
  if (state.intent === 'SKILL_IMPROVEMENT') {
    // Check if query is a job title or skill
    const isJobTitle = /developer|engineer|manager|analyst|designer|architect/i.test(state.query);

    if (isJobTitle) {
      // Infer skills for this job role
      logs.push(`  Query appears to be job title, inferring skills...`);
      try {
        const result = await inferSkillsForRoleTool.invoke({ role_title: state.query });
        const data = JSON.parse(result);
        targetSkills = data.skills;
        logs.push(`  Inferred skills: [${targetSkills.join(', ')}]`);
      } catch (error: any) {
        logs.push(`  ✗ Error inferring skills: ${error.message}`);
        targetSkills = [state.query.toLowerCase()];
      }
    } else {
      // Treat as skill name
      targetSkills = [state.query.toLowerCase()];
    }
  } else {
    // JOB_SEARCH with gaps
    targetSkills = state.skill_gaps;
  }

  if (targetSkills.length === 0) {
    logs.push(`  No target skills identified, using query as-is`);
    targetSkills = [state.query.toLowerCase()];
  }

  try {
    const result = await searchTrainingsTool.invoke({ target_skills: targetSkills });
    const data = JSON.parse(result);

    logs.push(`✓ Found ${data.trainings.length} trainings`);

    // Calculate relevance scores
    const rankedTrainings: TrainingMatch[] = data.trainings.map((training: any) => {
      const coveredSkills = training.covered_skills || [];
      const overlap = coveredSkills.filter((s: string) => targetSkills.includes(s));

      const relevanceScore = coveredSkills.length > 0 ? (overlap.length / targetSkills.length) * 100 : 0;

      // Generate "why"
      let why = '';
      if (overlap.length > 0) {
        why = `Covers ${overlap.length} of your target skills: ${overlap.slice(0, 3).join(', ')}.`;
      } else {
        why = `Related to ${state.query}.`;
      }

      return {
        id: training.id,
        title: training.title,
        provider: training.provider,
        mode: training.mode,
        lat: training.lat,
        lng: training.lng,
        relevance_score: Math.round(relevanceScore * 10) / 10,
        target_skills: overlap,
        why,
      };
    });

    // Sort by relevance
    rankedTrainings.sort((a, b) => b.relevance_score - a.relevance_score);

    logs.push(`  Top training: "${rankedTrainings[0]?.title}" (${rankedTrainings[0]?.relevance_score}%)`);

    return {
      trainings: rankedTrainings.slice(0, 5), // Top 5
      debug_logs: logs,
    };
  } catch (error: any) {
    logs.push(`✗ Error finding trainings: ${error.message}`);
    return {
      trainings: [],
      debug_logs: logs,
    };
  }
}

// ============================================================================
// Node 6: Assemble Response
// ============================================================================
export async function assembleResponseNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const logs = [...state.debug_logs, '→ AssembleResponseNode: Building final response'];

  let showPopup = false;
  let popupTitle = '';
  let popupBody = '';
  let nextSteps: string[] = [];

  if (state.intent === 'JOB_SEARCH') {
    if (state.needs_training) {
      showPopup = true;
      popupTitle = 'Skill Gap Detected';

      const avgScore = Math.round(state.average_match_score);
      const trainingCount = state.trainings.length;
      const topGaps = state.skill_gaps.slice(0, 3).join(', ');

      popupBody = `You match ${avgScore}% of requirements on average. `;
      popupBody += `We found ${trainingCount} training programs to help you upskill for "${state.query}" roles. `;
      popupBody += `Top missing skills: ${topGaps}.`;

      if (state.trainings.length > 0) {
        nextSteps.push(`Complete "${state.trainings[0].title}" to fill critical gaps`);
      }
      if (state.skill_gaps.length > 0) {
        nextSteps.push(`Consider learning ${state.skill_gaps.slice(0, 2).join(', ')} for better job matches`);
      }
    }
  } else {
    // SKILL_IMPROVEMENT
    showPopup = true;
    popupTitle = 'Upskilling Recommendations';

    popupBody = `We found ${state.trainings.length} training programs to help you improve in "${state.query}".`;

    if (state.trainings.length > 0) {
      nextSteps.push(`Start with "${state.trainings[0].title}" (${state.trainings[0].relevance_score}% match)`);
    }
    if (state.trainings.length > 1) {
      nextSteps.push(`Also consider "${state.trainings[1].title}"`);
    }
  }

  if (nextSteps.length === 0) {
    nextSteps.push('Keep practicing your current skills and apply to matching opportunities');
  }

  logs.push(`✓ Response assembled: ${state.jobs.length} jobs, ${state.trainings.length} trainings`);
  logs.push(`  Popup: ${showPopup ? 'YES' : 'NO'}`);

  return {
    ui_config: {
      show_skill_gap_popup: showPopup,
      popup_title: popupTitle,
      popup_body: popupBody,
      suggested_next_steps: nextSteps,
    },
    debug_logs: logs,
  };
}

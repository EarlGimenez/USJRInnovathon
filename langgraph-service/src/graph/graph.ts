import { StateGraph, END } from '@langchain/langgraph';
import { WorkflowState } from '../types';
import {
  parseIntentNode,
  loadUserProfileNode,
  jobSearchNode,
  gapAnalysisNode,
  trainingRecommendNode,
  assembleResponseNode,
} from './nodes';

// Define the workflow
export function createWorkflowGraph() {
  const workflow = new StateGraph({
    channels: {
      user_id: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      prompt: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      intent: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      query: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      user_skills: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      user_skill_proficiency: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      jobs: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      average_match_score: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      has_good_matches: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      skill_gaps: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      gap_severity: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      trainings: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      ui_config: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      needs_training: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
      debug_logs: {
        value: (left: any, right: any) => right ?? left,
        default: () => null,
      },
    },
  });

  // Add nodes to the graph
  workflow.addNode('parse_intent', parseIntentNode);
  workflow.addNode('load_profile', loadUserProfileNode);
  workflow.addNode('job_search', jobSearchNode);
  workflow.addNode('gap_analysis', gapAnalysisNode);
  workflow.addNode('training_recommend', trainingRecommendNode);
  workflow.addNode('assemble_response', assembleResponseNode);

  // Set entry point
  workflow.setEntryPoint('parse_intent');

  // Add edges
  workflow.addEdge('parse_intent', 'load_profile');

  // Conditional edge from load_profile based on intent
  // If JOB_SEARCH -> go to job_search
  // If SKILL_IMPROVEMENT -> go directly to training_recommend
  workflow.addConditionalEdges(
    'load_profile',
    (state: WorkflowState) => {
      return state.intent === 'JOB_SEARCH' ? 'job_search' : 'training_recommend';
    },
    {
      job_search: 'job_search',
      training_recommend: 'training_recommend',
    }
  );

  // Job search flow: job_search -> gap_analysis
  workflow.addEdge('job_search', 'gap_analysis');

  // Conditional edge from gap_analysis
  // If needs_training=true -> go to training_recommend
  // If needs_training=false -> go directly to assemble_response
  workflow.addConditionalEdges(
    'gap_analysis',
    (state: WorkflowState) => {
      return state.needs_training ? 'training_recommend' : 'assemble_response';
    },
    {
      training_recommend: 'training_recommend',
      assemble_response: 'assemble_response',
    }
  );

  // Training recommend always goes to assemble_response
  workflow.addEdge('training_recommend', 'assemble_response');

  // Assemble response is the final node before END
  workflow.addEdge('assemble_response', END);

  return workflow.compile();
}

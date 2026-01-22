export interface JobMatch {
  id: number;
  title: string;
  company: string;
  description?: string;
  lat: number;
  lng: number;
  match_score: number;
  coverage: number;
  matched_skills: string[];
  missing_skills: string[];
  why: string;
}

export interface TrainingMatch {
  id: number;
  title: string;
  provider: string;
  description?: string;
  mode: "OFFLINE" | "ONLINE" | "HYBRID";
  lat: number;
  lng: number;
  relevance_score: number;
  target_skills: string[];
  why: string;
}

export interface WorkflowState {
  user_id: number;
  prompt: string;
  intent: "JOB_SEARCH" | "SKILL_IMPROVEMENT" | null;
  query: string;
  user_skills: string[];
  user_skill_proficiency: Record<string, number>;
  jobs: JobMatch[];
  average_match_score: number;
  has_good_matches: boolean;
  skill_gaps: string[];
  gap_severity: "LOW" | "MEDIUM" | "HIGH";
  trainings: TrainingMatch[];
  ui_config: {
    show_skill_gap_popup: boolean;
    popup_title: string;
    popup_body: string;
    suggested_next_steps: string[];
  };
  needs_training: boolean;
  debug_logs: string[];
}

export interface ApiResponse {
  intent: "JOB_SEARCH" | "SKILL_IMPROVEMENT";
  query: string;
  jobs: JobMatch[];
  trainings: TrainingMatch[];
  ui: {
    show_skill_gap_popup: boolean;
    popup_title: string;
    popup_body: string;
    suggested_next_steps: string[];
  };
}

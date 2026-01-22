import axios from 'axios';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { config } from '../config';

// ============================================================================
// Tool 1: Get User Profile
// ============================================================================
export const getUserProfileTool = tool(
  async ({ user_id }: { user_id: number }) => {
    try {
      // Call Laravel session endpoint to get user skills
      // Using session endpoint since SkillMatch uses session-based profiles
      const response = await axios.get(`${config.laravelApiUrl}/session/${user_id}`);

      const userData = response.data;
      const skills: string[] = [];
      const proficiency: Record<string, number> = {};

      // Extract skills from session data
      if (userData.skills && Array.isArray(userData.skills)) {
        userData.skills.forEach((skill: any) => {
          if (typeof skill === 'string') {
            skills.push(skill.toLowerCase().trim());
          } else if (skill.name) {
            const normalized = skill.name.toLowerCase().trim();
            skills.push(normalized);
            if (skill.proficiency) {
              proficiency[normalized] = skill.proficiency;
            }
          }
        });
      }

      return JSON.stringify({
        skills: Array.from(new Set(skills)),
        proficiency,
      });
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
      return JSON.stringify({ skills: [], proficiency: {} });
    }
  },
  {
    name: 'getUserProfile',
    description: 'Fetches user skills and proficiency from Laravel API',
    schema: z.object({
      user_id: z.number().describe('The user ID or session ID'),
    }),
  }
);

// ============================================================================
// Tool 2: Search Jobs
// ============================================================================
export const searchJobsTool = tool(
  async ({ job_title }: { job_title: string }) => {
    try {
      // Call existing Laravel /api/jobs endpoint
      const response = await axios.get(`${config.laravelApiUrl}/jobs`, {
        params: {
          query: job_title,
          city: 'Taguig',
          limit: 20,
        },
      });

      const jobs = response.data.jobs || response.data;

      // Map job response to expected format
      const mappedJobs = jobs.map((job: any) => ({
        id: job.id || job.url,
        title: job.title || 'Unknown Title',
        company: job.company || 'Unknown Company',
        description: job.description || '',
        location: job.location || 'Taguig/BGC',
        lat: job.lat || 14.5547, // Default BGC coordinates
        lng: job.lng || 121.0244,
        url: job.url,
        // Extract skills from job
        required_skills: extractSkillsFromJob(job),
      }));

      return JSON.stringify({ jobs: mappedJobs });
    } catch (error: any) {
      console.error('Error searching jobs:', error.message);
      return JSON.stringify({ jobs: [] });
    }
  },
  {
    name: 'searchJobs',
    description: 'Searches for jobs matching a job title via Laravel API',
    schema: z.object({
      job_title: z.string().describe('The job title to search for'),
    }),
  }
);

// ============================================================================
// Tool 3: Search Trainings/Seminars
// ============================================================================
export const searchTrainingsTool = tool(
  async ({ target_skills }: { target_skills: string[] }) => {
    try {
      // Try multiple endpoints: courses, events, seminars
      const endpoints = ['courses', 'events', 'seminars'];
      let allTrainings: any[] = [];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${config.laravelApiUrl}/${endpoint}`, {
            params: {
              skills: target_skills.join(','),
              limit: 10,
            },
          });

          const data = response.data;
          const trainings = data.courses || data.events || data.seminars || data;

          if (Array.isArray(trainings)) {
            allTrainings = allTrainings.concat(
              trainings.map((t: any) => ({ ...t, source: endpoint }))
            );
          }
        } catch (err) {
          // Skip if endpoint doesn't exist or fails
          console.log(`Skipping ${endpoint} endpoint`);
        }
      }

      // Map training response
      const mappedTrainings = allTrainings.map((training: any) => ({
        id: training.id,
        title: training.title || training.name || 'Training',
        provider: training.provider || training.organizer || training.institution || 'Unknown',
        description: training.description || '',
        mode: training.mode || training.type || 'OFFLINE',
        lat: training.lat || 14.5547,
        lng: training.lng || 121.0244,
        location: training.location || 'TBD',
        date: training.date || training.scheduled_at || training.start_date,
        covered_skills: extractSkillsFromTraining(training),
      }));

      return JSON.stringify({ trainings: mappedTrainings });
    } catch (error: any) {
      console.error('Error searching trainings:', error.message);
      return JSON.stringify({ trainings: [] });
    }
  },
  {
    name: 'searchTrainings',
    description: 'Searches for training programs that cover specific skills',
    schema: z.object({
      target_skills: z.array(z.string()).describe('Array of skills to find trainings for'),
    }),
  }
);

// ============================================================================
// Helper: Extract Skills from Job
// ============================================================================
function extractSkillsFromJob(job: any): string[] {
  const skills: string[] = [];

  // Option 1: Job has skills field
  if (job.skills && Array.isArray(job.skills)) {
    job.skills.forEach((skill: any) => {
      const normalized =
        typeof skill === 'string' ? skill.toLowerCase().trim() : skill.name?.toLowerCase().trim();
      if (normalized) skills.push(normalized);
    });
  }

  // Option 2: Extract from title/description via keyword matching
  if (skills.length === 0) {
    const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();
    const commonSkills = [
      'php',
      'laravel',
      'react',
      'javascript',
      'typescript',
      'node',
      'nodejs',
      'python',
      'java',
      'sql',
      'mysql',
      'postgresql',
      'mongodb',
      'docker',
      'kubernetes',
      'aws',
      'azure',
      'git',
      'api',
      'rest',
      'html',
      'css',
      'tailwind',
      'bootstrap',
      'vue',
      'angular',
      'agile',
      'scrum',
      'leadership',
      'communication',
    ];

    commonSkills.forEach((skill) => {
      if (text.includes(skill)) {
        skills.push(skill);
      }
    });
  }

  return Array.from(new Set(skills));
}

// ============================================================================
// Helper: Extract Skills from Training
// ============================================================================
function extractSkillsFromTraining(training: any): string[] {
  const skills: string[] = [];

  // Option 1: Training has skills/tags field
  if (training.skills && Array.isArray(training.skills)) {
    training.skills.forEach((skill: any) => {
      const normalized =
        typeof skill === 'string' ? skill.toLowerCase().trim() : skill.name?.toLowerCase().trim();
      if (normalized) skills.push(normalized);
    });
  }

  if (training.tags && Array.isArray(training.tags)) {
    training.tags.forEach((tag: string) => {
      skills.push(tag.toLowerCase().trim());
    });
  }

  // Option 2: Extract from title/description
  if (skills.length === 0) {
    const text = `${training.title || ''} ${training.description || ''}`.toLowerCase();
    const commonSkills = [
      'php',
      'laravel',
      'react',
      'javascript',
      'typescript',
      'node',
      'python',
      'java',
      'sql',
      'docker',
      'kubernetes',
      'aws',
      'leadership',
      'communication',
      'project management',
      'agile',
    ];

    commonSkills.forEach((skill) => {
      if (text.includes(skill)) {
        skills.push(skill);
      }
    });
  }

  return Array.from(new Set(skills));
}

// ============================================================================
// Tool 4: Infer Skills for Job Role
// ============================================================================
export const inferSkillsForRoleTool = tool(
  async ({ role_title }: { role_title: string }) => {
    try {
      // Get sample jobs for this role
      const response = await axios.get(`${config.laravelApiUrl}/jobs`, {
        params: {
          query: role_title,
          limit: 10,
        },
      });

      const jobs = response.data.jobs || response.data;
      const allSkills: string[] = [];

      jobs.forEach((job: any) => {
        const jobSkills = extractSkillsFromJob(job);
        allSkills.push(...jobSkills);
      });

      // Count frequency
      const skillFrequency: Record<string, number> = {};
      allSkills.forEach((skill) => {
        skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
      });

      // Get top skills by frequency
      const topSkills = Object.entries(skillFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([skill]) => skill);

      return JSON.stringify({ skills: topSkills });
    } catch (error: any) {
      console.error('Error inferring skills:', error.message);
      return JSON.stringify({ skills: [] });
    }
  },
  {
    name: 'inferSkillsForRole',
    description: 'Infers required skills for a job role by analyzing job postings',
    schema: z.object({
      role_title: z.string().describe('The job role title'),
    }),
  }
);

export const tools = [getUserProfileTool, searchJobsTool, searchTrainingsTool, inferSkillsForRoleTool];

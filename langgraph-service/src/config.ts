import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Laravel API base URL
  laravelApiUrl: process.env.LARAVEL_API_URL || 'http://localhost:8000/api',

  // OpenAI for intent parsing (lightweight usage)
  openaiApiKey: process.env.OPENAI_API_KEY || '',

  // Thresholds
  goodMatchThreshold: parseInt(process.env.GOOD_MATCH_THRESHOLD || '60'),
  minGoodMatches: parseInt(process.env.MIN_GOOD_MATCHES || '2'),

  // Port for this service
  port: parseInt(process.env.PORT || '3001'),
};

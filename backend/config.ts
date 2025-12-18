import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 8788,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
};

export const models = {
  flash: 'gemini-2.0-flash',
};

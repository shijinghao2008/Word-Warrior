
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials not configured. Database features will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple test user ID for MVP (no auth required)
// In production, this would come from Supabase Auth
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

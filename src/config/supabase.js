// ============================================
// SUPABASE CLIENT CONFIG
// ============================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dufolyrnrbybeflhdsay.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Zm9seXJucmJ5YmVmbGhkc2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Nzc2NDksImV4cCI6MjA5MDU1MzY0OX0.qkYuOM_hSrKL2gYgXmyzdwNvSOpZpVpmWd67Tj7y8kw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

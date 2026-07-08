import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vrdnbqlsttmwhimoxfqy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyZG5icWxzdHRtd2hpbW94ZnF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MTYwOTgsImV4cCI6MjA5ODk5MjA5OH0.UXWxwT9geoRQMxTJZS-TsWJttUfyAdXQ3cDtMXP8wAM';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let adminClient = null;
export function getAdminClient() {
  if (!supabaseServiceKey) return null;
  if (!adminClient) adminClient = createClient(supabaseUrl, supabaseServiceKey);
  return adminClient;
}

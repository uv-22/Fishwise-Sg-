/**
 * Backend connection (Supabase).
 *
 * supabaseAnonKey is the project's *anon / publishable* key — it is designed
 * to be public and is protected by the Row Level Security policies in
 * supabase/fishwise_setup.sql. Find it in Supabase → Project Settings → API Keys.
 *
 * With the key empty the app runs fully on this device (localStorage only).
 * NEVER put an Anthropic or service-role key in this file.
 */
export const CONFIG = {
  supabaseUrl: 'https://sfijnunnqpjzzgunlahg.supabase.co',
  supabaseAnonKey: '',
  // Set to true once the identify-fish and ask-coach Edge Functions are deployed
  // and the ANTHROPIC_API_KEY secret is set in Supabase.
  aiFunctionsDeployed: false,
};

export function cloudConfigured() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
}

export function aiConnected() {
  return cloudConfigured() && CONFIG.aiFunctionsDeployed;
}

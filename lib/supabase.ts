import { createClient } from '@supabase/supabase-js';

// Use valid placeholder URLs for build time
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Public client — used in client components and public API routes
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Server client — used in server-side API routes and server components
// This bypasses Row Level Security
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

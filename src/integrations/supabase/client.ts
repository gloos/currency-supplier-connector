// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ipbxjbiieennuabxsbzt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwYnhqYmlpZWVubnVhYnhzYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMjM5NDYsImV4cCI6MjA1ODU5OTk0Nn0.1dS5L2CDmnp-oXt_YXyE_bjDdpBtnxFpTBnamWhMyX8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
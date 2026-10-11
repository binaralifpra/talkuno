/**
 * lib/supabase.ts
 *
 * Supabase client — digunakan HANYA untuk video storage.
 * Auth dan database tetap menggunakan Firebase.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Nama bucket yang sudah dibuat di Supabase Console */
export const VIDEO_BUCKET = "videos";

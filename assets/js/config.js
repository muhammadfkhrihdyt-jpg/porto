import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://enftqwlkbdowfblqojoi.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZnRxd2xrYmRvd2ZibHFvam9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDYyNTgsImV4cCI6MjA5MjE4MjI1OH0.NfQtn9fVFqNtmZ7HmMlFsneEZ9CMZDJFLqfgeT75UkU";

export const TABLE_NAME = "assignments";
export const STORAGE_BUCKET = "tugas-project";
export const ADMIN_EMAIL = "muhammadfkhrihdyt@gmail.com";
export const AUTO_LOGOUT_MS = 10 * 60 * 1000;
export const MAX_UPLOAD_SIZE_MB = 10;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
export const ALLOWED_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".ppt", ".pptx"];
export const FILE_INPUT_ACCEPT = ALLOWED_FILE_EXTENSIONS.join(",");
export const SEMESTER_6_COURSES = [
  "CYBER SECURITY",
  "CLOUD COMPUTING",
  "REKAYASA PERANGKAT LUNAK",
  "INTERNET OF THINGS",
  "TEKNOLOGI WEB SERVICE",
  "PROYEK PERANGKAT LUNAK",
];

export const createPublicClient = () =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

export const createAdminClient = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in environment variables");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});  

/**
 * Default model configurations for reuse
 */
export const models = {
  embedding: "text-embedding-3-small",
  chat: "gpt-4o-mini",
  chatAdvanced: "gpt-4o",
};

const supabasePrivateKey = process.env.SUPABASE_ROLE_KEY;
if (!supabasePrivateKey) {
  throw new Error("Missing SUPABASE_ROLE_KEY in environment variables");
}
const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL in environment variables");
}

/**
 * Supabase client for database operations
 */
export const supabase = createClient(supabaseUrl, supabasePrivateKey);

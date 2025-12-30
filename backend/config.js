import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (ResearchAI/) if not in production
// Railway.com will provide environment variables directly
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "..", ".env") });
}

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

/**
 * Server configuration
 */
export const serverConfig = {
  port: process.env.PORT || 5000,
  environment: process.env.NODE_ENV || "development",
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || [
    "http://localhost:5173", // Vite default
    "http://localhost:3000", // Common React port
  ],
};

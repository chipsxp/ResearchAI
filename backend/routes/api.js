import { Router } from "express";
import { 
  handleIngest, 
  handleClear, 
  handleListFiles 
} from "../controllers/ingestController.js";
import { 
  handleQuery, 
  handleGetAnswer, 
  handleEnhancedAnswer,
  handleQueryByField,
  handleQueryByName 
} from "../controllers/queryController.js";

const router = Router();

/**
 * API Routes for ResearchAI Backend
 * 
 * Base URL: /api
 */

// ============================================
// Health Check
// ============================================

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancers
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ResearchAI API",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// ============================================
// Ingestion Routes
// ============================================

/**
 * POST /api/ingest
 * Triggers full ingestion pipeline
 * Body: { clearFirst?: boolean }
 */
router.post("/ingest", handleIngest);

/**
 * POST /api/ingest/clear
 * Clears all data from the database
 */
router.post("/ingest/clear", handleClear);

/**
 * GET /api/ingest/files
 * Lists files available for ingestion
 */
router.get("/ingest/files", handleListFiles);

// ============================================
// Query Routes
// ============================================

/**
 * POST /api/query
 * Performs semantic search
 * Body: { query: string, matchCount?: number, matchThreshold?: number, metadataFilter?: object }
 */
router.post("/query", handleQuery);

/**
 * POST /api/query/answer
 * Gets a direct answer to a question
 * Body: { question: string }
 */
router.post("/query/answer", handleGetAnswer);

/**
 * POST /api/query/enhanced-answer
 * Gets an enhanced answer using GPT-4o to synthesize retrieved information
 * Body: { question: string, matchCount?: number, matchThreshold?: number }
 */
router.post("/query/enhanced-answer", handleEnhancedAnswer);

/**
 * POST /api/query/by-field
 * Searches filtered by metadata field
 * Body: { query: string, field: string, value: string, matchCount?: number }
 */
router.post("/query/by-field", handleQueryByField);

/**
 * GET /api/query/by-name/:name
 * Searches for information about a specific name
 * Query params: matchCount (optional)
 */
router.get("/query/by-name/:name", handleQueryByName);

// ============================================
// API Documentation Route
// ============================================

/**
 * GET /api
 * Returns API documentation
 */
router.get("/", (req, res) => {
  res.status(200).json({
    name: "ResearchAI API",
    version: "1.0.0",
    description: "API for ingesting and querying information using semantic search",
    endpoints: {
      health: {
        "GET /api/health": "Health check endpoint"
      },
      ingestion: {
        "POST /api/ingest": "Trigger full ingestion pipeline",
        "POST /api/ingest/clear": "Clear all data from database",
        "GET /api/ingest/files": "List files available for ingestion"
      },
      query: {
        "POST /api/query": "Perform semantic search",
        "POST /api/query/answer": "Get direct answer to a question",
        "POST /api/query/enhanced-answer": "Get enhanced answer using GPT-4o (RAG)",
        "POST /api/query/by-field": "Search filtered by metadata field",
        "GET /api/query/by-name/:name": "Search by person name"
      }
    },
    examples: {
      query: {
        url: "POST /api/query",
        body: {
          query: "What skills does the developer have?",
          matchCount: 5,
          matchThreshold: 0.3
        }
      },
      answer: {
        url: "POST /api/query/answer",
        body: {
          question: "What state is chipsxp from?"
        }
      },
      enhancedAnswer: {
        url: "POST /api/query/enhanced-answer",
        body: {
          question: "What are the developer's skills and experience?",
          matchCount: 5,
          matchThreshold: 0.1
        },
        description: "Uses GPT-4o to synthesize a comprehensive answer from retrieved context"
      }
    }
  });
});

export default router;

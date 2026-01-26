# ResearchAI Developer Guide

> **Comprehensive technical documentation for AI engineers and developers**

This guide provides in-depth technical details about ResearchAI's architecture, algorithms, and implementation patterns. It's designed for developers who want to understand, extend, or customize the system.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Vector Embeddings Deep Dive](#vector-embeddings-deep-dive)
3. [Chunking Strategy](#chunking-strategy)
4. [Metadata Extraction](#metadata-extraction)
5. [Database Schema & Indexing](#database-schema--indexing)
6. [Semantic Search Algorithm](#semantic-search-algorithm)
7. [RAG Implementation](#rag-implementation)
8. [WebSocket Architecture](#websocket-architecture)
9. [API Design Patterns](#api-design-patterns)
10. [Performance Optimization](#performance-optimization)
11. [Custom Model Integration](#custom-model-integration)
12. [Extending the System](#extending-the-system)
13. [Troubleshooting & Debugging](#troubleshooting--debugging)

---

## System Architecture

### Component Overview

ResearchAI implements a **microservices-inspired architecture** with clear separation of concerns:

```
┌───────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  React Components (Frontend)                            │  │
│  │  • IngestPanel  • QueryPanel  • ResultsDisplay          │  │
│  │  • StatusBar    • LogViewer   • LogEntry                │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                            ↕ (HTTP/WebSocket)
┌───────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Express.js Server (Backend)                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │  │
│  │  │  API Routes │  │ Controllers │  │  Logger System │  │  │
│  │  │  /api/...   │→ │ Ingest/Query│→ │  + Socket.io   │  │  │
│  │  └─────────────┘  └─────────────┘  └────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────���
                            ↕ (SDK Calls)
┌───────────────────────────────────────────────────────────────┐
│                     INTEGRATION LAYER                         │
│  ┌──────────────────────┐    ┌──────────────────────┐         │
│  │   OpenAI API Client  │    │  Supabase Client     │         │
│  │  • Embeddings        │    │  • RPC Functions     │         │
│  │  • Chat Completions  │    │  • Vector Search     │         │
│  └──────────────────────┘    └──────────────────────┘         │
└───────────────────────────────────────────────────────────────┘
                            ↕
┌───────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL + pgvector (Supabase)                       │  │
│  │  • embeddedinfo table                                   │  │
│  │  • vector(1536) embeddings                              │  │
│  │  • jsonb metadata                                       │  │
│  │  • GIN indexes + cosine similarity search               │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow

**Ingestion Pipeline:**
```
Text File → Read → Chunk → Extract Metadata → Generate Embedding → Store
    ↓
info/*.txt
    ↓
fs.readFile()
    ↓
chunkText(300 words, 50 overlap)
    ↓
extractMetadataWithAI(GPT-4o-mini)
    ↓
openai.embeddings.create(text-embedding-3-small)
    ↓
supabase.from('embeddedinfo').insert()
```

**Query Pipeline:**
```
User Query → Generate Embedding → Vector Search → Rank Results → Format Response
     ↓
"What are Jimmy's skills?"
     ↓
openai.embeddings.create(query)
     ↓
supabase.rpc('match_information', {query_embedding, ...})
     ↓
ORDER BY cosine_distance ASC
     ↓
JSON response with similarity scores
```

**RAG Pipeline:**
```
User Question → Retrieve Context → Build Prompt → Generate Answer → Return
      ↓
"Tell me about Jimmy"
      ↓
retrieveInformation(question, 5)
      ↓
System Prompt + Context + Question
      ↓
openai.chat.completions.create(gpt-4o)
      ↓
Natural language answer + sources
```

---

## Vector Embeddings Deep Dive

### Embedding Model

**Model:** `text-embedding-3-small` (OpenAI)

**Specifications:**
- **Dimensions:** 1536
- **Max Input:** 8,191 tokens (~30,000 characters)
- **Output:** Float array `[-1.0, 1.0]`
- **Similarity Metric:** Cosine similarity
- **Pricing:** $0.00002 per 1K tokens

### Why 1536 Dimensions?

The embedding space represents semantic meaning across 1536 features:
- **High-dimensional space** allows for nuanced semantic distinctions
- **Cosine similarity** measures angular distance, not Euclidean
- **Normalized vectors** ensure fair comparison across lengths

### Embedding Generation Code

```javascript
// From config.js & ingestInfo.js
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text, // Can be string or array of strings
  });

  return response.data[0].embedding; // Float array of length 1536
}
```

### Batch Processing

**Optimization:** Embeddings can be generated in batches:

```javascript
// Process multiple chunks at once
const texts = ["chunk 1", "chunk 2", "chunk 3"];
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: texts, // Array instead of single string
});

// Returns array of embeddings
const embeddings = response.data.map(item => item.embedding);
```

**Current Implementation:** Sequential (one at a time)  
**Future Enhancement:** Batch processing for faster ingestion

### Vector Distance Metrics

**Cosine Similarity Formula:**
```
similarity = 1 - (embedding1 <=> embedding2)

where <=> is pgvector's cosine distance operator
```

**Why Cosine Over Euclidean?**
- Cosine measures **angle** between vectors (direction)
- Euclidean measures **magnitude** (straight-line distance)
- For semantic similarity, **direction matters more than length**

**Example:**
```
Query: "JavaScript developer"
Result 1: "Expert in JavaScript, React, Node.js" → 0.89 similarity
Result 2: "Skilled in TypeScript and frontend" → 0.76 similarity
Result 3: "Python and machine learning" → 0.42 similarity
```

---

## Chunking Strategy

### Why Chunking?

**Problem:** Long documents exceed embedding model context limits (8,191 tokens)  
**Solution:** Split into smaller, overlapping chunks

### Algorithm Implementation

```javascript
/**
 * Sliding window chunking with overlap
 * @param {string} text - Full text to chunk
 * @param {number} chunkSize - Target words per chunk (default: 300)
 * @param {number} overlap - Overlapping words between chunks (default: 50)
 */
function chunkText(text, chunkSize = 300, overlap = 50) {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  
  if (words.length <= chunkSize) {
    return [text.trim()]; // No chunking needed
  }
  
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + chunkSize, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    const chunk = chunkWords.join(' ');
    
    chunks.push(chunk);
    
    // Move forward by (chunkSize - overlap) words
    startIndex += (chunkSize - overlap);
    
    // Safety check to prevent infinite loop
    if (startIndex <= chunks.length - 1 && overlap >= chunkSize) {
      break;
    }
  }
  
  return chunks;
}
```

### Chunking Parameters

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `chunkSize` | 300 words | 100-500 | Larger = more context, but less precise matches |
| `overlap` | 50 words | 0-100 | Larger = better continuity, but more storage |

**Optimal Settings:**
- **Technical docs:** 300/50 (current default)
- **Long narratives:** 500/100
- **Short snippets:** 150/25

### Overlap Rationale

**Without Overlap:**
```
Chunk 1: "Jimmy is a developer specializing in JavaScript..."
Chunk 2: "...React and Node.js. He has 5 years of experience..."
                ↑ Context break!
```

**With 50-word Overlap:**
```
Chunk 1: "...specializing in JavaScript and React. He builds web apps..."
Chunk 2: "...React. He builds web apps using Node.js and Express. He has..."
                    ↑ Smooth transition!
```

### Token Estimation

**Rule of Thumb:** 1 word ≈ 1.3 tokens (English)

- 300 words ≈ 390 tokens
- Well within 8,191 token limit
- Leaves room for metadata in prompt

---

## Metadata Extraction

### Purpose

Metadata provides **structured filters** for precise searches:
- Search only within specific locations
- Filter by skills or technologies
- Find information about specific people

### AI-Powered Extraction

**Method:** GPT-4o-mini with structured prompt

```javascript
async function extractMetadataWithAI(content, filename) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a metadata extraction assistant. 
        Extract structured information and return ONLY valid JSON.
        
        Fields to extract:
        - name: Primary name/username
        - location: Geographic location
        - skills: Array of technical skills
        - technologies: Array of tools/platforms
        - role: Job title
        - websites: Array of URLs
        ...
        
        Return empty object {} if no clear information found.`
      },
      {
        role: "user",
        content: `Extract metadata from:\n\n${content.substring(0, 3000)}`
      }
    ],
    response_format: { type: "json_object" }, // Force JSON output
    temperature: 0.1 // Low temperature for consistency
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Metadata Schema

**JSONB Structure:**

```json
{
  "name": "chipsxp",
  "full_name": "Jimmy Burns",
  "aliases": ["pluckCode", "ChipsXP"],
  "location": "Florida",
  "email": "chips_xp@yahoo.com",
  "role": "AI SaaS full stack developer",
  "profession": "Software Engineer",
  "skills": [
    "JavaScript",
    "Python",
    "React",
    "Node.js",
    "TypeScript"
  ],
  "technologies": [
    "OpenAI",
    "Supabase",
    "Vite",
    "Express.js",
    "Socket.io"
  ],
  "organizations": ["Galaxies-dev"],
  "websites": [
    "https://chipsxp.com",
    "https://sketchfab.com/chipsxp-pluckcode"
  ],
  "social_profiles": {
    "github": "chipsxp",
    "linkedin": "in/chipsxp"
  },
  "topics": [
    "AI development",
    "Full-stack development",
    "Vector databases"
  ],
  "specializations": [
    "Semantic search",
    "RAG systems",
    "Web development"
  ],
  "projects": [
    "ResearchAI",
    "StackBolt",
    "nextjs-sanity"
  ],
  "summary": "AI SaaS full stack developer specializing in JavaScript and Python.",
  "source_filename": "github-skills-experience.txt",
  "source_chunk": 1,
  "total_chunks": 3
}
```

### Filtering with Metadata

**Basic Filter:**
```javascript
const filter = { location: "Florida" };
const results = await retrieveInformation(query, 5, 0.3, filter);
```

**Advanced Filter (PostgreSQL JSONB):**
```sql
-- Find developers with React skills
WHERE metadata @> '{"skills": ["React"]}'

-- Find people in Florida OR California
WHERE metadata->'location' ?| array['Florida', 'California']

-- Find entries with any email
WHERE metadata ? 'email'
```

---

## Database Schema & Indexing

### Table Structure

```sql
CREATE TABLE embeddedinfo (
    id bigserial PRIMARY KEY,              -- Auto-incrementing unique ID
    filename text NOT NULL,                -- Source file name
    content text NOT NULL,                 -- Text chunk content
    metadata jsonb,                        -- Structured metadata (nullable)
    embedding vector(1536),                -- 1536-dim float array
    created_at timestamptz DEFAULT now()   -- Timestamp
);
```

### Indexes

**1. Primary Key Index (Automatic)**
```sql
-- Created automatically on 'id' column
-- Type: B-tree
-- Purpose: Fast row lookups by ID
```

**2. GIN Index on Metadata**
```sql
CREATE INDEX idx_embeddedinfo_metadata 
ON embeddedinfo 
USING GIN (metadata);

-- Purpose: Fast JSONB queries (@>, ?, ?&, ?| operators)
-- Use case: metadata @> '{"location": "Florida"}'
```

**3. Vector Index (Optional - for large datasets)**
```sql
-- Not included by default, but recommended for 100k+ rows
CREATE INDEX idx_embeddedinfo_embedding 
ON embeddedinfo 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Purpose: Approximate nearest neighbor search
-- Trade-off: Faster search, slight accuracy reduction
```

### Stored Function

**match_information()** - Core semantic search function

```sql
CREATE FUNCTION match_information (
    query_embedding vector(1536),
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.1,
    filter jsonb DEFAULT NULL
) RETURNS TABLE(
    id bigint,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        embeddedinfo.id,
        embeddedinfo.content,
        embeddedinfo.metadata,
        1 - (embeddedinfo.embedding <=> query_embedding) AS similarity
    FROM embeddedinfo
    WHERE 
        -- Apply metadata filter only if provided
        (filter IS NULL OR embeddedinfo.metadata @> filter)
        -- Filter by minimum similarity threshold
        AND 1 - (embeddedinfo.embedding <=> query_embedding) > match_threshold
    ORDER BY embeddedinfo.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

**Key Features:**
- **Cosine distance operator:** `<=>` (pgvector)
- **Similarity calculation:** `1 - distance`
- **Metadata filtering:** `@>` containment operator
- **Threshold filtering:** Only return results above minimum similarity
- **Ordering:** By distance (ascending = most similar first)
- **Limiting:** Top N results

---

## Semantic Search Algorithm

### Search Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. User Query                                              │
│     "What programming languages does Jimmy know?"           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────��──────────────┐
│  2. Query Embedding Generation                              │
│     OpenAI API: text-embedding-3-small                      │
│     Output: [0.123, -0.456, ..., 0.789] (1536 dims)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Vector Similarity Search (PostgreSQL)                   │
│     SELECT id, content, metadata,                           │
│            1 - (embedding <=> query_embedding) AS similarity│
│     FROM embeddedinfo                                       │
│     WHERE similarity > 0.3                                  │
│     ORDER BY embedding <=> query_embedding                  │
│     LIMIT 5;                                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Results Ranking                                         │
│     Result 1: 0.89 similarity (89%)                         │
│     Result 2: 0.76 similarity (76%)                         │
│     Result 3: 0.64 similarity (64%)                         │
│     Result 4: 0.52 similarity (52%)                         │
│     Result 5: 0.47 similarity (47%)                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Response Formatting                                     │
│     JSON with content, metadata, similarity scores          │
└─────────────────────────────────────────────────────────────┘
```

### Similarity Threshold Tuning

| Threshold | Use Case | Results |
|-----------|----------|---------|
| 0.1 | Broad search, recall-focused | Many results, some may be loosely related |
| 0.3 | **Default** - balanced | Good mix of relevance and coverage |
| 0.5 | High precision | Fewer results, all highly relevant |
| 0.7 | Exact matches only | Very few results, extremely precise |

### Implementation

```javascript
// From retrieveInfo.js
async function retrieveInformation(
  userQuery, 
  matchCount = 5, 
  matchThreshold = 0.1,
  metadataFilter = null
) {
  // 1. Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(userQuery);
  
  // 2. Build RPC parameters
  const rpcParams = {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: matchThreshold,
  };
  
  // 3. Add optional metadata filter
  if (metadataFilter) {
    rpcParams.filter = metadataFilter;
  }
  
  // 4. Execute vector search via Supabase RPC
  const { data, error } = await supabase.rpc(
    "match_information", 
    rpcParams
  );
  
  // 5. Return formatted results
  return { data, error, queryEmbedding, matchCount };
}
```

---

## RAG Implementation

**RAG = Retrieval-Augmented Generation**

### Concept

Instead of relying solely on the LLM's pre-trained knowledge, RAG:
1. **Retrieves** relevant context from a knowledge base
2. **Augments** the prompt with that context
3. **Generates** a response based on the provided information

### Implementation Modes

**Mode 1: Simple Answer (Best Match)**

```javascript
// From backend/retrieveInfo.js
async function getAnswer(question) {
  // 1. Find most relevant chunk
  const { data } = await retrieveInformation(question, 1, 0.1);
  
  if (!data || data.length === 0) {
    return { answer: null, error: new Error("No relevant information") };
  }
  
  // 2. Return best match directly
  const bestMatch = data[0];
  return {
    answer: bestMatch.content,
    context: {
      similarity: bestMatch.similarity,
      source: bestMatch.metadata?.source_filename,
      metadata: bestMatch.metadata
    }
  };
}
```

**Mode 2: Enhanced Answer (GPT-4o Synthesis)**

```javascript
async function getEnhancedAnswer(
  question,
  matchCount = 5,
  matchThreshold = 0.1
) {
  // 1. Retrieve multiple relevant chunks
  const { data } = await retrieveInformation(
    question, 
    matchCount, 
    matchThreshold
  );
  
  if (!data || data.length === 0) {
    return { 
      answer: null, 
      error: new Error("No relevant context found") 
    };
  }
  
  // 2. Build context from top results
  const contextChunks = data.map((item, index) => 
    `[Source ${index + 1}] (${(item.similarity * 100).toFixed(1)}% match)\n${item.content}`
  ).join('\n\n---\n\n');
  
  // 3. Create RAG prompt
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant that answers questions based on provided context.
        
Rules:
- Answer ONLY using the context provided below
- If the context doesn't contain relevant information, say so
- Cite source numbers when referencing specific information
- Be concise but complete`
      },
      {
        role: "user",
        content: `Context:\n\n${contextChunks}\n\n---\n\nQuestion: ${question}`
      }
    ],
    temperature: 0.3, // Low for factual consistency
    max_tokens: 500
  });
  
  // 4. Return answer with sources
  return {
    answer: response.choices[0].message.content,
    sources: data.map(item => ({
      similarity: item.similarity,
      filename: item.metadata?.source_filename,
      preview: item.content.substring(0, 150) + "..."
    })),
    context: {
      model: "gpt-4o",
      chunksUsed: data.length,
      avgSimilarity: (data.reduce((sum, d) => sum + d.similarity, 0) / data.length).toFixed(2)
    }
  };
}
```

### Prompt Engineering Tips

**System Prompt Best Practices:**
- ✅ **Be explicit:** "Answer ONLY using the context"
- ✅ **Set boundaries:** "If unsure, say 'I don't know'"
- ✅ **Request citations:** "Reference source numbers"
- ✅ **Define tone:** "Be professional and concise"

**Temperature Settings:**
- **0.0-0.3:** Factual, deterministic responses (RAG)
- **0.5-0.7:** Balanced creativity and accuracy
- **0.8-1.0:** Creative, varied responses (not for RAG)

---

## WebSocket Architecture

### Real-Time Logging System

**Purpose:** Broadcast backend logs to frontend in real-time

### Server-Side Setup

```javascript
// From backend/server.js
import { Server } from "socket.io";

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Connect logger to Socket.io
logger.setSocketIO(io);

// Handle client connections
io.on("connection", (socket) => {
  // Send log history to new client
  const history = logger.getHistory(100);
  socket.emit("log-history", history);
  
  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
  
  // Handle clear logs request
  socket.on("clear-logs", () => {
    logger.clearHistory();
    io.emit("logs-cleared");
  });
});
```

### Logger Implementation

```javascript
// From backend/logger.js
class Logger {
  constructor() {
    this.io = null;
    this.logHistory = [];
  }
  
  setSocketIO(socketIO) {
    this.io = socketIO;
  }
  
  info(category, message, data = {}) {
    const logEntry = {
      level: 'info',
      category,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.logHistory.push(logEntry);
    
    // Broadcast to all connected clients
    if (this.io) {
      this.io.emit('log', logEntry);
    }
  }
  
  // Similar methods: success(), error(), warning(), process(), data()
}
```

### Client-Side Consumption

```javascript
// From frontend/src/App.jsx
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('log', (logEntry) => {
  setLogs(prev => [...prev, logEntry]);
});

socket.on('log-history', (history) => {
  setLogs(history);
});
```

### Event Types

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `connect` | Server → Client | - | Connection established |
| `log` | Server → Client | `{level, category, message, timestamp}` | New log entry |
| `log-history` | Server → Client | `Array<LogEntry>` | Historical logs on connect |
| `clear-logs` | Client → Server | - | Request to clear logs |
| `logs-cleared` | Server → Client | - | Logs cleared notification |

---

## API Design Patterns

### Controller Pattern

**Structure:**
```
routes/api.js → controllers/queryController.js → services/retrieveInfo.js
```

**Example:**

```javascript
// routes/api.js
import express from 'express';
import { handleQuery } from '../controllers/queryController.js';

const router = express.Router();
router.post('/query', handleQuery);

export default router;
```

```javascript
// controllers/queryController.js
export async function handleQuery(req, res) {
  try {
    const { query, matchCount = 5 } = req.body;
    
    // Validation
    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }
    
    // Business logic
    const result = await retrieveInformation(query, matchCount);
    
    // Response
    res.status(200).json({
      success: true,
      results: result.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Error Handling Strategy

**Consistent Error Responses:**

```javascript
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE or error.message"
}
```

**HTTP Status Codes:**
- **200:** Success
- **400:** Bad request (validation error)
- **404:** Not found (no results)
- **500:** Server error (exception)

### Request Validation

```javascript
// Validation middleware example
function validateQuery(req, res, next) {
  const { query } = req.body;
  
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({
      success: false,
      message: "Query is required and must be a non-empty string",
      error: "INVALID_QUERY"
    });
  }
  
  next();
}
```

---

## Performance Optimization

### Database Optimizations

**1. Vector Index for Large Datasets**

```sql
-- For datasets > 100k rows
CREATE INDEX idx_embedding_ivfflat 
ON embeddedinfo 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Trade-off: 10-20x faster, ~2-3% accuracy reduction
```

**2. Partial Indexes**

```sql
-- Index only high-quality matches
CREATE INDEX idx_high_similarity 
ON embeddedinfo ((1 - (embedding <=> query_embedding)))
WHERE (1 - (embedding <=> query_embedding)) > 0.5;
```

**3. Metadata Indexing**

```sql
-- Frequently queried fields
CREATE INDEX idx_metadata_location 
ON embeddedinfo ((metadata->>'location'));

CREATE INDEX idx_metadata_skills 
ON embeddedinfo USING GIN ((metadata->'skills'));
```

### Application Optimizations

**1. Connection Pooling**

```javascript
// Supabase client automatically pools connections
export const supabase = createClient(url, key, {
  db: {
    pool: {
      min: 2,
      max: 10
    }
  }
});
```

**2. Batch Embedding Generation**

```javascript
// Instead of N API calls, make 1 call with array
const embeddings = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: chunks // Array of strings
});

// Process results
for (let i = 0; i < chunks.length; i++) {
  embeddedResults.push({
    content: chunks[i],
    embedding: embeddings.data[i].embedding
  });
}
```

**3. Caching Query Embeddings**

```javascript
const queryCache = new Map();

async function getCachedEmbedding(query) {
  if (queryCache.has(query)) {
    return queryCache.get(query);
  }
  
  const embedding = await generateQueryEmbedding(query);
  queryCache.set(query, embedding);
  
  // Limit cache size
  if (queryCache.size > 1000) {
    const firstKey = queryCache.keys().next().value;
    queryCache.delete(firstKey);
  }
  
  return embedding;
}
```

### Monitoring & Metrics

**Key Performance Indicators:**

```javascript
// Track in logger
logger.data("PERF", "Query completed", {
  duration: endTime - startTime,
  resultsCount: data.length,
  avgSimilarity: avgSim,
  threshold: matchThreshold
});
```

**Recommended Metrics:**
- Average query time
- Embedding generation time
- Results count distribution
- Similarity score distribution
- Cache hit rate

---

## Custom Model Integration

### Replacing OpenAI Embeddings

**Example: Using Hugging Face Local Model**

```javascript
// Install: npm install @xenova/transformers

import { pipeline } from '@xenova/transformers';

// Load model once at startup
const embedder = await pipeline(
  'feature-extraction', 
  'Xenova/all-MiniLM-L6-v2'
);

async function generateLocalEmbedding(text) {
  const output = await embedder(text, { 
    pooling: 'mean', 
    normalize: true 
  });
  
  return Array.from(output.data); // Convert to array
}

// Note: Different models have different dimensions!
// all-MiniLM-L6-v2 = 384 dimensions
// Update database: embedding vector(384)
```

### Using Alternative LLMs

**Example: Anthropic Claude for RAG**

```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function getEnhancedAnswerClaude(question, context) {
  const response = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${question}`
    }]
  });
  
  return response.content[0].text;
}
```

### Local LLM Integration (Ollama)

```javascript
// Install: npm install ollama

import ollama from 'ollama';

async function getAnswerLocal(question, context) {
  const response = await ollama.chat({
    model: 'llama2',
    messages: [
      {
        role: 'system',
        content: 'Answer based only on the provided context.'
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`
      }
    ]
  });
  
  return response.message.content;
}
```

---

## Extending the System

### Adding New Metadata Fields

**1. Update Extraction Prompt:**

```javascript
// In extractMetadataWithAI()
content: `Extract metadata including:
- education: Array of degrees/certifications
- years_experience: Number of years in field
- industries: Array of industry domains
...`
```

**2. Update Database (Optional):**

```sql
-- Metadata is JSONB, so no schema change needed!
-- But you can add validation:
ALTER TABLE embeddedinfo
ADD CONSTRAINT check_education 
CHECK (jsonb_typeof(metadata->'education') = 'array');
```

### Adding New Search Endpoints

**Example: Search by Date Range**

```javascript
// controllers/queryController.js
export async function handleQueryByDateRange(req, res) {
  const { query, startDate, endDate } = req.body;
  
  const { data } = await supabase
    .rpc('match_information', { query_embedding: embedding })
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  res.json({ success: true, results: data });
}

// routes/api.js
router.post('/query/by-date', handleQueryByDateRange);
```

### Adding Multi-Modal Support

**Example: Image Embeddings**

```javascript
// Using CLIP model for image + text
import { pipeline } from '@xenova/transformers';

const clipModel = await pipeline(
  'feature-extraction',
  'Xenova/clip-vit-base-patch32'
);

async function generateImageEmbedding(imageBuffer) {
  const embedding = await clipModel(imageBuffer);
  return Array.from(embedding.data);
}

// Store in separate table or same table with type field
await supabase.from('embeddedinfo').insert({
  content: imageUrl,
  embedding: imageEmbedding,
  metadata: { type: 'image', description: '...' }
});
```

---

## Troubleshooting & Debugging

### Common Issues

**1. "No results found" despite relevant data**

**Causes:**
- Threshold too high
- Poor embedding quality
- Metadata filter too restrictive

**Solutions:**
```javascript
// Lower threshold
matchThreshold: 0.1 // Instead of 0.3

// Check raw similarities
const { data } = await supabase
  .rpc('match_information', { 
    query_embedding, 
    match_threshold: 0.0 // Get ALL results
  });

console.log(data.map(d => d.similarity)); // See score distribution
```

**2. "API rate limit exceeded" (OpenAI)**

**Solutions:**
```javascript
// Add retry logic with exponential backoff
async function generateEmbeddingWithRetry(text, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text
      });
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

**3. WebSocket connection fails**

**Debugging:**
```javascript
// Frontend
const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('reconnect_attempt', () => {
  console.log('Attempting to reconnect...');
});
```

**4. "Column 'embedding' has wrong dimensions"**

**Cause:** Model mismatch

**Solution:**
```sql
-- Check current dimensions
SELECT pg_typeof(embedding) FROM embeddedinfo LIMIT 1;
-- Returns: vector(1536)

-- If using different model, recreate table
DROP TABLE embeddedinfo;
CREATE TABLE embeddedinfo (
  ...
  embedding vector(384) -- For smaller models
);
```

### Debug Logging

**Enable Verbose Logging:**

```javascript
// Add to config.js
export const DEBUG = process.env.DEBUG === 'true';

// Use in code
if (DEBUG) {
  console.log("Query embedding:", queryEmbedding.slice(0, 5));
  console.log("Search params:", { matchCount, matchThreshold });
}
```

### Testing Utilities

**Test Embedding Generation:**

```javascript
// test-embedding.js
const embedding = await generateEmbedding("test query");
console.log("Dimensions:", embedding.length);
console.log("Sample values:", embedding.slice(0, 10));
console.log("Value range:", [Math.min(...embedding), Math.max(...embedding)]);
```

**Test Database Connection:**

```javascript
// test-db.js
const { data, error } = await supabase
  .from('embeddedinfo')
  .select('count')
  .limit(1);

if (error) {
  console.error("Database error:", error);
} else {
  console.log("Database connected! Row count:", data);
}
```

---

## Best Practices Summary

### Security
- ✅ Never commit `.env` files
- ✅ Use service role keys server-side only
- ✅ Validate all user inputs
- ✅ Rate limit API endpoints
- ✅ Sanitize metadata before insertion

### Performance
- ✅ Use connection pooling
- ✅ Batch API requests when possible
- ✅ Cache frequent queries
- ✅ Add database indexes for large datasets
- ✅ Monitor API usage and costs

### Code Quality
- ✅ Use TypeScript for type safety (future enhancement)
- ✅ Write comprehensive error messages
- ✅ Log important operations
- ✅ Follow consistent naming conventions
- ✅ Document complex algorithms

### Data Management
- ✅ Version your database schema
- ✅ Back up production data regularly
- ✅ Test migrations in staging first
- ✅ Monitor embedding quality
- ✅ Periodically re-ingest data as models improve

---

## Additional Resources

### Documentation
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Supabase pgvector Documentation](https://supabase.com/docs/guides/ai/vector-columns)
- [Socket.io Documentation](https://socket.io/docs/v4/)

### Papers & Research
- "Attention Is All You Need" (Transformers)
- "RAG: Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
- "BERT: Pre-training of Deep Bidirectional Transformers"

### Tools
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [OpenAI Cookbook](https://github.com/openai/openai-cookbook)
- [Langchain (Advanced RAG)](https://python.langchain.com/)

---

## Contributing to ResearchAI

Interested in contributing? Areas for enhancement:

1. **TypeScript Migration** - Add type safety
2. **Batch Processing** - Parallel embedding generation
3. **Advanced RAG** - Multi-hop reasoning, query rewriting
4. **UI Improvements** - Charts, visualizations, dark/light mode
5. **Testing Suite** - Unit tests, integration tests
6. **Multi-tenancy** - Support multiple users/projects
7. **Document Upload** - Web-based file upload instead of file system
8. **Export Features** - CSV, JSON, PDF export of results

---

**Last Updated:** 2026-01-26  
**Author:** Jimmy Burns (@chipsxp)  
**License:** MIT

---

For questions or support, open an issue on [GitHub](https://github.com/chipsxp/ResearchAI/issues).
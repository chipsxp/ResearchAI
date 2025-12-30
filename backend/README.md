# ResearchAI Backend

Express.js API server for ResearchAI - a semantic search and information retrieval system powered by OpenAI embeddings and Supabase.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase project with vector extension enabled
- OpenAI API key

### Installation

```bash
cd backend
npm install
```

### Environment Variables

The backend reads environment variables from the parent directory's `.env` file (in development) or from system environment variables (in production).

Required variables:
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ROLE_KEY` - Your Supabase service role key

Optional variables:
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (development/production)
- `CORS_ORIGINS` - Comma-separated list of allowed origins

### Running the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:5000` (or the PORT specified).

## 📡 API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and timestamp.

### Ingestion

**Trigger Ingestion:**
```
POST /api/ingest
Body: { "clearFirst": true }
```
Processes all files in the `../info` directory.

**Clear Database:**
```
POST /api/ingest/clear
```
Removes all data from the database.

**List Files:**
```
GET /api/ingest/files
```
Lists available files for ingestion.

### Query

**Semantic Search:**
```
POST /api/query
Body: {
  "query": "Your search query",
  "matchCount": 5,
  "matchThreshold": 0.3,
  "metadataFilter": { "field": "value" }
}
```

**Get Answer:**
```
POST /api/query/answer
Body: { "question": "Your question" }
```

**Search by Field:**
```
POST /api/query/by-field
Body: {
  "query": "Search text",
  "field": "location",
  "value": "Florida"
}
```

**Search by Name:**
```
GET /api/query/by-name/:name?matchCount=10
```

## 🧪 Testing

Run the included test script:
```bash
node test-api.js
```

Or test manually with curl:
```bash
curl http://localhost:5000/api/health
```

## 🚄 Railway.com Deployment

This backend is configured for Railway.com deployment:

1. **Set environment variables** in Railway dashboard:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ROLE_KEY`
   - `NODE_ENV=production`
   - `CORS_ORIGINS=https://your-frontend-domain.com`

2. **Railway auto-detects** the start command from `package.json`

3. **PORT is automatically set** by Railway

### Railway Configuration

No additional configuration files needed. Railway will:
- Detect Node.js project from `package.json`
- Run `npm install` automatically
- Execute `npm start` to start the server
- Assign a port via `PORT` environment variable

## 📁 Project Structure

```
backend/
├── server.js              # Express server entry point
├── config.js              # Configuration and clients
├── routes/
│   └── api.js            # API route definitions
├── controllers/
│   ├── ingestController.js   # Ingestion handlers
│   └── queryController.js    # Query handlers
├── ingestInfo.js          # File ingestion logic
├── retrieveInfo.js        # Semantic search logic
├── test-api.js            # API test script
├── package.json           # Dependencies
└── README.md              # This file
```

## 🔧 Features

- **Semantic Search**: Query using natural language
- **File Chunking**: Automatically splits large documents
- **AI Metadata Extraction**: Uses GPT-4o-mini to extract structured metadata
- **Vector Embeddings**: OpenAI text-embedding-3-small model
- **CORS Support**: Configurable cross-origin access
- **Error Handling**: Comprehensive error responses
- **Request Logging**: Timestamps for all requests

## 📝 License

MIT

# ResearchAI

> An AI-powered semantic search and information retrieval system built with OpenAI embeddings and Supabase vector database

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Purpose

ResearchAI is a full-stack application that allows you to:
- **Ingest** text documents and convert them into searchable embeddings
- **Query** your knowledge base using natural language
- **Retrieve** semantically relevant information with similarity scores
- **Visualize** results through a modern, real-time dashboard

Perfect for building personal knowledge bases, research assistants, or document search systems.

---

## 🏗️ Architecture

ResearchAI follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  - Real-time dashboard with WebSocket connection            │
│  - Ingestion controls & query interface                     │
│  - Live log viewer & results display                        │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Express.js + Socket.io)           │
│  - RESTful API for ingestion & queries                      │
│  - WebSocket for real-time logging                          │
│  - OpenAI integration for embeddings                        │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│              Database (Supabase PostgreSQL)                 │
│  - pgvector extension for similarity search                 │
│  - Stores document chunks + metadata + embeddings           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - UI library
- **Vite 6.0** - Build tool and dev server
- **Socket.io Client 4.8** - Real-time WebSocket communication
- **CSS3** - Custom styling with dark theme

### Backend
- **Node.js** (ES Modules) - Runtime environment
- **Express.js 4.21** - Web application framework
- **Socket.io 4.8** - WebSocket server for real-time logs
- **OpenAI API 6.15** - Text embeddings generation
- **Supabase JS 2.89** - Database client
- **Postgres 3.4** - PostgreSQL client

### Database & AI
- **Supabase** - Hosted PostgreSQL with pgvector
- **OpenAI text-embedding-3-small** - 1536-dimensional embeddings
- **OpenAI gpt-4o-mini / gpt-4o** - Context-aware answer generation

---

## 📁 Project Structure

```
ResearchAI/
├── backend/                    # Express.js API server
│   ├── server.js               # Main server with Socket.io
│   ├── config.js               # API clients & configuration
│   ├── logger.js               # Custom logger with WebSocket broadcast
│   ├── routes/
│   │   └── api.js              # API route definitions
│   ├── controllers/
│   │   ├── ingestController.js # Ingestion endpoints
│   │   └── queryController.js  # Query endpoints
│   ├── ingestInfo.js           # Document ingestion logic
│   ├── retrieveInfo.js         # Semantic search logic
│   └── package.json
│
├── frontend/                   # React dashboard
│   ├── src/
│   │   ├── App.jsx             # Main app component
│   │   ├── main.jsx            # React entry point
│   │   ├── App.css             # Styling
│   │   └── components/
│   │       ├── StatusBar.jsx   # Connection status header
│   │       ├── LogViewer.jsx   # Real-time logs
│   │       ├── IngestPanel.jsx # Ingestion controls
│   │       ├── QueryPanel.jsx  # Search interface
│   │       └── ResultsDisplay.jsx # Results visualization
│   ├── index.html
│   ├── vite.config.js          # Vite config with proxy
│   └── package.json
│
├── info/                       # Sample documents to ingest
│   └── github-skills-experience.txt
│
├── index.js                    # CLI script for querying
├── ingestInfo.js               # CLI script for ingestion
├── retrieveInfo.js             # Shared retrieval logic
├── config.js                   # Shared configuration
├── create-table.sql            # Database schema
├── package.json                # Root dependencies
└── .env                        # Environment variables (not committed)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+**
- **npm** or **yarn**
- **Supabase account** (free tier works)
- **OpenAI API key**

### 1. Clone the Repository

```bash
git clone https://github.com/chipsxp/ResearchAI.git
cd ResearchAI
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ROLE_KEY=your-supabase-anon-key

# Server Configuration (optional)
PORT=5000
NODE_ENV=development
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `create-table.sql` in the Supabase SQL Editor:

```sql
-- Creates the 'information' table with pgvector extension
-- See create-table.sql for full schema
```

### 4. Install Dependencies

```bash
# Root dependencies (for CLI scripts)
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 5. Run the Application

**Option A: Full Stack (Recommended)**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
# Dashboard runs on http://localhost:5173
```

**Option B: CLI Only**

```bash
# Ingest documents
npm run ingest

# Query from command line
node index.js
```

---

## 📊 How It Works

### 1. **Data Ingestion Pipeline**

```
Text Files → Chunking → Metadata Extraction → Embeddings → Database
```

1. **Read Files**: Scans the `/info` directory for `.txt` files
2. **Chunking**: Splits large documents into manageable chunks (~500 characters)
3. **Metadata Extraction**: Uses GPT-4 to extract structured metadata (tags, categories, key entities)
4. **Embedding Generation**: Converts text chunks into 1536-dimensional vectors using OpenAI
5. **Database Storage**: Saves chunks + embeddings + metadata to Supabase

### 2. **Semantic Search Process**

```
User Query → Embedding → Vector Search → Ranked Results → LLM Answer
```

1. **Query Embedding**: Convert user's natural language query to vector
2. **Similarity Search**: Use pgvector's cosine similarity to find matching chunks
3. **Ranking**: Sort results by similarity score (0-100%)
4. **Context Building**: Combine top results as context
5. **Answer Generation**: Feed context to GPT-4 for natural language answer

---

## 🔌 API Endpoints

### Health Check
```bash
GET /api/health
```

### Ingestion
```bash
# Start ingestion
POST /api/ingest
Body: { "clearFirst": true }

# Clear database
POST /api/ingest/clear

# List available files
GET /api/ingest/files
```

### Search & Query
```bash
# Semantic search
POST /api/query
Body: { "query": "What is Jimmy's background?", "matchCount": 5 }

# Get AI-generated answer
POST /api/query/answer
Body: { "query": "What programming languages does Jimmy know?" }

# Enhanced answer with sources
POST /api/query/enhanced
Body: { "query": "Tell me about Jimmy's projects" }
```

### Logs
```bash
# Get log history
GET /api/logs?count=100

# Clear logs
DELETE /api/logs
```

---

## 🎨 Features

✅ **Real-time Dashboard** - Live updates via WebSocket  
✅ **Semantic Search** - Natural language queries  
✅ **AI-Powered Answers** - Context-aware responses using GPT-4  
✅ **Metadata Extraction** - Automatic tagging and categorization  
✅ **Similarity Scoring** - Percentage match for each result  
✅ **File Management** - List, ingest, and clear documents  
✅ **Comprehensive Logging** - Real-time operation tracking  
✅ **RESTful API** - Easy integration with other tools  

---

## 🧪 Testing

### Backend API Testing

```bash
cd backend
node test-api.js
```

### Manual cURL Testing

```bash
# Health check
curl http://localhost:5000/api/health

# Search
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is Jimmy skilled at?", "matchCount": 3}'
```

---

## 🚄 Deployment

The backend is designed for **Railway.com** deployment:

1. Push code to GitHub
2. Connect Railway to your repository
3. Add environment variables in Railway dashboard
4. Deploy automatically on push

Frontend can be deployed to:
- **Vercel** (recommended for Vite/React)
- **Netlify**
- **GitHub Pages**

---

## 📚 Additional Documentation

For deeper technical details, see:

- **[Backend Documentation](./backend/README.md)** - API details, deployment, and architecture
- **[Frontend Documentation](./frontend/README.md)** - Component guide and WebSocket events
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - In-depth technical reference for AI engineers *(to be created)*

---

## 🛡️ Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_ROLE_KEY` | Supabase service role key | ✅ |
| `PORT` | Backend server port (default: 5000) | ❌ |
| `NODE_ENV` | Environment mode (development/production) | ❌ |
| `CORS_ORIGINS` | Comma-separated allowed origins | ❌ |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the **MIT License**.

---

## 👤 Author

**Jimmy Burns (pluckCode / chipsxp)**

- GitHub: [@chipsxp](https://github.com/chipsxp)
- Email: chips_xp@yahoo.com
- Website: [chipsxp.com](https://chipsxp.com)
- LinkedIn: [in/chipsxp](https://linkedin.com/in/chipsxp)

---

## 🙏 Acknowledgments

- **OpenAI** - GPT and embedding models
- **Supabase** - Hosted PostgreSQL with pgvector
- **Socket.io** - Real-time communication
- **Vite** - Lightning-fast frontend tooling

---

## 📞 Support

If you encounter issues or have questions:

1. Check the [Backend README](./backend/README.md) for troubleshooting
2. Open an [Issue](https://github.com/chipsxp/ResearchAI/issues)
3. Contact via email: chips_xp@yahoo.com

---

**Built with ❤️ for AI-powered knowledge management**
# ResearchAI Frontend

A React-based dashboard for the ResearchAI semantic search system with real-time log display.

## 🚀 Implementation Status

### Phase 1: Backend API Setup ✅ COMPLETE
- Express server with API endpoints
- Ingestion and query controllers
- CORS enabled
- All tests passed

### Phase 2: React Frontend Setup ✅ COMPLETE

1. ✅ Initialize React app with Vite
2. ✅ Create component structure
3. ✅ Set up API client utilities
4. ✅ Configure proxy for API calls
5. ✅ WebSocket integration for real-time logs

### Phase 3: Component Development ✅ COMPLETE

1. ✅ StatusBar - Connection status, log count, server info
2. ✅ LogViewer - Real-time log display with filtering
3. ✅ LogEntry - Individual log entry rendering
4. ✅ IngestPanel - Ingestion controls with file stats
5. ✅ QueryPanel - Semantic search interface
6. ✅ ResultsDisplay - Query results and answers

### Phase 4: Integration & Testing
1. [ ] Install dependencies
2. [ ] Connect frontend to backend API
3. [ ] Test ingestion flow
4. [ ] Test query flow with various inputs
5. [ ] Test with curl requests

## 📁 Project Structure

```
frontend/
├── index.html              # Entry HTML file
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration with proxy
├── README.md               # This file
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Main app with WebSocket & API handlers
    ├── App.css             # All styles
    └── components/
        ├── StatusBar.jsx   # Header with connection status
        ├── LogViewer.jsx   # Real-time log display
        ├── LogEntry.jsx    # Single log entry
        ├── IngestPanel.jsx # Ingestion controls
        ├── QueryPanel.jsx  # Search interface
        └── ResultsDisplay.jsx # Results display
```

## 🔧 Setup & Installation

### 1. Install Backend Dependencies
```bash
cd ../backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Start Backend Server
```bash
cd ../backend
npm run dev
```

### 4. Start Frontend Dev Server
```bash
cd frontend
npm run dev
```

### 5. Open Browser
Navigate to: http://localhost:5173

## 🔌 API Endpoints

The frontend connects to these backend endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/ingest/files` | List files |
| POST | `/api/ingest` | Trigger ingestion |
| POST | `/api/ingest/clear` | Clear database |
| POST | `/api/query` | Semantic search |
| POST | `/api/query/answer` | Get direct answer |
| GET | `/api/logs` | Get log history |
| DELETE | `/api/logs` | Clear logs |

## 🧪 Testing with cURL

### Test Ingestion (logs appear in UI)
```bash
curl -X POST http://localhost:5000/api/ingest
```

### Test Query (logs appear in UI)
```bash
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "skills"}'
```

### Get Answer
```bash
curl -X POST http://localhost:5000/api/query/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What programming languages?"}'
```

### List Files
```bash
curl http://localhost:5000/api/ingest/files
```

### Health Check
```bash
curl http://localhost:5000/api/health
```

## 🎨 Features

### Real-Time Log Display
- WebSocket connection for instant log updates
- Filter by log level (info, success, error, warning, process, data, debug)
- Search logs by text
- Auto-scroll with manual override
- Clear logs button

### Ingestion Panel
- File count and statistics
- Clear database before ingestion option
- Start/Stop ingestion
- Success/error feedback

### Query Panel
- Search mode (multiple results)
- Answer mode (best match)
- Adjustable result count
- Adjustable similarity threshold

### Results Display
- Similarity scores with percentage
- Content preview
- Metadata tags (name, location, role, skills)
- Source file information
- Chunk information

## 🔄 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Client ← Server | Connection established |
| `disconnect` | Client ← Server | Connection lost |
| `log` | Client ← Server | New log entry |
| `log-history` | Client ← Server | Log history on connect |
| `logs-cleared` | Client ← Server | Logs cleared notification |
| `clear-logs` | Client → Server | Request to clear logs |

## 🛠️ Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📝 Notes

- TypeScript errors in VSCode are expected until `npm install` runs
- The frontend uses Vite's proxy to forward `/api/*` requests to backend
- WebSocket connects directly to backend on port 5000
- All console logs from backend are captured and displayed in UI
- Only error logs remain in terminal for debugging

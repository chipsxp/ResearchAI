import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import StatusBar from './components/StatusBar';
import LogViewer from './components/LogViewer';
import IngestPanel from './components/IngestPanel';
import QueryPanel from './components/QueryPanel';
import ResultsDisplay from './components/ResultsDisplay';

// API base URL - will use proxy in development
const API_BASE = '';

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const [queryResults, setQueryResults] = useState(null);
  const [serverInfo, setServerInfo] = useState(null);
  const [loading, setLoading] = useState({
    ingest: false,
    query: false,
    clear: false
  });

  // Initialize WebSocket connection
  useEffect(() => {
    const socketUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : window.location.origin;
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    });

    newSocket.on('log', (logEntry) => {
      setLogs(prev => [...prev, logEntry]);
    });

    newSocket.on('log-history', (history) => {
      setLogs(history);
    });

    newSocket.on('logs-cleared', () => {
      setLogs([]);
    });

    setSocket(newSocket);

    // Fetch initial server info
    fetchServerInfo();

    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch server info
  const fetchServerInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      const data = await response.json();
      setServerInfo(data);
    } catch (error) {
      console.error('Failed to fetch server info:', error);
    }
  };

  // Clear logs
  const clearLogs = useCallback(() => {
    if (socket) {
      socket.emit('clear-logs');
    }
    setLogs([]);
  }, [socket]);

  // API: Trigger Ingestion
  const handleIngest = async (clearFirst = true) => {
    setLoading(prev => ({ ...prev, ingest: true }));
    try {
      const response = await fetch(`${API_BASE}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearFirst })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Ingestion failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(prev => ({ ...prev, ingest: false }));
    }
  };

  // API: Clear Database
  const handleClearDatabase = async () => {
    setLoading(prev => ({ ...prev, clear: true }));
    try {
      const response = await fetch(`${API_BASE}/api/ingest/clear`, {
        method: 'POST'
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Clear failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(prev => ({ ...prev, clear: false }));
    }
  };

  // API: Query
  const handleQuery = async (query, matchCount = 5, matchThreshold = 0.3) => {
    setLoading(prev => ({ ...prev, query: true }));
    setQueryResults(null);
    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, matchCount, matchThreshold })
      });
      const data = await response.json();
      setQueryResults(data);
      return data;
    } catch (error) {
      console.error('Query failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(prev => ({ ...prev, query: false }));
    }
  };

  // API: Get Answer
  const handleGetAnswer = async (question) => {
    setLoading(prev => ({ ...prev, query: true }));
    setQueryResults(null);
    try {
      const response = await fetch(`${API_BASE}/api/query/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await response.json();
      setQueryResults(data);
      return data;
    } catch (error) {
      console.error('Answer request failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(prev => ({ ...prev, query: false }));
    }
  };

  // API: Get Enhanced Answer (GPT-4o RAG)
  const handleGetEnhancedAnswer = async (question, matchCount = 5, matchThreshold = 0.1) => {
    setLoading(prev => ({ ...prev, query: true }));
    setQueryResults(null);
    try {
      const response = await fetch(`${API_BASE}/api/query/enhanced-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, matchCount, matchThreshold })
      });
      const data = await response.json();
      setQueryResults(data);
      return data;
    } catch (error) {
      console.error('Enhanced answer request failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(prev => ({ ...prev, query: false }));
    }
  };

  // API: List Files
  const handleListFiles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ingest/files`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('List files failed:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <div className="app">
      <StatusBar 
        connected={connected} 
        logCount={logs.length}
        serverInfo={serverInfo}
        onClearLogs={clearLogs}
      />
      
      <main className="main-content">
        <div className="panels-container">
          <IngestPanel
            onIngest={handleIngest}
            onClear={handleClearDatabase}
            onListFiles={handleListFiles}
            loading={loading}
          />
          
          <QueryPanel
            onQuery={handleQuery}
            onGetAnswer={handleGetAnswer}
            onGetEnhancedAnswer={handleGetEnhancedAnswer}
            loading={loading}
          />
        </div>
        
        <div className="content-area">
          <LogViewer logs={logs} />
          
          {queryResults && (
            <ResultsDisplay results={queryResults} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { serverConfig } from "./config.js";
import apiRoutes from "./routes/api.js";
import logger from "./logger.js";

// Initialize Express app
const app = express();

// Create HTTP server for both Express and Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Set Socket.io instance in logger for broadcasting
logger.setSocketIO(io);

// ============================================
// Socket.io Connection Handling
// ============================================

io.on("connection", (socket) => {
  logger.info("SOCKET", `Client connected: ${socket.id}`);
  
  // Send log history to newly connected client
  const history = logger.getHistory(100);
  socket.emit("log-history", history);
  
  // Handle disconnect
  socket.on("disconnect", () => {
    logger.info("SOCKET", `Client disconnected: ${socket.id}`);
  });
  
  // Handle clear logs request from client
  socket.on("clear-logs", () => {
    logger.clearHistory();
    logger.info("SOCKET", "Log history cleared by client");
  });
});

// ============================================
// Middleware Configuration
// ============================================

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    // In development, allow all origins
    if (serverConfig.environment === "development") {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (serverConfig.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware - uses new logger
app.use((req, res, next) => {
  logger.request(req.method, req.path);
  next();
});

// ============================================
// Routes
// ============================================

// API routes
app.use("/api", apiRoutes);

// Logs API endpoints
app.get("/api/logs", (req, res) => {
  const count = parseInt(req.query.count) || 100;
  const logs = logger.getHistory(count);
  res.status(200).json({
    success: true,
    count: logs.length,
    logs
  });
});

app.delete("/api/logs", (req, res) => {
  logger.clearHistory();
  res.status(200).json({
    success: true,
    message: "Logs cleared"
  });
});

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    name: "ResearchAI Backend",
    version: "1.0.0",
    status: "running",
    environment: serverConfig.environment,
    apiDocs: "/api",
    healthCheck: "/api/health",
    logsEndpoint: "/api/logs",
    websocket: "Connected via Socket.io"
  });
});

// ============================================
// Error Handling
// ============================================

// 404 handler - for routes that don't exist
app.use((req, res, next) => {
  logger.warning("ROUTER", `Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    availableEndpoints: {
      root: "GET /",
      apiDocs: "GET /api",
      health: "GET /api/health",
      logs: "GET /api/logs"
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("SERVER", `Server Error: ${err.message}`, { stack: err.stack });
  
  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy does not allow access from this origin",
      error: err.message
    });
  }
  
  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body",
      error: err.message
    });
  }
  
  // Generic server error
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: serverConfig.environment === "development" ? err.message : "An unexpected error occurred"
  });
});

// ============================================
// Server Startup
// ============================================

const PORT = serverConfig.port;

httpServer.listen(PORT, () => {
  // Console log for debugging only (server startup)
  console.log(`\n🚀 ResearchAI Backend Server running on port ${PORT}\n`);
  
  // Log startup info via WebSocket
  logger.header("ResearchAI Backend Server");
  logger.info("SERVER", `📡 Server running on port ${PORT}`);
  logger.info("SERVER", `🌐 Environment: ${serverConfig.environment}`);
  logger.info("SERVER", `🔗 Local URL: http://localhost:${PORT}`);
  logger.info("SERVER", `📚 API Docs: http://localhost:${PORT}/api`);
  logger.info("SERVER", `💚 Health Check: http://localhost:${PORT}/api/health`);
  logger.info("SERVER", `📋 Logs API: http://localhost:${PORT}/api/logs`);
  logger.info("SERVER", `🔌 WebSocket: Enabled`);
  logger.separator("─", 60);
  
  logger.info("ENDPOINTS", "Available Endpoints:");
  logger.info("ENDPOINTS", "  GET  /                    - Server info");
  logger.info("ENDPOINTS", "  GET  /api                 - API documentation");
  logger.info("ENDPOINTS", "  GET  /api/health          - Health check");
  logger.info("ENDPOINTS", "  GET  /api/logs            - Get log history");
  logger.info("ENDPOINTS", "  DELETE /api/logs          - Clear logs");
  logger.info("ENDPOINTS", "  POST /api/ingest          - Trigger ingestion");
  logger.info("ENDPOINTS", "  POST /api/ingest/clear    - Clear database");
  logger.info("ENDPOINTS", "  GET  /api/ingest/files    - List files");
  logger.info("ENDPOINTS", "  POST /api/query           - Semantic search");
  logger.info("ENDPOINTS", "  POST /api/query/answer    - Get answer");
  logger.info("ENDPOINTS", "  POST /api/query/by-field  - Search by field");
  logger.info("ENDPOINTS", "  GET  /api/query/by-name/:name - Search by name");
  logger.separator("─", 60);
  
  logger.success("SERVER", "✅ Server ready to accept requests!");
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  logger.warning("SERVER", "SIGTERM received. Shutting down gracefully...");
  httpServer.close(() => {
    logger.info("SERVER", "Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.warning("SERVER", "SIGINT received. Shutting down gracefully...");
  httpServer.close(() => {
    logger.info("SERVER", "Server closed");
    process.exit(0);
  });
});

export default app;
export { io };

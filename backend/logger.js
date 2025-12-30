/**
 * Logger Module with WebSocket Broadcasting
 * Captures all logs and broadcasts them to connected clients
 * while keeping minimal console output for debugging
 */

// Store for WebSocket server reference (set by server.js)
let io = null;

// In-memory log storage (last 1000 logs)
const MAX_LOGS = 1000;
let logHistory = [];

/**
 * Log levels with corresponding icons
 */
const LOG_LEVELS = {
  INFO: { name: 'info', icon: 'ℹ️' },
  SUCCESS: { name: 'success', icon: '✅' },
  ERROR: { name: 'error', icon: '❌' },
  WARNING: { name: 'warning', icon: '⚠️' },
  DEBUG: { name: 'debug', icon: '🔧' },
  PROCESS: { name: 'process', icon: '🔄' },
  DATA: { name: 'data', icon: '📊' },
};

/**
 * Creates a formatted log entry
 * @param {string} level - Log level (INFO, SUCCESS, ERROR, etc.)
 * @param {string} category - Category/module name
 * @param {string} message - Log message
 * @param {object} data - Optional additional data
 * @returns {object} - Formatted log entry
 */
function createLogEntry(level, category, message, data = null) {
  const levelInfo = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    level: levelInfo.name,
    icon: levelInfo.icon,
    category,
    message,
    data,
  };
}

/**
 * Broadcasts log to all connected WebSocket clients
 * @param {object} logEntry - The log entry to broadcast
 */
function broadcast(logEntry) {
  // Store in history
  logHistory.push(logEntry);
  if (logHistory.length > MAX_LOGS) {
    logHistory.shift(); // Remove oldest log
  }

  // Broadcast via WebSocket if available
  if (io) {
    io.emit('log', logEntry);
  }

  // Only console.log in debug mode or for errors
  if (logEntry.level === 'error' || process.env.DEBUG === 'true') {
    console.log(`[${logEntry.level.toUpperCase()}] ${logEntry.category}: ${logEntry.message}`);
  }
}

/**
 * Logger class with methods for different log levels
 */
const logger = {
  /**
   * Set the Socket.io instance for broadcasting
   * @param {object} socketIo - Socket.io server instance
   */
  setSocketIO(socketIo) {
    io = socketIo;
    this.info('LOGGER', 'WebSocket broadcasting enabled');
  },

  /**
   * Get log history
   * @param {number} count - Number of logs to return (default: all)
   * @returns {array} - Log history
   */
  getHistory(count = MAX_LOGS) {
    return logHistory.slice(-count);
  },

  /**
   * Clear log history
   */
  clearHistory() {
    logHistory = [];
    if (io) {
      io.emit('logs-cleared');
    }
  },

  /**
   * Log info message
   */
  info(category, message, data = null) {
    broadcast(createLogEntry('INFO', category, message, data));
  },

  /**
   * Log success message
   */
  success(category, message, data = null) {
    broadcast(createLogEntry('SUCCESS', category, message, data));
  },

  /**
   * Log error message
   */
  error(category, message, data = null) {
    broadcast(createLogEntry('ERROR', category, message, data));
  },

  /**
   * Log warning message
   */
  warning(category, message, data = null) {
    broadcast(createLogEntry('WARNING', category, message, data));
  },

  /**
   * Log debug message
   */
  debug(category, message, data = null) {
    broadcast(createLogEntry('DEBUG', category, message, data));
  },

  /**
   * Log process/progress message
   */
  process(category, message, data = null) {
    broadcast(createLogEntry('PROCESS', category, message, data));
  },

  /**
   * Log data/results message
   */
  data(category, message, data = null) {
    broadcast(createLogEntry('DATA', category, message, data));
  },

  /**
   * Log request (convenience method for API requests)
   */
  request(method, path) {
    const timestamp = new Date().toISOString();
    this.info('REQUEST', `${method} ${path}`, { method, path, timestamp });
  },

  /**
   * Log separator line
   */
  separator(char = '─', length = 50) {
    this.info('SYSTEM', char.repeat(length));
  },

  /**
   * Log box header
   */
  header(title) {
    this.info('SYSTEM', '═'.repeat(60));
    this.info('SYSTEM', `📋 ${title}`);
    this.info('SYSTEM', '═'.repeat(60));
  },

  /**
   * Log pipeline step
   */
  step(stepNum, total, message) {
    this.process('PIPELINE', `Step ${stepNum}/${total}: ${message}`);
  },
};

export default logger;
export { logger, LOG_LEVELS };

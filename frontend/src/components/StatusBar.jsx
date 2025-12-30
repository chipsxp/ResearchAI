/**
 * =============================================================================
 * StatusBar.jsx - Application Header & Status Display Component
 * =============================================================================
 * 
 * PURPOSE:
 * This component serves as the main header bar for the ResearchAI dashboard.
 * It provides at-a-glance status information about the application state,
 * including WebSocket connection status, log counts, and server health.
 * 
 * WHY IS THIS IMPORTANT?
 * The status bar gives users immediate visual feedback about:
 * 1. Whether they're connected to the backend (WebSocket status)
 * 2. How much activity has occurred (log count)
 * 3. Server health status
 * 
 * This is especially important for a real-time application where users need
 * to know if their actions will actually reach the server.
 * 
 * KEY FEATURES:
 * - Application branding (title and icon)
 * - Real-time connection indicator (green dot = connected)
 * - Log count display with quick-clear functionality
 * - Server status display
 * 
 * PROPS (Input from Parent Component):
 * @param {boolean} connected - WebSocket connection state
 * @param {number} logCount - Number of log entries currently displayed
 * @param {Object} serverInfo - Server health information from API
 *   @param {string} serverInfo.status - Server status string (e.g., "OK")
 * @param {Function} onClearLogs - Callback to clear all logs
 * 
 * VISUAL DESIGN:
 * The status bar uses a dark theme with the following layout:
 * 
 * [🧠 ResearchAI Dashboard] [● Connected] -------- [Server Status] [📋 Logs] [Clear]
 *        LEFT SIDE                                       RIGHT SIDE
 * 
 * AUTHOR: ResearchAI Development Team
 * =============================================================================
 */

function StatusBar({ connected, logCount, serverInfo, onClearLogs }) {
  // =========================================================================
  // RENDER - User Interface
  // =========================================================================
  
  /**
   * The StatusBar is structured as a flexbox with two sides:
   * - Left: Application branding and connection status
   * - Right: Server info, log count, and clear button
   * 
   * This layout provides good information hierarchy and keeps
   * the most important status (connection) prominently visible.
   */
  return (
    <header className="status-bar">
      {/* 
        Left Side: Branding & Connection Status
        Contains the application title and WebSocket connection indicator.
      */}
      <div className="status-bar-left">
        {/* 
          Application Title
          The brain emoji represents the AI/intelligence aspect.
          "ResearchAI Dashboard" clearly identifies the application.
        */}
        <div className="status-bar-title">
          <span>🧠</span>
          <span>ResearchAI Dashboard</span>
        </div>
        
        {/* 
          Connection Status Indicator
          Shows whether the frontend is connected to the backend via WebSocket.
          
          Visual States:
          - Green dot + "Connected": WebSocket is active, real-time updates working
          - Gray dot + "Disconnected": No connection, actions may fail
          
          The CSS class 'connected' controls the dot color via styling.
        */}
        <div className="connection-status">
          {/* Status dot - color changes based on connection state */}
          <span className={`status-dot ${connected ? 'connected' : ''}`}></span>
          {/* Status text - provides explicit state description */}
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      {/* 
        Right Side: Server Info, Log Count, & Actions
        Contains server status, log statistics, and the clear button.
      */}
      <div className="status-bar-right">
        {/* 
          Server Status Display
          Shows the current health status of the backend server.
          Only rendered if serverInfo is available (after health check).
          
          The green circle emoji (🟢) indicates healthy status.
          This comes from the /api/health endpoint response.
        */}
        {serverInfo && (
          <span className="log-count" title="Server Status">
            🟢 {serverInfo.status || 'OK'}
          </span>
        )}
        
        {/* 
          Log Count Display
          Shows how many log entries are currently in the viewer.
          Helps users understand the volume of system activity.
          
          Pluralization: "1 log" vs "5 logs" for proper grammar.
        */}
        <span className="log-count">
          📋 {logCount} log{logCount !== 1 ? 's' : ''}
        </span>
        
        {/* 
          Clear Logs Button
          Allows users to clear all logs from the viewer.
          Useful when the log list becomes cluttered or when
          starting a new testing session.
          
          This emits a WebSocket event to clear logs on both
          frontend and backend (for synchronized state).
        */}
        <button 
          className="btn btn-sm btn-secondary" 
          onClick={onClearLogs}
          title="Clear all logs"
        >
          🗑️ Clear
        </button>
      </div>
    </header>
  );
}

export default StatusBar;

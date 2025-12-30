/**
 * =============================================================================
 * LogEntry.jsx - Individual Log Entry Display Component
 * =============================================================================
 * 
 * PURPOSE:
 * This component renders a single log entry row in the log viewer. It displays
 * the timestamp, log level, category, and message in a consistent, readable format.
 * 
 * WHAT ARE LOG ENTRIES?
 * Log entries are records of events that happen in the application. They help
 * developers and users understand what the system is doing, track errors,
 * and debug issues. Each log entry captures:
 * - WHEN: The timestamp of the event
 * - SEVERITY: How important/critical the event is (info, warning, error, etc.)
 * - CATEGORY: What part of the system generated the log
 * - MESSAGE: A human-readable description of what happened
 * 
 * LOG LEVELS EXPLAINED:
 * - INFO: General information about normal operations
 * - SUCCESS: Confirmation that an operation completed successfully
 * - WARNING: Something unexpected happened but didn't cause failure
 * - ERROR: Something went wrong and may need attention
 * - PROCESS: Indicates an ongoing operation or process step
 * - DATA: Information about data operations (queries, inserts, etc.)
 * - DEBUG: Detailed technical information for troubleshooting
 * 
 * PROPS (Input from Parent Component):
 * @param {Object} log - The log entry object containing:
 *   @param {string} log.timestamp - ISO 8601 formatted timestamp
 *   @param {string} log.level - Log severity level (info, success, error, etc.)
 *   @param {string} log.icon - Emoji icon representing the log type
 *   @param {string} log.category - System category that generated the log
 *   @param {string} log.message - Human-readable log message
 * 
 * DESIGN NOTES:
 * - Uses CSS classes based on log level for visual distinction
 * - Timestamps are formatted for local timezone readability
 * - Component is intentionally simple for optimal rendering performance
 * 
 * AUTHOR: ResearchAI Development Team
 * =============================================================================
 */

function LogEntry({ log }) {
  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================
  
  /**
   * formatTime - Converts ISO Timestamp to Human-Readable Format
   * 
   * Takes an ISO 8601 timestamp (like "2024-01-15T10:30:45.000Z") and
   * converts it to a user-friendly time format (like "10:30:45 AM").
   * 
   * This makes logs easier to read at a glance, showing just the time
   * portion rather than the full date-time string.
   * 
   * @param {string} isoString - ISO 8601 formatted timestamp string
   * @returns {string} Formatted time string (e.g., "10:30:45 AM")
   * 
   * EXAMPLE:
   * formatTime("2024-01-15T14:30:45.000Z") → "2:30:45 PM" (in EST timezone)
   */
  const formatTime = (isoString) => {
    try {
      // Create a Date object from the ISO string
      const date = new Date(isoString);
      
      // Convert to locale-specific time string with AM/PM format
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',      // Two-digit hour (01-12)
        minute: '2-digit',    // Two-digit minute (00-59)
        second: '2-digit',    // Two-digit second (00-59)
        hour12: true          // Use 12-hour format with AM/PM
      });
    } catch {
      // If parsing fails, return empty string to avoid breaking the UI
      return '';
    }
  };

  // =========================================================================
  // RENDER - User Interface
  // =========================================================================
  
  /**
   * The log entry renders as a single row with four columns:
   * 
   * [TIMESTAMP] [LEVEL] [CATEGORY] [MESSAGE]
   * 
   * Example rendered output:
   * 10:30:45 AM | ✅ SUCCESS | [INGEST] | Successfully processed 5 files
   * 
   * CSS classes are applied based on log level for color-coding:
   * - .info → blue/neutral
   * - .success → green
   * - .error → red
   * - .warning → yellow/orange
   * - etc.
   */
  return (
    <div className="log-entry">
      {/* 
        Timestamp Column
        Shows when the log event occurred in local time format.
        Helps users track the sequence and timing of events.
      */}
      <span className="log-timestamp">{formatTime(log.timestamp)}</span>
      
      {/* 
        Log Level Badge
        Visual indicator of the log severity.
        The CSS class (log.level) applies appropriate color styling.
        The icon provides quick visual recognition of the log type.
      */}
      <span className={`log-level ${log.level}`}>
        {log.icon} {log.level.toUpperCase()}
      </span>
      
      {/* 
        Category Badge
        Shows which part of the system generated this log.
        Common categories: INGEST, QUERY, SYSTEM, API, etc.
        Helps filter and identify the source of events.
      */}
      <span className="log-category">[{log.category}]</span>
      
      {/* 
        Log Message
        The main content describing what happened.
        This is the most important information for understanding the event.
      */}
      <span className="log-message">{log.message}</span>
    </div>
  );
}

export default LogEntry;

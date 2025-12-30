/**
 * =============================================================================
 * LogViewer.jsx - Real-Time Log Display & Filtering Component
 * =============================================================================
 * 
 * PURPOSE:
 * This component provides a comprehensive log viewing interface with real-time
 * updates, filtering capabilities, and search functionality. It's the central
 * place for monitoring all system activity in the ResearchAI dashboard.
 * 
 * WHY IS THIS IMPORTANT?
 * Real-time logs are essential for understanding what's happening in the system.
 * Whether you're ingesting data, running queries, or debugging issues, the log
 * viewer provides instant visibility into system operations.
 * 
 * KEY FEATURES:
 * 1. Real-Time Updates: Logs stream in via WebSocket as they occur
 * 2. Level Filtering: Filter by log severity (info, error, success, etc.)
 * 3. Text Search: Find specific logs by searching message content
 * 4. Auto-Scroll: Automatically scroll to new logs (can be disabled)
 * 5. Empty State Handling: Helpful messages when no logs are available
 * 
 * PROPS (Input from Parent Component):
 * @param {Array} logs - Array of log entry objects to display
 *   Each log object contains: id, timestamp, level, icon, category, message
 * 
 * HOW FILTERING WORKS:
 * - Level Filter: Shows only logs of selected severity level
 * - Search Filter: Matches against message content and category
 * - Filters work together (AND logic) for precise results
 * 
 * AUTHOR: ResearchAI Development Team
 * =============================================================================
 */

import { useState, useEffect, useRef } from 'react';
import LogEntry from './LogEntry';

/**
 * Available log levels for filtering.
 * 'all' shows every log regardless of level.
 * Other options filter to show only that specific level.
 */
const LOG_LEVELS = ['all', 'info', 'success', 'error', 'warning', 'process', 'data', 'debug'];

function LogViewer({ logs }) {
  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  
  /**
   * filter: Currently selected log level filter.
   * 'all' by default shows every log entry.
   * Setting to a specific level (e.g., 'error') shows only that type.
   */
  const [filter, setFilter] = useState('all');
  
  /**
   * searchQuery: Text search input for finding specific logs.
   * Matches against log messages and categories.
   * Empty string means no text filtering applied.
   */
  const [searchQuery, setSearchQuery] = useState('');
  
  /**
   * autoScroll: Whether to automatically scroll to new logs.
   * True by default for real-time monitoring.
   * Users can disable this if they want to read older logs.
   */
  const [autoScroll, setAutoScroll] = useState(true);
  
  /**
   * logListRef: Reference to the scrollable log container DOM element.
   * Used for programmatic scrolling and detecting user scroll position.
   */
  const logListRef = useRef(null);

  // =========================================================================
  // COMPUTED VALUES - Filtered Logs
  // =========================================================================
  
  /**
   * filteredLogs - Applies Filters to Log Array
   * 
   * This computed value applies both level and search filters to the logs.
   * It runs on every render, but React's reconciliation ensures efficient updates.
   * 
   * Filter Logic:
   * 1. If level filter is not 'all', exclude logs that don't match the level
   * 2. If search query exists, exclude logs that don't contain the search text
   * 3. Both filters must pass for a log to be included (AND logic)
   * 
   * Performance Note: For very large log arrays, consider using useMemo
   * to prevent unnecessary recalculations.
   */
  const filteredLogs = logs.filter(log => {
    // LEVEL FILTER: Check if log matches selected level
    // Skip this check if 'all' is selected (show every level)
    if (filter !== 'all' && log.level !== filter) {
      return false;
    }
    
    // SEARCH FILTER: Check if log contains search query
    // Search is case-insensitive and checks both message and category
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.message?.toLowerCase().includes(query) ||
        log.category?.toLowerCase().includes(query)
      );
    }
    
    // Log passes all filters
    return true;
  });

  // =========================================================================
  // EFFECTS - Side Effects and Lifecycle
  // =========================================================================
  
  /**
   * Auto-Scroll Effect
   * 
   * When new logs arrive and autoScroll is enabled, this effect
   * automatically scrolls the log container to the bottom to show
   * the most recent entries.
   * 
   * Dependencies: filteredLogs (to detect new logs), autoScroll setting
   */
  useEffect(() => {
    if (autoScroll && logListRef.current) {
      // Scroll to the very bottom of the container
      logListRef.current.scrollTop = logListRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================
  
  /**
   * handleScroll - Detects Manual Scrolling to Disable Auto-Scroll
   * 
   * This intelligent handler detects when a user manually scrolls up
   * to read older logs. When they do, it disables auto-scroll so new
   * logs don't interrupt their reading.
   * 
   * When the user scrolls back to the bottom (within 50px), auto-scroll
   * is re-enabled automatically.
   * 
   * This provides a smooth UX: users can read history without interruption,
   * but get automatic updates when they return to the bottom.
   */
  const handleScroll = () => {
    if (logListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logListRef.current;
      
      // Calculate if user is "at the bottom" (within 50px tolerance)
      // This tolerance accounts for minor scroll variations
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      // Enable/disable auto-scroll based on scroll position
      setAutoScroll(isAtBottom);
    }
  };

  // =========================================================================
  // RENDER - User Interface
  // =========================================================================
  
  return (
    <div className="panel log-viewer">
      {/* 
        Panel Header
        Contains the title and auto-scroll toggle checkbox.
      */}
      <div className="panel-header">
        <div className="panel-title">
          <span className="icon">📋</span>
          <span>Live Logs</span>
        </div>
        
        {/* 
          Auto-Scroll Toggle
          Allows users to enable/disable automatic scrolling to new logs.
          Useful when reviewing historical logs without interruption.
        */}
        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input 
            type="checkbox" 
            checked={autoScroll} 
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          Auto-scroll
        </label>
      </div>
      
      <div className="panel-content">
        {/* 
          Filter Controls
          Row of buttons for filtering by log level, plus search input.
          Provides quick access to common filtering operations.
        */}
        <div className="log-filters">
          {/* 
            Level Filter Buttons
            One button per log level plus 'All' option.
            Active button is highlighted with 'active' class.
          */}
          {LOG_LEVELS.map(level => (
            <button
              key={level}
              className={`filter-btn ${filter === level ? 'active' : ''}`}
              onClick={() => setFilter(level)}
            >
              {/* Capitalize first letter for display */}
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
          
          {/* 
            Search Input
            Free-text search across log messages and categories.
            Updates filter results as user types (real-time filtering).
          */}
          <input
            type="text"
            className="log-search"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* 
          Log List Container
          Scrollable container that displays filtered log entries.
          Uses ref for scroll position management and auto-scroll feature.
        */}
        <div 
          className="log-list" 
          ref={logListRef}
          onScroll={handleScroll}
        >
          {/* 
            Conditional Rendering:
            - If no logs match filters, show helpful empty state message
            - Otherwise, render each log entry using the LogEntry component
          */}
          {filteredLogs.length === 0 ? (
            <div className="log-empty">
              {/* Different messages for "no logs yet" vs "no matches" */}
              {logs.length === 0 
                ? 'No logs yet. Trigger an action to see logs here.'
                : 'No logs match your filter criteria.'
              }
            </div>
          ) : (
            /* 
              Render each filtered log entry.
              Uses log.id as the unique key for React's reconciliation.
              LogEntry component handles the display formatting.
            */
            filteredLogs.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default LogViewer;

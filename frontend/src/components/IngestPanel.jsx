/**
 * =============================================================================
 * IngestPanel.jsx - Data Ingestion Control Component
 * =============================================================================
 * 
 * PURPOSE:
 * This component provides the user interface for managing data ingestion into
 * the ResearchAI system. Data ingestion is the process of loading documents
 * (like text files) into a vector database for later semantic searching.
 * 
 * WHAT IS DATA INGESTION?
 * Think of it like adding books to a library's catalog. When you "ingest" data,
 * the system reads your files, breaks them into searchable chunks, converts them
 * into numerical representations (embeddings), and stores them in a database.
 * 
 * KEY FEATURES:
 * - Display statistics about ingested files (count, characters, words)
 * - Start new ingestion processes with optional database clearing
 * - Clear the database to start fresh
 * - Real-time status feedback during operations
 * 
 * PROPS (Input from Parent Component):
 * @param {Function} onIngest - Callback function to trigger data ingestion
 * @param {Function} onClear - Callback function to clear the database
 * @param {Function} onListFiles - Callback function to fetch list of available files
 * @param {Object} loading - Object tracking loading states for various operations
 * 
 * AUTHOR: ResearchAI Development Team
 * =============================================================================
 */

import { useState, useEffect } from 'react';

function IngestPanel({ onIngest, onClear, onListFiles, loading }) {
  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  
  /**
   * clearFirst: Boolean flag to determine if database should be cleared
   * before starting a new ingestion. Default is true for clean ingestion.
   */
  const [clearFirst, setClearFirst] = useState(true);
  
  /**
   * files: Array of file objects containing information about each file
   * in the info/ directory that can be ingested.
   * Each file object contains: filename, characterCount, wordCount
   */
  const [files, setFiles] = useState([]);
  
  /**
   * lastResult: Stores the result of the most recent operation (ingest/clear)
   * Used to display success/error messages to the user.
   */
  const [lastResult, setLastResult] = useState(null);

  // =========================================================================
  // LIFECYCLE & EFFECTS
  // =========================================================================
  
  /**
   * useEffect Hook - Runs on Component Mount
   * 
   * When this component first loads, it automatically fetches the list
   * of available files from the server. This gives users immediate
   * visibility into what data is available for ingestion.
   */
  useEffect(() => {
    fetchFiles();
  }, []); // Empty dependency array = runs only on mount

  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================
  
  /**
   * fetchFiles - Retrieves Available Files from Server
   * 
   * Makes an API call to get the list of text files in the info/ directory.
   * Updates the local state with file information including word/character counts.
   * This helps users understand what data is available before ingestion.
   */
  const fetchFiles = async () => {
    const result = await onListFiles();
    if (result.success) {
      setFiles(result.files || []);
    }
  };

  /**
   * handleIngest - Triggers the Data Ingestion Process
   * 
   * This is the main action button handler. It:
   * 1. Calls the parent's onIngest function with the clearFirst flag
   * 2. Stores the result for displaying success/error feedback
   * 3. If successful, refreshes the file list to show updated stats
   * 
   * The actual ingestion process (handled by the backend):
   * - Reads all .txt files from the info/ directory
   * - Splits text into manageable chunks
   * - Generates vector embeddings using OpenAI
   * - Stores embeddings in Supabase vector database
   */
  const handleIngest = async () => {
    const result = await onIngest(clearFirst);
    setLastResult(result);
    if (result.success) {
      // Refresh file list after successful ingestion to show updated stats
      fetchFiles();
    }
  };

  /**
   * handleClear - Clears All Data from the Database
   * 
   * Removes all previously ingested data from the vector database.
   * Useful when you want to start fresh with new data or remove
   * outdated information.
   * 
   * WARNING: This action is irreversible - all embeddings will be deleted.
   */
  const handleClear = async () => {
    const result = await onClear();
    setLastResult(result);
  };

  // =========================================================================
  // COMPUTED VALUES
  // =========================================================================
  
  /**
   * Calculate aggregate statistics across all files.
   * These totals help users understand the scope of data available.
   * 
   * totalChars: Sum of all characters across all files
   * totalWords: Sum of all words across all files (useful for estimating tokens)
   */
  const totalChars = files.reduce((sum, f) => sum + (f.characterCount || 0), 0);
  const totalWords = files.reduce((sum, f) => sum + (f.wordCount || 0), 0);

  // =========================================================================
  // RENDER - User Interface
  // =========================================================================
  
  return (
    <div className="panel ingest-panel">
      {/* Panel Header with Title and Refresh Button */}
      <div className="panel-header">
        <div className="panel-title">
          <span className="icon">📥</span>
          <span>Ingestion</span>
        </div>
        {/* Refresh button to manually update the file list */}
        <button 
          className="btn btn-sm btn-secondary"
          onClick={fetchFiles}
          title="Refresh file list"
        >
          🔄
        </button>
      </div>
      
      <div className="panel-content">
        {/* 
          Statistics Dashboard
          Displays key metrics about available data at a glance.
          This helps users understand the scope of their data.
        */}
        <div className="ingest-stats">
          {/* File Count - Number of text files available for ingestion */}
          <div className="stat-item">
            <span className="stat-label">📁 Files</span>
            <span className="stat-value">{files.length}</span>
          </div>
          {/* Character Count - Total characters across all files */}
          <div className="stat-item">
            <span className="stat-label">📝 Characters</span>
            <span className="stat-value">{totalChars.toLocaleString()}</span>
          </div>
          {/* Word Count - Total words (helpful for token estimation) */}
          <div className="stat-item">
            <span className="stat-label">📖 Words</span>
            <span className="stat-value">{totalWords.toLocaleString()}</span>
          </div>
          {/* Status Indicator - Shows current operation state */}
          <div className="stat-item">
            <span className="stat-label">📊 Status</span>
            <span className="stat-value" style={{ fontSize: '14px' }}>
              {loading.ingest ? '⏳ Running...' : lastResult?.success ? '✅ Ready' : '⚪ Idle'}
            </span>
          </div>
        </div>

        {/* 
          File List Display
          Shows individual files with their word counts.
          Only rendered when files are available.
        */}
        {files.length > 0 && (
          <div style={{ 
            marginTop: '8px', 
            padding: '8px', 
            background: 'var(--bg-primary)', 
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            <strong style={{ color: 'var(--text-primary)' }}>Files:</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              {files.map((file, index) => (
                <li key={index}>{file.filename} ({file.wordCount} words)</li>
              ))}
            </ul>
          </div>
        )}

        {/* 
          Clear First Checkbox
          When checked, the database will be cleared before ingesting new data.
          This prevents duplicate entries and ensures clean data.
        */}
        <div className="checkbox-group" style={{ marginTop: '12px' }}>
          <input 
            type="checkbox" 
            id="clearFirst"
            checked={clearFirst}
            onChange={(e) => setClearFirst(e.target.checked)}
          />
          <label htmlFor="clearFirst">Clear database before ingestion</label>
        </div>
        
        {/* 
          Action Buttons
          Primary actions for managing the ingestion process.
        */}
        <div className="ingest-actions" style={{ marginTop: '12px' }}>
          {/* Start Ingestion Button - Main action to process files */}
          <button 
            className="btn btn-success"
            onClick={handleIngest}
            disabled={loading.ingest || files.length === 0}
          >
            {loading.ingest ? (
              <>
                <span className="spinner"></span>
                <span>Ingesting...</span>
              </>
            ) : (
              <>🚀 Start Ingestion</>
            )}
          </button>
          
          {/* Clear Database Button - Removes all data from vector store */}
          <button 
            className="btn btn-danger"
            onClick={handleClear}
            disabled={loading.clear}
          >
            {loading.clear ? (
              <>
                <span className="spinner"></span>
                <span>Clearing...</span>
              </>
            ) : (
              <>🗑️ Clear DB</>
            )}
          </button>
        </div>

        {/* 
          Error Display
          Shows error messages when operations fail.
          Helps users understand what went wrong.
        */}
        {lastResult && !lastResult.success && (
          <div className="error-display" style={{ marginTop: '12px' }}>
            ❌ {lastResult.error || lastResult.message || 'Operation failed'}
          </div>
        )}

        {/* 
          Success Display
          Shows detailed statistics after successful ingestion.
          Includes: files processed, chunks created, and duration.
        */}
        {lastResult?.success && lastResult.stats && (
          <div style={{ 
            marginTop: '12px', 
            padding: '8px', 
            background: 'rgba(34, 197, 94, 0.1)', 
            border: '1px solid var(--accent-green)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: 'var(--accent-green)'
          }}>
            ✅ Processed {lastResult.stats.filesProcessed} file(s), 
            created {lastResult.stats.chunksCreated} chunks 
            in {lastResult.stats.duration}
          </div>
        )}
      </div>
    </div>
  );
}

export default IngestPanel;

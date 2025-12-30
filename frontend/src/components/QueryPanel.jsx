/**
 * =============================================================================
 * QueryPanel.jsx - Semantic Search & AI Question Interface
 * =============================================================================
 * 
 * PURPOSE:
 * This component provides the user interface for performing semantic searches
 * and asking AI-powered questions against the ingested data. It's the primary
 * way users interact with and retrieve information from the ResearchAI system.
 * 
 * WHAT IS SEMANTIC SEARCH?
 * Unlike traditional keyword search that matches exact words, semantic search
 * understands the MEANING of your query. For example:
 * - Query: "software development experience"
 * - Will find: "built applications using JavaScript" (semantically related)
 * 
 * This is powered by vector embeddings - numerical representations of text
 * that capture semantic meaning.
 * 
 * THREE SEARCH MODES:
 * 
 * 1. SEARCH MODE:
 *    - Returns a list of matching text chunks ranked by similarity
 *    - Best for: Exploring data, finding specific passages
 *    - Output: Multiple results with similarity scores
 * 
 * 2. ANSWER MODE:
 *    - Returns the single best matching chunk as a direct answer
 *    - Best for: Quick factual lookups
 *    - Output: Single answer with source information
 * 
 * 3. ENHANCED MODE (GPT-4o RAG):
 *    - Uses AI to synthesize a natural language answer from multiple sources
 *    - Best for: Complex questions requiring reasoning across multiple chunks
 *    - Output: AI-generated answer with citations to source documents
 *    - RAG = Retrieval Augmented Generation
 * 
 * PROPS (Input from Parent Component):
 * @param {Function} onQuery - Callback for semantic search operations
 * @param {Function} onGetAnswer - Callback for direct answer mode
 * @param {Function} onGetEnhancedAnswer - Callback for GPT-4o enhanced answers
 * @param {Object} loading - Object tracking loading states
 * 
 * KEY PARAMETERS:
 * - Match Count: How many results to retrieve (1-20)
 * - Match Threshold: Minimum similarity score (0-1, lower = more results)
 * 
 * AUTHOR: ResearchAI Development Team
 * =============================================================================
 */

import { useState } from 'react';

function QueryPanel({ onQuery, onGetAnswer, onGetEnhancedAnswer, loading }) {
  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  
  /**
   * query: The user's search query or question text.
   * This is the main input that gets sent to the backend for processing.
   */
  const [query, setQuery] = useState('');
  
  /**
   * matchCount: Number of results to retrieve.
   * - In Search mode: How many matching chunks to return
   * - In Enhanced mode: How many context sources to use for AI synthesis
   * - Range: 1-20, Default: 5
   */
  const [matchCount, setMatchCount] = useState(5);
  
  /**
   * matchThreshold: Minimum similarity score for results.
   * - Lower values (0.1): More results, potentially less relevant
   * - Higher values (0.8): Fewer results, only highly relevant matches
   * - Range: 0-1, Default: 0.1 (permissive to capture more context)
   * 
   * Technical Note: This is the cosine similarity threshold for vector matching.
   */
  const [matchThreshold, setMatchThreshold] = useState(0.1);
  
  /**
   * mode: Current search mode selection.
   * - 'search': Traditional semantic search returning multiple results
   * - 'answer': Direct answer from best matching chunk
   * - 'enhanced': GPT-4o RAG synthesis (default, most powerful)
   */
  const [mode, setMode] = useState('enhanced');

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================
  
  /**
   * handleSubmit - Processes Form Submission
   * 
   * This is the main action handler that executes when users submit a query.
   * It routes to the appropriate API call based on the current mode.
   * 
   * Flow:
   * 1. Prevent default form submission (page reload)
   * 2. Validate that query is not empty
   * 3. Route to appropriate handler based on mode
   * 
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent page reload on form submit
    
    // Don't submit if query is empty or only whitespace
    if (!query.trim()) return;
    
    // Route to appropriate API handler based on selected mode
    if (mode === 'search') {
      // Semantic search: returns list of matching chunks
      await onQuery(query, matchCount, matchThreshold);
    } else if (mode === 'answer') {
      // Direct answer: returns single best match
      await onGetAnswer(query);
    } else if (mode === 'enhanced') {
      // Enhanced AI answer: GPT-4o synthesizes answer from multiple sources
      await onGetEnhancedAnswer(query, matchCount, matchThreshold);
    }
  };

  // =========================================================================
  // RENDER - User Interface
  // =========================================================================
  
  return (
    <div className="panel query-panel">
      {/* 
        Panel Header
        Contains title and mode selection buttons.
      */}
      <div className="panel-header">
        <div className="panel-title">
          <span className="icon">🔍</span>
          <span>Semantic Search</span>
        </div>
        
        {/* 
          Mode Selection Buttons
          Three mutually exclusive options for different search behaviors.
          The active mode is highlighted with btn-primary styling.
        */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Search Mode: Traditional semantic search */}
          <button 
            className={`btn btn-sm ${mode === 'search' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('search')}
          >
            Search
          </button>
          
          {/* Answer Mode: Direct answer from best match */}
          <button 
            className={`btn btn-sm ${mode === 'answer' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('answer')}
          >
            Answer
          </button>
          
          {/* Enhanced Mode: GPT-4o RAG synthesis (most powerful) */}
          <button 
            className={`btn btn-sm ${mode === 'enhanced' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('enhanced')}
            title="Enhanced answer using GPT-4o"
          >
            🤖 Enhanced
          </button>
        </div>
      </div>
      
      <div className="panel-content">
        {/* 
          Search Form
          Prevents default form submission and handles via JavaScript.
        */}
        <form onSubmit={handleSubmit}>
          {/* 
            Query Input Section
            Main textarea for entering search queries or questions.
            Label changes based on current mode for clarity.
          */}
          <div className="form-group">
            <label className="form-label">
              {/* Dynamic label based on mode */}
              {mode === 'search' ? '🔍 Search Query' : mode === 'enhanced' ? '🤖 Question (GPT-4o)' : '❓ Question'}
            </label>
            <textarea
              className="form-textarea"
              placeholder={mode === 'search' 
                ? 'Enter your search query...' 
                : mode === 'enhanced'
                ? 'Ask a question - GPT-4o will synthesize an answer from your data...'
                : 'Ask a question about your data...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* 
            Advanced Settings Section
            Only shown for Search and Enhanced modes where these parameters apply.
            Answer mode uses fixed parameters (best single match).
          */}
          {(mode === 'search' || mode === 'enhanced') && (
            <div className="query-settings">
              {/* 
                Match Count Slider
                Controls how many results to retrieve.
                For Enhanced mode, this determines context window size.
              */}
              <div className="form-group">
                <label className="form-label">
                  📊 {mode === 'enhanced' ? 'Context Sources' : 'Max Results'}: {matchCount}
                </label>
                <input
                  type="range"
                  className="form-range"
                  min={1}
                  max={20}
                  value={matchCount}
                  onChange={(e) => setMatchCount(parseInt(e.target.value))}
                />
              </div>
              
              {/* 
                Similarity Threshold Slider
                Controls minimum relevance for results.
                Lower = more results (potentially less relevant)
                Higher = fewer results (only highly relevant)
              */}
              <div className="form-group">
                <label className="form-label">
                  🎯 Threshold: {matchThreshold.toFixed(2)}
                </label>
                <input
                  type="range"
                  className="form-range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={matchThreshold}
                  onChange={(e) => setMatchThreshold(parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}
          
          {/* 
            Action Buttons
            Submit button text changes based on mode and loading state.
          */}
          <div className="query-actions">
            {/* Submit Button - Main action */}
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={loading.query || !query.trim()}
            >
              {loading.query ? (
                /* Loading state with spinner */
                <>
                  <span className="spinner"></span>
                  <span>{mode === 'enhanced' ? 'Generating...' : 'Searching...'}</span>
                </>
              ) : mode === 'search' ? (
                <>🔍 Search</>
              ) : mode === 'enhanced' ? (
                <>🤖 Get Enhanced Answer</>
              ) : (
                <>❓ Get Answer</>
              )}
            </button>
            
            {/* Clear Button - Resets the query input */}
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={() => setQuery('')}
              disabled={loading.query}
            >
              Clear
            </button>
          </div>
        </form>
        
        {/* 
          Help Tips Section
          Provides guidance to users on how to get the best results.
          Explains the different modes and parameters.
        */}
        <div style={{ 
          marginTop: '12px', 
          padding: '8px', 
          background: 'var(--bg-primary)', 
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <strong>💡 Tips:</strong>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Use natural language for best results</li>
            <li>Lower threshold = more results (less relevant)</li>
            <li>Answer mode returns the best match directly</li>
            <li><strong>Enhanced mode</strong> uses GPT-4o to synthesize answers with citations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default QueryPanel;

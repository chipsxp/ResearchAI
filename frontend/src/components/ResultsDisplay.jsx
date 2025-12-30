/**
 * =============================================================================
 * ResultsDisplay.jsx - Search Results & AI Answer Display Component
 * =============================================================================
 * 
 * PURPOSE:
 * This component renders the output from search queries and AI-generated answers.
 * It handles three different result types with specialized displays for each:
 * 1. Search Results - List of matching text chunks with similarity scores
 * 2. Basic Answers - Direct answer from best matching chunk
 * 3. Enhanced Answers - AI-synthesized responses with citations (GPT-4o RAG)
 * 
 * WHY DIFFERENT DISPLAY MODES?
 * Each query type returns fundamentally different data:
 * - Search returns multiple ranked results for exploration
 * - Answer returns a single best match for quick lookups
 * - Enhanced returns synthesized AI content with source references
 * 
 * Each display mode is optimized to present that data effectively.
 * 
 * PROPS (Input from Parent Component):
 * @param {Object} results - The query results object containing:
 *   @param {boolean} results.success - Whether the query succeeded
 *   @param {string} results.error - Error message if failed
 *   @param {boolean} results.isEnhanced - Flag for GPT-4o enhanced answers
 *   @param {string} results.answer - Answer text (for answer/enhanced modes)
 *   @param {string} results.query - Original search query
 *   @param {number} results.resultCount - Number of results found
 *   @param {Array} results.results - Array of search result objects
 *   @param {Array} results.sources - Source citations (for enhanced mode)
 *   @param {Object} results.context - Metadata about the response
 * 
 * RESULT TYPES EXPLAINED:
 * 
 * SEARCH RESULTS contain:
 * - rank: Position in results (1 = most relevant)
 * - similarity: Cosine similarity score (0-1)
 * - content: The actual text content
 * - filename: Source file name
 * - metadata: Additional info (name, location, skills, etc.)
 * 
 * ENHANCED ANSWERS contain:
 * - answer: AI-generated natural language response
 * - sources: Array of source references with:
 *   - sourceNumber: Citation number [1], [2], etc.
 *   - filename: Source document name
 *   - similarityPercent: Relevance score
 *   - contentPreview: Snippet of source text
 * - context: Model used, tokens consumed, etc.
 * 
 * AUTHOR: ResearchAI Development Team
 * =============================================================================
 */

import { useState } from 'react';

function ResultsDisplay({ results }) {
  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  
  /**
   * showSources: Controls visibility of source citations in Enhanced mode.
   * Sources are collapsed by default to keep the UI clean.
   * Users can expand to see where the AI got its information.
   */
  const [showSources, setShowSources] = useState(false);

  // =========================================================================
  // EARLY RETURNS - Handle Edge Cases
  // =========================================================================
  
  /**
   * Null Check
   * If no results prop is passed, don't render anything.
   * This happens before the first query is made.
   */
  if (!results) {
    return null;
  }

  /**
   * Error State Display
   * If the query failed, show an error message panel.
   * This provides feedback when something goes wrong.
   */
  if (!results.success) {
    return (
      <div className="panel results-display">
        <div className="panel-header">
          <div className="panel-title">
            <span className="icon">📊</span>
            <span>Results</span>
          </div>
        </div>
        <div className="panel-content">
          <div className="error-display">
            ❌ {results.error || results.message || 'An error occurred'}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RESULT TYPE DETECTION
  // =========================================================================
  
  /**
   * Determine which type of result we're displaying.
   * Each type has its own specialized render section below.
   */
  
  // Check if this is an enhanced answer (GPT-4o RAG synthesis)
  const isEnhanced = results.isEnhanced === true;
  
  // Check if this is a basic answer (single best match)
  // Must have 'answer' field but NOT be enhanced
  const isAnswer = 'answer' in results && !isEnhanced;

  // =========================================================================
  // RENDER: ENHANCED ANSWER (GPT-4o RAG)
  // =========================================================================
  
  /**
   * Enhanced Answer Display
   * 
   * This is the most sophisticated display mode. It shows:
   * 1. The original question for context
   * 2. The AI-generated synthesized answer
   * 3. Collapsible source citations with relevance scores
   * 4. Metadata about the response (model, tokens used)
   * 
   * The sources section allows users to verify the AI's answer
   * by checking the original documents it referenced.
   */
  if (isEnhanced) {
    return (
      <div className="panel results-display enhanced-answer">
        {/* Panel Header with Model Badge and Sources Toggle */}
        <div className="panel-header">
          <div className="panel-title">
            <span className="icon">🤖</span>
            <span>Enhanced Answer (GPT-4o)</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Model Badge - Shows which AI model generated the answer */}
            {results.context?.model && (
              <span style={{ 
                fontSize: '10px', 
                padding: '2px 6px', 
                background: 'var(--accent-primary)', 
                borderRadius: '4px',
                color: 'white'
              }}>
                {results.context.model}
              </span>
            )}
            {/* Sources Toggle Button - Expand/collapse source citations */}
            {results.sources && results.sources.length > 0 && (
              <button 
                className="btn btn-sm btn-secondary"
                onClick={() => setShowSources(!showSources)}
              >
                {showSources ? '📁 Hide Sources' : `📁 Sources (${results.sources.length})`}
              </button>
            )}
          </div>
        </div>
        
        <div className="panel-content">
          {/* 
            Original Question Display
            Reminds user what they asked, providing context for the answer.
          */}
          {results.question && (
            <div style={{ 
              marginBottom: '12px', 
              padding: '8px 12px',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '3px solid var(--accent-primary)'
            }}>
              <strong>❓ Question:</strong> {results.question}
            </div>
          )}
          
          {/* 
            AI-Generated Answer Display
            The main synthesized answer from GPT-4o.
            Preserves whitespace for proper formatting.
          */}
          <div className="answer-display enhanced">
            <div className="answer-label" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '8px'
            }}>
              <span>🤖 AI-Generated Answer</span>
              {/* Show how many sources were used for synthesis */}
              {results.context?.retrievedCount && (
                <span style={{ 
                  fontSize: '10px', 
                  color: 'var(--text-muted)',
                  fontWeight: 'normal'
                }}>
                  (synthesized from {results.context.retrievedCount} source{results.context.retrievedCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            <div className="answer-content" style={{
              whiteSpace: 'pre-wrap',  // Preserve line breaks in the answer
              lineHeight: '1.6',
              padding: '12px',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)'
            }}>
              {results.answer || 'No answer generated.'}
            </div>
          </div>
          
          {/* 
            Source Citations Section (Collapsible)
            Shows the original documents the AI referenced.
            Helps users verify accuracy and explore further.
          */}
          {showSources && results.sources && results.sources.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                marginBottom: '8px',
                color: 'var(--text-secondary)'
              }}>
                📚 Source References:
              </div>
              {/* Render each source citation */}
              {results.sources.map((source, idx) => (
                <div key={idx} className="source-item" style={{
                  padding: '10px',
                  marginBottom: '8px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px'
                }}>
                  {/* Source header with number, filename, and similarity score */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
                      [Source {source.sourceNumber}] 📄 {source.filename}
                    </span>
                    {/* Similarity badge shows relevance score */}
                    <span className="similarity-badge" style={{
                      padding: '2px 6px',
                      background: 'var(--success)',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '10px'
                    }}>
                      {source.similarityPercent}
                    </span>
                  </div>
                  {/* Preview of the source content */}
                  <div style={{ 
                    color: 'var(--text-muted)', 
                    fontSize: '11px',
                    lineHeight: '1.4'
                  }}>
                    {source.contentPreview}
                  </div>
                  {/* Additional metadata tags if available */}
                  {source.metadata && Object.keys(source.metadata).length > 0 && (
                    <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {source.metadata.name && (
                        <span className="metadata-tag" style={{ fontSize: '10px' }}>👤 {source.metadata.name}</span>
                      )}
                      {source.metadata.location && (
                        <span className="metadata-tag" style={{ fontSize: '10px' }}>📍 {source.metadata.location}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Token Usage Display - Shows API consumption */}
          {results.context?.tokensUsed && (
            <div style={{ 
              marginTop: '12px', 
              fontSize: '10px', 
              color: 'var(--text-muted)',
              textAlign: 'right'
            }}>
              Tokens used: {results.context.tokensUsed}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: BASIC ANSWER MODE
  // =========================================================================
  
  /**
   * Basic Answer Display
   * 
   * Shows the single best matching chunk as a direct answer.
   * Simpler than Enhanced mode - just the answer and source info.
   * No AI synthesis, just the most relevant text from the database.
   */
  if (isAnswer) {
    return (
      <div className="panel results-display">
        <div className="panel-header">
          <div className="panel-title">
            <span className="icon">💡</span>
            <span>Answer</span>
          </div>
        </div>
        <div className="panel-content">
          <div className="answer-display">
            <div className="answer-label">Answer</div>
            <div className="answer-content">
              {results.answer || 'No answer found.'}
            </div>
            {/* Source attribution and confidence score */}
            {results.context && (
              <div className="answer-context">
                <strong>Source:</strong> {results.context.source || 'Unknown'} 
                {results.context.similarity && (
                  <> | <strong>Confidence:</strong> {(results.context.similarity * 100).toFixed(1)}%</>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: SEARCH RESULTS LIST
  // =========================================================================
  
  /**
   * Search Results Display
   * 
   * Shows multiple matching chunks ranked by similarity.
   * Each result includes:
   * - Rank badge (#1, #2, etc.)
   * - Similarity percentage
   * - Source filename
   * - Text content
   * - Metadata tags (skills, location, etc.)
   * 
   * This is the default display for semantic search queries.
   */
  
  // Destructure search results data
  const { query, resultCount, results: searchResults } = results;

  return (
    <div className="panel results-display">
      <div className="panel-header">
        <div className="panel-title">
          <span className="icon">📊</span>
          <span>Search Results</span>
        </div>
      </div>
      
      <div className="panel-content">
        {/* 
          Results Summary Header
          Shows the original query and total result count.
        */}
        <div className="results-summary">
          <span className="results-query">
            🔍 "{query}"
          </span>
          <span className="results-count">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </span>
        </div>
        
        {/* 
          Conditional Rendering:
          - If no results, show helpful empty state
          - Otherwise, render each result item
        */}
        {(!searchResults || searchResults.length === 0) ? (
          /* Empty State - No results found */
          <div className="no-results">
            <div className="no-results-icon">🔎</div>
            <p>No results found for your query.</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              Try lowering the threshold or rephrasing your query.
            </p>
          </div>
        ) : (
          /* 
            Result Items List
            Each item shows ranked search result with full details.
          */
          searchResults.map((result) => (
            <div key={result.id || result.rank} className="result-item">
              {/* Result Header: Rank, Similarity, and Source File */}
              <div className="result-header">
                <div className="result-rank">
                  {/* Rank Badge - Position in results */}
                  <span className="rank-badge">#{result.rank}</span>
                  {/* Similarity Badge - Relevance score as percentage */}
                  <span className="similarity-badge">
                    {result.similarityPercent || `${(result.similarity * 100).toFixed(1)}%`}
                  </span>
                </div>
                {/* Source File Name */}
                <span className="result-source">
                  📄 {result.filename || result.metadata?.source_filename || 'Unknown'}
                </span>
              </div>
              
              {/* Result Content - The actual matching text */}
              <div className="result-content">
                {result.content}
              </div>
              
              {/* 
                Metadata Section
                Shows additional information extracted from the document.
                Common metadata: name, location, role, skills, chunk info
              */}
              {result.metadata && Object.keys(result.metadata).length > 0 && (
                <div className="result-metadata">
                  <div className="metadata-tags">
                    {/* Person's name if available */}
                    {result.metadata.name && (
                      <span className="metadata-tag">👤 {result.metadata.name}</span>
                    )}
                    {/* Location if available */}
                    {result.metadata.location && (
                      <span className="metadata-tag">📍 {result.metadata.location}</span>
                    )}
                    {/* Role/job title if available */}
                    {result.metadata.role && (
                      <span className="metadata-tag">💼 {result.metadata.role}</span>
                    )}
                    {/* Chunk position in document */}
                    {result.metadata.chunk_number && (
                      <span className="metadata-tag">
                        📑 Chunk {result.metadata.chunk_number}/{result.metadata.total_chunks}
                      </span>
                    )}
                    {/* Skills tags (show first 3 to avoid clutter) */}
                    {result.metadata.skills?.slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="metadata-tag">🔧 {skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ResultsDisplay;

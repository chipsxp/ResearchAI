import { 
  retrieveInformation, 
  getAnswer, 
  getEnhancedAnswer,
  retrieveByMetadataField,
  retrieveByName 
} from "../retrieveInfo.js";
import logger from "../logger.js";

/**
 * Controller for handling query API requests
 */

/**
 * POST /api/query
 * Performs semantic search on ingested data
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * 
 * Request body:
 * {
 *   query: string (required) - The search query
 *   matchCount: number (optional, default: 5) - Max results to return
 *   matchThreshold: number (optional, default: 0.3) - Minimum similarity score
 *   metadataFilter: object (optional) - Filter by metadata fields
 * }
 */
export async function handleQuery(req, res) {
  logger.header("QUERY REQUEST");
  logger.info("QUERY", "🔍 Received query request");
  
  try {
    const { 
      query, 
      matchCount = 5, 
      matchThreshold = 0.3,
      metadataFilter = null 
    } = req.body || {};
    
    // Validate required fields
    if (!query || typeof query !== 'string' || query.trim() === '') {
      logger.warning("QUERY", "Invalid query: empty or not a string");
      return res.status(400).json({
        success: false,
        message: "Query is required and must be a non-empty string",
        error: "INVALID_QUERY"
      });
    }
    
    logger.info("QUERY", `Query: "${query}"`);
    logger.info("QUERY", `Match count: ${matchCount}, Threshold: ${matchThreshold}`);
    if (metadataFilter) {
      logger.info("QUERY", `Metadata filter: ${JSON.stringify(metadataFilter)}`);
    }
    
    // Perform the semantic search
    const result = await retrieveInformation(
      query.trim(), 
      matchCount, 
      matchThreshold,
      metadataFilter
    );
    
    if (result.error) {
      logger.error("QUERY", `Search failed: ${result.error.message}`);
      return res.status(500).json({
        success: false,
        message: "Search failed",
        error: result.error.message
      });
    }
    
    // Format results for API response
    const formattedResults = result.data?.map((item, index) => ({
      rank: index + 1,
      id: item.id,
      content: item.content,
      similarity: item.similarity,
      similarityPercent: `${(item.similarity * 100).toFixed(1)}%`,
      metadata: item.metadata || {},
      filename: item.metadata?.source_filename || item.filename
    })) || [];
    
    logger.success("QUERY", `Search completed: ${formattedResults.length} result(s) found`, {
      query: query.trim(),
      resultCount: formattedResults.length
    });
    
    res.status(200).json({
      success: true,
      query: query.trim(),
      resultCount: formattedResults.length,
      results: formattedResults
    });
    
  } catch (error) {
    logger.error("QUERY", `Query error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Query failed",
      error: error.message
    });
  }
}

/**
 * POST /api/query/answer
 * Gets a direct answer from the most relevant result
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * 
 * Request body:
 * {
 *   question: string (required) - The question to answer
 * }
 */
export async function handleGetAnswer(req, res) {
  logger.header("ANSWER REQUEST");
  logger.info("QUERY", "❓ Received answer request");
  
  try {
    const { question } = req.body || {};
    
    // Validate required fields
    if (!question || typeof question !== 'string' || question.trim() === '') {
      logger.warning("QUERY", "Invalid question: empty or not a string");
      return res.status(400).json({
        success: false,
        message: "Question is required and must be a non-empty string",
        error: "INVALID_QUESTION"
      });
    }
    
    logger.info("QUERY", `Question: "${question}"`);
    
    // Get answer from most relevant result
    const result = await getAnswer(question.trim());
    
    if (result.error) {
      logger.warning("QUERY", "No relevant information found for question");
      return res.status(404).json({
        success: false,
        message: "No relevant information found",
        error: result.error.message
      });
    }
    
    logger.success("QUERY", "Answer found", {
      similarity: result.context?.similarity,
      source: result.context?.source
    });
    
    res.status(200).json({
      success: true,
      question: question.trim(),
      answer: result.answer,
      context: result.context
    });
    
  } catch (error) {
    logger.error("QUERY", `Answer error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Failed to get answer",
      error: error.message
    });
  }
}

/**
 * POST /api/query/by-field
 * Search filtered by a specific metadata field
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * 
 * Request body:
 * {
 *   query: string (required) - The search query
 *   field: string (required) - The metadata field to filter by
 *   value: string (required) - The value to match
 *   matchCount: number (optional, default: 5) - Max results
 * }
 */
export async function handleQueryByField(req, res) {
  logger.info("QUERY", "🏷️ Received query-by-field request");
  
  try {
    const { query, field, value, matchCount = 5 } = req.body || {};
    
    // Validate required fields
    if (!query || !field || !value) {
      logger.warning("QUERY", "Missing required fields for query-by-field");
      return res.status(400).json({
        success: false,
        message: "Query, field, and value are required",
        error: "MISSING_REQUIRED_FIELDS"
      });
    }
    
    logger.info("QUERY", `Query: "${query}"`);
    logger.info("QUERY", `Filter: ${field} = "${value}"`);
    
    const result = await retrieveByMetadataField(query, field, value, matchCount);
    
    if (result.error) {
      logger.error("QUERY", `Search failed: ${result.error.message}`);
      return res.status(500).json({
        success: false,
        message: "Search failed",
        error: result.error.message
      });
    }
    
    const formattedResults = result.data?.map((item, index) => ({
      rank: index + 1,
      id: item.id,
      content: item.content,
      similarity: item.similarity,
      metadata: item.metadata || {}
    })) || [];
    
    logger.success("QUERY", `Query-by-field completed: ${formattedResults.length} result(s)`);
    
    res.status(200).json({
      success: true,
      query,
      filter: { field, value },
      resultCount: formattedResults.length,
      results: formattedResults
    });
    
  } catch (error) {
    logger.error("QUERY", `Query-by-field error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Query by field failed",
      error: error.message
    });
  }
}

/**
 * GET /api/query/by-name/:name
 * Search for information about a specific name
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function handleQueryByName(req, res) {
  logger.info("QUERY", "👤 Received query-by-name request");
  
  try {
    const { name } = req.params;
    const matchCount = parseInt(req.query.matchCount) || 10;
    
    if (!name || name.trim() === '') {
      logger.warning("QUERY", "Missing name parameter");
      return res.status(400).json({
        success: false,
        message: "Name parameter is required",
        error: "MISSING_NAME"
      });
    }
    
    logger.info("QUERY", `Name: "${name}"`);
    
    const result = await retrieveByName(name.trim(), matchCount);
    
    if (result.error) {
      logger.error("QUERY", `Search failed: ${result.error.message}`);
      return res.status(500).json({
        success: false,
        message: "Search failed",
        error: result.error.message
      });
    }
    
    const formattedResults = result.data?.map((item, index) => ({
      rank: index + 1,
      id: item.id,
      content: item.content,
      similarity: item.similarity,
      metadata: item.metadata || {}
    })) || [];
    
    logger.success("QUERY", `Query-by-name completed: ${formattedResults.length} result(s)`);
    
    res.status(200).json({
      success: true,
      name: name.trim(),
      resultCount: formattedResults.length,
      results: formattedResults
    });
    
  } catch (error) {
    logger.error("QUERY", `Query-by-name error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Query by name failed",
      error: error.message
    });
  }
}

/**
 * POST /api/query/enhanced-answer
 * Gets an enhanced answer using GPT-4o to synthesize retrieved information
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * 
 * Request body:
 * {
 *   question: string (required) - The question to answer
 *   matchCount: number (optional, default: 5) - Max context results to retrieve
 *   matchThreshold: number (optional, default: 0.1) - Minimum similarity score
 * }
 */
export async function handleEnhancedAnswer(req, res) {
  logger.header("ENHANCED ANSWER REQUEST (GPT-4o)");
  logger.info("QUERY", "🤖 Received enhanced answer request");
  
  try {
    const { 
      question,
      matchCount = 5,
      matchThreshold = 0.1
    } = req.body || {};
    
    // Validate required fields
    if (!question || typeof question !== 'string' || question.trim() === '') {
      logger.warning("QUERY", "Invalid question: empty or not a string");
      return res.status(400).json({
        success: false,
        message: "Question is required and must be a non-empty string",
        error: "INVALID_QUESTION"
      });
    }
    
    logger.info("QUERY", `Question: "${question}"`);
    logger.info("QUERY", `Context settings: matchCount=${matchCount}, threshold=${matchThreshold}`);
    
    // Get enhanced answer using GPT-4o
    const result = await getEnhancedAnswer(
      question.trim(),
      matchCount,
      matchThreshold
    );
    
    if (result.error) {
      logger.error("QUERY", `Enhanced answer generation failed: ${result.error.message}`);
      return res.status(500).json({
        success: false,
        message: "Failed to generate enhanced answer",
        error: result.error.message
      });
    }
    
    logger.success("QUERY", "Enhanced answer generated successfully", {
      sourcesUsed: result.sources?.length || 0,
      model: result.context?.model
    });
    
    res.status(200).json({
      success: true,
      question: question.trim(),
      answer: result.answer,
      sources: result.sources,
      context: result.context,
      isEnhanced: true
    });
    
  } catch (error) {
    logger.error("QUERY", `Enhanced answer error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Enhanced answer request failed",
      error: error.message
    });
  }
}

import { runIngestion, clearDatabase, readInfoFiles } from "../ingestInfo.js";
import logger from "../logger.js";

/**
 * Controller for handling ingestion API requests
 */

/**
 * POST /api/ingest
 * Triggers the full ingestion pipeline
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function handleIngest(req, res) {
  logger.header("INGESTION REQUEST");
  logger.info("INGEST", "📥 Received ingest request");
  
  try {
    // Optional: Get clearFirst from request body (defaults to true)
    const { clearFirst = true } = req.body || {};
    
    logger.info("INGEST", `Clear existing data: ${clearFirst}`);
    
    // Run the ingestion pipeline
    const result = await runIngestion(clearFirst);
    
    if (result.success) {
      logger.success("INGEST", `Ingestion completed: ${result.filesProcessed} files, ${result.chunksCreated} chunks`, {
        filesProcessed: result.filesProcessed,
        chunksCreated: result.chunksCreated,
        duration: result.duration
      });
      
      res.status(200).json({
        success: true,
        message: result.message,
        stats: {
          filesProcessed: result.filesProcessed,
          chunksCreated: result.chunksCreated,
          duration: result.duration
        }
      });
    } else {
      logger.error("INGEST", `Ingestion failed: ${result.message}`);
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
    
  } catch (error) {
    logger.error("INGEST", `Ingest error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Ingestion failed",
      error: error.message
    });
  }
}

/**
 * POST /api/ingest/clear
 * Clears all data from the database
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function handleClear(req, res) {
  logger.info("INGEST", "🗑️ Received clear database request");
  
  try {
    const result = await clearDatabase();
    
    if (result.success) {
      logger.success("INGEST", "Database cleared successfully");
      res.status(200).json({
        success: true,
        message: "Database cleared successfully"
      });
    } else {
      logger.error("INGEST", `Failed to clear database: ${result.error?.message}`);
      res.status(500).json({
        success: false,
        message: "Failed to clear database",
        error: result.error?.message
      });
    }
    
  } catch (error) {
    logger.error("INGEST", `Clear error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Clear database failed",
      error: error.message
    });
  }
}

/**
 * GET /api/ingest/files
 * Lists files available for ingestion in the info directory
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function handleListFiles(req, res) {
  logger.info("INGEST", "📁 Received list files request");
  
  try {
    const files = await readInfoFiles();
    
    // Return file metadata without full content
    const fileList = files.map(file => ({
      filename: file.filename,
      characterCount: file.content.length,
      wordCount: file.content.split(/\s+/).length
    }));
    
    logger.data("INGEST", `Found ${files.length} file(s)`, { files: fileList });
    
    res.status(200).json({
      success: true,
      fileCount: files.length,
      files: fileList
    });
    
  } catch (error) {
    logger.error("INGEST", `List files error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Failed to list files",
      error: error.message
    });
  }
}

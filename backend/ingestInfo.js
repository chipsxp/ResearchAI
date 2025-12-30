import { openai, models, supabase } from "./config.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./logger.js";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Array to store all embedded results
let embeddedResults = [];

/**
 * Splits text content into smaller chunks with overlap for better semantic search
 * @param {string} text - The text content to chunk
 * @param {number} chunkSize - Target number of words per chunk (default: 300)
 * @param {number} overlap - Number of overlapping words between chunks (default: 50)
 * @returns {string[]} - Array of text chunks
 */
function chunkText(text, chunkSize = 300, overlap = 50) {
  // Split text by whitespace while preserving structure
  const words = text.split(/\s+/).filter(word => word.length > 0);
  
  // If text is small enough, return as single chunk
  if (words.length <= chunkSize) {
    return [text.trim()];
  }
  
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < words.length) {
    // Get chunk of words
    const endIndex = Math.min(startIndex + chunkSize, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    const chunk = chunkWords.join(' ');
    
    chunks.push(chunk);
    
    // Move start position, accounting for overlap
    startIndex += (chunkSize - overlap);
    
    // Prevent infinite loop if overlap is too large
    if (startIndex <= chunks.length - 1 && overlap >= chunkSize) {
      break;
    }
  }
  
  logger.info("CHUNK", `📄 Split content into ${chunks.length} chunk(s)`);
  return chunks;
}

/**
 * Extracts structured metadata from content using GPT-4o-mini
 * @param {string} content - The text content to extract metadata from
 * @param {string} filename - The source filename
 * @returns {Promise<object>} - Extracted metadata as JSON object
 */
async function extractMetadataWithAI(content, filename) {
  logger.process("METADATA", "🤖 Extracting metadata with AI...");
  
  try {
    const response = await openai.chat.completions.create({
      model: models.chat, // gpt-4o-mini
      messages: [
        {
          role: "system",
          content: `You are a metadata extraction assistant. Analyze the provided text and extract structured metadata.

Return a JSON object with the following fields (only include fields where you find clear information):

- name: Primary name or username mentioned
- full_name: Full legal name if different from name
- aliases: Array of other names, handles, or usernames
- location: Geographic location (state, city, country)
- email: Email address(es)
- role: Job title or professional role
- profession: Broader profession category
- skills: Array of technical skills, programming languages, frameworks
- technologies: Array of technologies, tools, platforms used
- organizations: Array of companies or organizations
- websites: Array of personal or professional websites
- social_profiles: Object with social media profiles (github, linkedin, twitter, etc.)
- topics: Array of main topics or areas of interest
- specializations: Array of areas of expertise or specialization
- achievements: Notable accomplishments or certifications
- projects: Array of notable project names
- summary: Brief 1-2 sentence summary of the person/content

Be accurate and only extract information that is explicitly stated in the text.`
        },
        {
          role: "user",
          content: `Extract metadata from this content:\n\n${content}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 1000
    });

    const extractedMetadata = JSON.parse(response.choices[0].message.content);
    
    // Add system metadata
    const metadata = {
      ...extractedMetadata,
      source_filename: filename,
      file_type: path.extname(filename).slice(1) || 'txt',
      extracted_at: new Date().toISOString(),
      extraction_model: models.chat
    };
    
    logger.success("METADATA", "✓ Metadata extracted successfully");
    
    // Log key fields found
    if (metadata.name) logger.data("METADATA", `→ Name: ${metadata.name}`);
    if (metadata.location) logger.data("METADATA", `→ Location: ${metadata.location}`);
    if (metadata.role) logger.data("METADATA", `→ Role: ${metadata.role}`);
    if (metadata.skills?.length) {
      logger.data("METADATA", `→ Skills: ${metadata.skills.slice(0, 5).join(', ')}${metadata.skills.length > 5 ? '...' : ''}`);
    }
    
    return metadata;
  } catch (error) {
    logger.error("METADATA", `✗ Error extracting metadata: ${error.message}`);
    // Return basic metadata on error
    return {
      source_filename: filename,
      file_type: path.extname(filename).slice(1) || 'txt',
      extracted_at: new Date().toISOString(),
      extraction_error: error.message
    };
  }
}

/**
 * Reads all files from the info directory
 * @returns {Promise<Array<{filename: string, content: string}>>}
 */
async function readInfoFiles() {
  // Updated path: info directory is in parent folder (ResearchAI/info)
  const infoDir = path.join(__dirname, "..", "info");
  const files = [];

  try {
    const fileNames = await fs.readdir(infoDir);

    for (const fileName of fileNames) {
      const filePath = path.join(infoDir, fileName);
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        const content = await fs.readFile(filePath, "utf-8");
        files.push({
          filename: fileName,
          content: content,
        });
        logger.info("FILE", `✓ Read file: ${fileName} (${content.length} characters)`);
      }
    }

    return files;
  } catch (error) {
    logger.error("FILE", `Error reading info directory: ${error.message}`);
    throw error;
  }
}

/**
 * Generates embeddings for the given content using OpenAI
 * @param {string} content - The text content to embed
 * @returns {Promise<number[]>} - The embedding vector
 */
async function generateEmbedding(content) {
  const response = await openai.embeddings.create({
    model: models.embedding,
    input: content,
  });

  return response.data[0].embedding;
}

/**
 * Ingests all files from info directory with chunking and metadata extraction
 * Results are pushed to the embeddedResults array
 * @returns {Promise<Array>} - The embeddedResults array
 */
async function ingestAndEmbed() {
  logger.info("INGEST", "📁 Reading files from info directory...");
  const files = await readInfoFiles();

  logger.info("INGEST", `🔄 Processing ${files.length} file(s) with chunking and metadata extraction...`);

  for (const file of files) {
    logger.header(`Processing: ${file.filename}`);
    logger.separator("─", 50);
    
    try {
      // Step 1: Extract metadata from the entire file content (once per file)
      const fileMetadata = await extractMetadataWithAI(file.content, file.filename);
      
      // Step 2: Chunk the content
      const chunks = chunkText(file.content);
      const totalChunks = chunks.length;
      
      // Step 3: Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkNumber = i + 1;
        
        logger.process("EMBEDDING", `🔢 Generating embedding for chunk ${chunkNumber}/${totalChunks}...`);
        
        const embedding = await generateEmbedding(chunk);
        
        // Combine file metadata with chunk-specific metadata
        const chunkMetadata = {
          ...fileMetadata,
          chunk_index: i,
          chunk_number: chunkNumber,
          total_chunks: totalChunks,
          chunk_size_chars: chunk.length,
          chunk_size_words: chunk.split(/\s+/).length
        };
        
        const result = {
          filename: file.filename,
          content: chunk,
          embedding: embedding,
          metadata: chunkMetadata,
          createdAt: new Date().toISOString(),
        };

        embeddedResults.push(result);
        logger.success("EMBEDDING", `✓ Chunk ${chunkNumber}/${totalChunks} embedded (${embedding.length} dimensions)`);
      }
      
      logger.success("FILE", `✅ Completed: ${file.filename} → ${totalChunks} chunk(s)`);
      
    } catch (error) {
      logger.error("FILE", `✗ Error processing ${file.filename}: ${error.message}`);
    }
  }

  logger.separator("═", 50);
  logger.success("INGEST", `✅ Total embedded chunks: ${embeddedResults.length}`);
  logger.separator("═", 50);
  
  return embeddedResults;
}

/**
 * Clears all records from the embeddedinfo table
 * Useful for re-ingestion
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
async function clearDatabase() {
  logger.info("DATABASE", "🗑️ Clearing existing records from embeddedinfo table...");
  
  try {
    const { error } = await supabase
      .from("embeddedinfo")
      .delete()
      .neq("id", 0); // Delete all records (neq with impossible condition)
    
    if (error) {
      throw error;
    }
    
    logger.success("DATABASE", "✓ Database cleared successfully");
    return { success: true, error: null };
  } catch (error) {
    logger.error("DATABASE", `✗ Error clearing database: ${error.message}`);
    return { success: false, error };
  }
}

/**
 * Inserts all embedded results into Supabase embeddedInfo table
 * @returns {Promise<void>}
 */
async function insertEmbeddedInfoToSupabase() {
  if (embeddedResults.length === 0) {
    logger.warning("DATABASE", "⚠️ No embedded results to insert. Run ingestAndEmbed() first.");
    return;
  }

  logger.info("DATABASE", `📤 Inserting ${embeddedResults.length} record(s) into Supabase...`);

  let successCount = 0;
  let errorCount = 0;

  for (const result of embeddedResults) {
    try {
      const { error } = await supabase
        .from("embeddedinfo")
        .insert({
          filename: result.filename,
          content: result.content,
          embedding: result.embedding,
          metadata: result.metadata, // Now includes AI-extracted metadata
          created_at: result.createdAt,
        });

      if (error) {
        throw error;
      }

      successCount++;
      const chunkInfo = result.metadata?.chunk_number 
        ? ` (chunk ${result.metadata.chunk_number}/${result.metadata.total_chunks})`
        : '';
      logger.success("DATABASE", `✓ Inserted: ${result.filename}${chunkInfo}`);
    } catch (error) {
      errorCount++;
      logger.error("DATABASE", `✗ Error inserting ${result.filename}: ${error.message}`);
    }
  }

  logger.separator("═", 50);
  logger.success("DATABASE", `✅ Insertion complete: ${successCount} succeeded, ${errorCount} failed`);
  logger.separator("═", 50);
}

/**
 * Main function to run the full ingestion pipeline
 * @param {boolean} clearFirst - Whether to clear the database before ingestion (default: true)
 * @returns {Promise<object>} - Returns stats about the ingestion
 */
async function runIngestion(clearFirst = true) {
  const startTime = Date.now();
  
  // Reset embeddedResults for fresh ingestion
  embeddedResults = [];
  
  try {
    logger.header("INGESTION PIPELINE");
    logger.info("PIPELINE", "🚀 Starting ingestion pipeline...");
    
    logger.info("PIPELINE", "Pipeline Steps:");
    logger.step(1, 6, "Clear existing data (optional)");
    logger.step(2, 6, "Read files from info directory");
    logger.step(3, 6, "Extract metadata using GPT-4o-mini");
    logger.step(4, 6, "Chunk content into smaller pieces");
    logger.step(5, 6, "Generate embeddings for each chunk");
    logger.step(6, 6, "Insert into Supabase database");

    // Step 1: Optionally clear existing data
    if (clearFirst) {
      await clearDatabase();
    }

    // Step 2-5: Read files, extract metadata, chunk, and generate embeddings
    await ingestAndEmbed();

    // Step 6: Insert into Supabase
    await insertEmbeddedInfoToSupabase();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    logger.success("PIPELINE", "🎉 Ingestion pipeline completed successfully!");
    
    // Summary
    const filesProcessed = new Set(embeddedResults.map(r => r.filename)).size;
    const chunksCreated = embeddedResults.length;
    
    logger.header("SUMMARY");
    logger.data("SUMMARY", `• Files processed: ${filesProcessed}`);
    logger.data("SUMMARY", `• Total chunks created: ${chunksCreated}`);
    logger.data("SUMMARY", `• Metadata extracted: Yes (GPT-4o-mini)`);
    logger.data("SUMMARY", `• Duration: ${duration}s`);
    
    return {
      success: true,
      filesProcessed,
      chunksCreated,
      duration: `${duration}s`,
      message: "Ingestion completed successfully"
    };
    
  } catch (error) {
    logger.error("PIPELINE", `❌ Ingestion pipeline failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      message: "Ingestion failed"
    };
  }
}

// Export functions for external use
export {
  readInfoFiles,
  generateEmbedding,
  extractMetadataWithAI,
  chunkText,
  clearDatabase,
  ingestAndEmbed,
  insertEmbeddedInfoToSupabase,
  runIngestion,
  embeddedResults,
};

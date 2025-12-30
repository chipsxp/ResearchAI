import { openai, models, supabase } from "./config.js";
import fs from "fs/promises";
import path from "path";

// Array to store all embedded results
const embeddedResults = [];

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
  
  console.log(`  📄 Split content into ${chunks.length} chunk(s)`);
  return chunks;
}

/**
 * Extracts structured metadata from content using GPT-4o-mini
 * @param {string} content - The text content to extract metadata from
 * @param {string} filename - The source filename
 * @returns {Promise<object>} - Extracted metadata as JSON object
 */
async function extractMetadataWithAI(content, filename) {
  console.log(`  🤖 Extracting metadata with AI...`);
  
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
    
    console.log(`  ✓ Metadata extracted successfully`);
    
    // Log key fields found
    if (metadata.name) console.log(`    → Name: ${metadata.name}`);
    if (metadata.location) console.log(`    → Location: ${metadata.location}`);
    if (metadata.role) console.log(`    → Role: ${metadata.role}`);
    if (metadata.skills?.length) console.log(`    → Skills: ${metadata.skills.slice(0, 5).join(', ')}${metadata.skills.length > 5 ? '...' : ''}`);
    
    return metadata;
  } catch (error) {
    console.error(`  ✗ Error extracting metadata: ${error.message}`);
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
  const infoDir = path.join(process.cwd(), "info");
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
        console.log(`✓ Read file: ${fileName} (${content.length} characters)`);
      }
    }

    return files;
  } catch (error) {
    console.error("Error reading info directory:", error.message);
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
  console.log("\n📁 Reading files from info directory...\n");
  const files = await readInfoFiles();

  console.log(`\n🔄 Processing ${files.length} file(s) with chunking and metadata extraction...\n`);

  for (const file of files) {
    console.log(`\n📄 Processing: ${file.filename}`);
    console.log("─".repeat(50));
    
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
        
        console.log(`  🔢 Generating embedding for chunk ${chunkNumber}/${totalChunks}...`);
        
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
        console.log(`  ✓ Chunk ${chunkNumber}/${totalChunks} embedded (${embedding.length} dimensions)`);
      }
      
      console.log(`  ✅ Completed: ${file.filename} → ${totalChunks} chunk(s)`);
      
    } catch (error) {
      console.error(`  ✗ Error processing ${file.filename}:`, error.message);
    }
  }

  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Total embedded chunks: ${embeddedResults.length}`);
  console.log(`${"═".repeat(50)}\n`);
  
  return embeddedResults;
}

/**
 * Clears all records from the embeddedinfo table
 * Useful for re-ingestion
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
async function clearDatabase() {
  console.log("\n🗑️  Clearing existing records from embeddedinfo table...\n");
  
  try {
    const { error } = await supabase
      .from("embeddedinfo")
      .delete()
      .neq("id", 0); // Delete all records (neq with impossible condition)
    
    if (error) {
      throw error;
    }
    
    console.log("✓ Database cleared successfully");
    return { success: true, error: null };
  } catch (error) {
    console.error("✗ Error clearing database:", error.message);
    return { success: false, error };
  }
}

/**
 * Inserts all embedded results into Supabase embeddedInfo table
 * @returns {Promise<void>}
 */
async function insertEmbeddedInfoToSupabase() {
  if (embeddedResults.length === 0) {
    console.log("⚠️ No embedded results to insert. Run ingestAndEmbed() first.");
    return;
  }

  console.log(`\n📤 Inserting ${embeddedResults.length} record(s) into Supabase...\n`);

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
      console.log(`✓ Inserted: ${result.filename}${chunkInfo}`);
    } catch (error) {
      errorCount++;
      console.error(`✗ Error inserting ${result.filename}:`, error.message);
    }
  }

  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Insertion complete: ${successCount} succeeded, ${errorCount} failed`);
  console.log(`${"═".repeat(50)}\n`);
}

/**
 * Main function to run the full ingestion pipeline
 * @param {boolean} clearFirst - Whether to clear the database before ingestion (default: true)
 */
async function runIngestion(clearFirst = true) {
  try {
    console.log("🚀 Starting ingestion pipeline...\n");
    console.log("Pipeline Steps:");
    console.log("  1. Clear existing data (optional)");
    console.log("  2. Read files from info directory");
    console.log("  3. Extract metadata using GPT-4o-mini");
    console.log("  4. Chunk content into smaller pieces");
    console.log("  5. Generate embeddings for each chunk");
    console.log("  6. Insert into Supabase database");
    console.log("");

    // Step 1: Optionally clear existing data
    if (clearFirst) {
      await clearDatabase();
    }

    // Step 2-5: Read files, extract metadata, chunk, and generate embeddings
    await ingestAndEmbed();

    // Step 6: Insert into Supabase
    await insertEmbeddedInfoToSupabase();

    console.log("\n🎉 Ingestion pipeline completed successfully!");
    
    // Summary
    console.log("\n📊 Summary:");
    console.log(`  • Files processed: ${new Set(embeddedResults.map(r => r.filename)).size}`);
    console.log(`  • Total chunks created: ${embeddedResults.length}`);
    console.log(`  • Metadata extracted: Yes (GPT-4o-mini)`);
    
  } catch (error) {
    console.error("\n❌ Ingestion pipeline failed:", error.message);
    process.exit(1);
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

// Run if executed directly
runIngestion();

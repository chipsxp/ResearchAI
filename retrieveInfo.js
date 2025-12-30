import { openai, models, supabase } from "./config.js";

/**
 * Generates an embedding vector for a query string
 * @param {string} query - The user's query text
 * @returns {Promise<number[]>} - The embedding vector (1536 dimensions)
 */
async function generateQueryEmbedding(query) {
  const response = await openai.embeddings.create({
    model: models.embedding,
    input: query,
  });

  return response.data[0].embedding;
}

/**
 * Retrieves relevant information from the database using similarity search
 * @param {string} userQuery - The user's query text
 * @param {number} matchCount - Maximum number of results to return (default: 5)
 * @param {number} matchThreshold - Minimum similarity score (default: 0.1, lowered from 0.3)
 * @param {object|null} metadataFilter - Optional metadata filter for narrowing results
 * @returns {Promise<{data: Array|null, error: Error|null, queryEmbedding: number[], matchCount: number}>}
 */
async function retrieveInformation(
  userQuery, 
  matchCount = 5, 
  matchThreshold = 0.3,
  metadataFilter = null
) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🔍 SEMANTIC SEARCH`);
  console.log(`${"═".repeat(60)}`);
  console.log(`📝 Query: "${userQuery}"`);
  console.log(`⚙️  Settings: max_results=${matchCount}, threshold=${matchThreshold}`);
  if (metadataFilter) {
    console.log(`🏷️  Metadata filter: ${JSON.stringify(metadataFilter)}`);
  }
  console.log(`${"─".repeat(60)}\n`);

  try {
    // Generate embedding for the user query
    console.log(`🧠 Generating query embedding...`);
    const queryEmbedding = await generateQueryEmbedding(userQuery);
    console.log(`✓ Embedding generated (${queryEmbedding.length} dimensions)\n`);

    // Build RPC parameters
    const rpcParams = {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      match_threshold: matchThreshold,
    };
    
    // Only add filter if provided
    if (metadataFilter) {
      rpcParams.filter = metadataFilter;
    }

    // Call the match_information function via Supabase RPC
    console.log(`🔄 Searching database for similar content...\n`);
    const { data, error } = await supabase.rpc("match_information", rpcParams);

    if (error) {
      console.error("✗ Error during similarity search:", error.message);
      return { data: null, error, queryEmbedding, matchCount };
    }

    // Log results
    if (data && data.length > 0) {
      console.log(`${"─".repeat(60)}`);
      console.log(`✅ RESULTS FOUND: ${data.length} matching chunk(s)`);
      console.log(`${"─".repeat(60)}\n`);
      
      data.forEach((result, index) => {
        const similarity = (result.similarity * 100).toFixed(1);
        const preview = result.content.substring(0, 100).replace(/\n/g, ' ');
        
        console.log(`📄 Result ${index + 1}:`);
        console.log(`   Similarity: ${similarity}%`);
        console.log(`   Content: "${preview}..."`);
        
        // Log key metadata if available
        if (result.metadata) {
          const meta = result.metadata;
          if (meta.name) console.log(`   Name: ${meta.name}`);
          if (meta.location) console.log(`   Location: ${meta.location}`);
          if (meta.source_filename) console.log(`   Source: ${meta.source_filename}`);
          if (meta.chunk_number) console.log(`   Chunk: ${meta.chunk_number}/${meta.total_chunks}`);
        }
        console.log('');
      });
    } else {
      console.log(`${"─".repeat(60)}`);
      console.log(`⚠️  NO RESULTS FOUND`);
      console.log(`${"─".repeat(60)}`);
      console.log(`\nTips to improve results:`);
      console.log(`  • Try lowering the match_threshold (currently ${matchThreshold})`);
      console.log(`  • Rephrase your query to be more similar to the stored content`);
      console.log(`  • Check if data has been ingested into the database\n`);
    }

    return {
      data,
      error,
      queryEmbedding,
      matchCount,
    };
  } catch (error) {
    console.error("✗ Error generating embedding:", error.message);
    return {
      data: null,
      error,
      queryEmbedding: null,
      matchCount,
    };
  }
}

/**
 * Retrieves information filtered by a specific metadata field
 * Useful for queries like "find all developers in Florida"
 * @param {string} userQuery - The user's query text
 * @param {string} field - The metadata field to filter by (e.g., "location")
 * @param {string} value - The value to match (e.g., "Florida")
 * @param {number} matchCount - Maximum number of results (default: 5)
 * @returns {Promise<object>}
 */
async function retrieveByMetadataField(userQuery, field, value, matchCount = 5) {
  const metadataFilter = { [field]: value };
  return retrieveInformation(userQuery, matchCount, 0.0, metadataFilter);
}

/**
 * Retrieves all information related to a specific person/name
 * @param {string} name - The name to search for
 * @param {number} matchCount - Maximum number of results (default: 10)
 * @returns {Promise<object>}
 */
async function retrieveByName(name, matchCount = 10) {
  const metadataFilter = { name: name };
  return retrieveInformation(`Information about ${name}`, matchCount, 0.0, metadataFilter);
}

/**
 * Gets a simple answer by combining retrieval with the most relevant result
 * @param {string} question - The user's question
 * @returns {Promise<{answer: string|null, context: object|null, error: Error|null}>}
 */
async function getAnswer(question) {
  const result = await retrieveInformation(question, 3, 0.1);
  
  if (result.error || !result.data || result.data.length === 0) {
    return {
      answer: null,
      context: null,
      error: result.error || new Error("No relevant information found"),
    };
  }

  // Return the most relevant content as the answer context
  const bestMatch = result.data[0];
  
  return {
    answer: bestMatch.content,
    context: {
      similarity: bestMatch.similarity,
      metadata: bestMatch.metadata,
      source: bestMatch.metadata?.source_filename || "unknown",
    },
    error: null,
  };
}

// Export functions for external use
export { 
  generateQueryEmbedding, 
  retrieveInformation,
  retrieveByMetadataField,
  retrieveByName,
  getAnswer 
};

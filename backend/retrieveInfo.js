import { openai, models, supabase } from "./config.js";
import logger from "./logger.js";

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
  matchThreshold = 0.1,
  metadataFilter = null
) {
  logger.separator("═", 60);
  logger.header("SEMANTIC SEARCH");
  logger.data("SEARCH", `📝 Query: "${userQuery}"`);
  logger.data("SEARCH", `⚙️ Settings: max_results=${matchCount}, threshold=${matchThreshold}`);
  if (metadataFilter) {
    logger.data("SEARCH", `🏷️ Metadata filter: ${JSON.stringify(metadataFilter)}`);
  }
  logger.separator("─", 60);

  try {
    // Generate embedding for the user query
    logger.process("SEARCH", "🧠 Generating query embedding...");
    const queryEmbedding = await generateQueryEmbedding(userQuery);
    logger.success("SEARCH", `✓ Embedding generated (${queryEmbedding.length} dimensions)`);

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
    logger.process("SEARCH", "🔄 Searching database for similar content...");
    const { data, error } = await supabase.rpc("match_information", rpcParams);

    if (error) {
      logger.error("SEARCH", `✗ Error during similarity search: ${error.message}`);
      return { data: null, error, queryEmbedding, matchCount };
    }

    // Log results
    if (data && data.length > 0) {
      logger.separator("─", 60);
      logger.success("SEARCH", `✅ RESULTS FOUND: ${data.length} matching chunk(s)`);
      logger.separator("─", 60);
      
      data.forEach((result, index) => {
        const similarity = (result.similarity * 100).toFixed(1);
        const preview = result.content.substring(0, 100).replace(/\n/g, ' ');
        
        logger.data("RESULT", `📄 Result ${index + 1}:`);
        logger.data("RESULT", `   Similarity: ${similarity}%`);
        logger.data("RESULT", `   Content: "${preview}..."`);
        
        // Log key metadata if available
        if (result.metadata) {
          const meta = result.metadata;
          if (meta.name) logger.data("RESULT", `   Name: ${meta.name}`);
          if (meta.location) logger.data("RESULT", `   Location: ${meta.location}`);
          if (meta.source_filename) logger.data("RESULT", `   Source: ${meta.source_filename}`);
          if (meta.chunk_number) logger.data("RESULT", `   Chunk: ${meta.chunk_number}/${meta.total_chunks}`);
        }
      });
    } else {
      logger.separator("─", 60);
      logger.warning("SEARCH", "⚠️ NO RESULTS FOUND");
      logger.separator("─", 60);
      logger.info("SEARCH", "Tips to improve results:");
      logger.info("SEARCH", `  • Try lowering the match_threshold (currently ${matchThreshold})`);
      logger.info("SEARCH", "  • Rephrase your query to be more similar to the stored content");
      logger.info("SEARCH", "  • Check if data has been ingested into the database");
    }

    return {
      data,
      error,
      queryEmbedding,
      matchCount,
    };
  } catch (error) {
    logger.error("SEARCH", `✗ Error generating embedding: ${error.message}`);
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
  
  logger.success("ANSWER", `Found answer with ${(bestMatch.similarity * 100).toFixed(1)}% similarity`);
  
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

/**
 * Constructs a comprehensive prompt from query and retrieved information
 * @param {string} question - The user's question
 * @param {Array} retrievedResults - Array of retrieved results with content and metadata
 * @returns {string} - Formatted context string
 */
function constructPromptContext(question, retrievedResults) {
  let contextString = "";
  
  retrievedResults.forEach((result, index) => {
    const similarity = (result.similarity * 100).toFixed(1);
    const source = result.metadata?.source_filename || "Unknown source";
    
    contextString += `\n[Source ${index + 1}: ${source} (${similarity}% relevance)]\n`;
    contextString += `Content: ${result.content}\n`;
    
    // Include relevant metadata
    if (result.metadata) {
      const meta = result.metadata;
      const metaParts = [];
      
      if (meta.name) metaParts.push(`Name: ${meta.name}`);
      if (meta.location) metaParts.push(`Location: ${meta.location}`);
      if (meta.role) metaParts.push(`Role: ${meta.role}`);
      if (meta.skills && Array.isArray(meta.skills)) {
        metaParts.push(`Skills: ${meta.skills.join(", ")}`);
      }
      if (meta.chunk_number && meta.total_chunks) {
        metaParts.push(`Chunk: ${meta.chunk_number}/${meta.total_chunks}`);
      }
      
      if (metaParts.length > 0) {
        contextString += `Metadata: ${metaParts.join(" | ")}\n`;
      }
    }
    
    contextString += "---\n";
  });
  
  return contextString;
}

/**
 * Gets an enhanced answer using GPT-4o to synthesize retrieved information
 * @param {string} question - The user's question
 * @param {number} matchCount - Maximum number of results to retrieve (default: 5)
 * @param {number} matchThreshold - Minimum similarity score (default: 0.1)
 * @returns {Promise<{answer: string|null, sources: Array|null, context: object|null, error: Error|null}>}
 */
async function getEnhancedAnswer(question, matchCount = 5, matchThreshold = 0.1) {
  logger.separator("═", 60);
  logger.header("ENHANCED ANSWER (GPT-4o)");
  logger.data("ENHANCED", `📝 Question: "${question}"`);
  logger.separator("─", 60);

  try {
    // Step 1: Retrieve relevant information
    logger.process("ENHANCED", "🔍 Retrieving relevant information...");
    const result = await retrieveInformation(question, matchCount, matchThreshold);
    
    if (result.error || !result.data || result.data.length === 0) {
      logger.warning("ENHANCED", "⚠️ No relevant information found in knowledge base");
      return {
        answer: "I couldn't find any relevant information in the knowledge base to answer your question. Please try rephrasing your question or ensure the relevant data has been ingested.",
        sources: [],
        context: { retrievedCount: 0 },
        error: null,
      };
    }
    
    logger.success("ENHANCED", `✓ Retrieved ${result.data.length} relevant chunk(s)`);
    
    // Step 2: Construct the prompt with context
    logger.process("ENHANCED", "📝 Constructing prompt with context...");
    const contextString = constructPromptContext(question, result.data);
    
    const systemPrompt = `You are a knowledgeable research assistant with access to a specialized knowledge base. 
Your role is to provide comprehensive, accurate answers based on the retrieved information.

Guidelines:
- Synthesize information from multiple sources when available
- Always cite your sources using the format [Source X]
- If information is incomplete or unclear, acknowledge the limitations
- Provide clear, well-structured responses
- Use bullet points or numbered lists for complex information
- If the retrieved information doesn't fully answer the question, say so
- Be concise but thorough`;

    const userPrompt = `Based on the following retrieved information from the knowledge base, please answer the user's question.

## Retrieved Context:
${contextString}

## User's Question:
${question}

## Instructions:
1. Analyze all retrieved information carefully
2. Synthesize a comprehensive answer
3. Cite sources using [Source X] format
4. Acknowledge if information is incomplete
5. Be accurate and helpful`;

    // Step 3: Call GPT-4o for enhanced answer generation
    logger.process("ENHANCED", "🤖 Generating answer with GPT-4o...");
    
    const completion = await openai.chat.completions.create({
      model: models.chatAdvanced,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
    
    const generatedAnswer = completion.choices[0]?.message?.content;
    
    if (!generatedAnswer) {
      logger.error("ENHANCED", "✗ No response generated from GPT-4o");
      return {
        answer: null,
        sources: null,
        context: null,
        error: new Error("Failed to generate answer from GPT-4o"),
      };
    }
    
    // Step 4: Format sources for response
    const sources = result.data.map((item, index) => ({
      sourceNumber: index + 1,
      filename: item.metadata?.source_filename || "Unknown",
      similarity: item.similarity,
      similarityPercent: `${(item.similarity * 100).toFixed(1)}%`,
      contentPreview: item.content.substring(0, 200) + (item.content.length > 200 ? "..." : ""),
      metadata: item.metadata || {},
    }));
    
    logger.separator("─", 60);
    logger.success("ENHANCED", "✅ Enhanced answer generated successfully");
    logger.data("ENHANCED", `📊 Sources used: ${sources.length}`);
    logger.data("ENHANCED", `📝 Answer length: ${generatedAnswer.length} characters`);
    logger.separator("═", 60);
    
    return {
      answer: generatedAnswer,
      sources: sources,
      context: {
        retrievedCount: result.data.length,
        model: models.chatAdvanced,
        tokensUsed: completion.usage?.total_tokens || null,
      },
      error: null,
    };
    
  } catch (error) {
    logger.error("ENHANCED", `✗ Error generating enhanced answer: ${error.message}`);
    return {
      answer: null,
      sources: null,
      context: null,
      error: error,
    };
  }
}

// Export functions for external use
export { 
  generateQueryEmbedding, 
  retrieveInformation,
  retrieveByMetadataField,
  retrieveByName,
  getAnswer,
  getEnhancedAnswer
};

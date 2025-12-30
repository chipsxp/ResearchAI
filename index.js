import { retrieveInformation } from "./retrieveInfo.js";

// User query to search for relevant information
const userQuery = "What state is chipsxp from?";

/**
 * Main function to retrieve and display information
 */
async function main() {
  console.log("🚀 Starting information retrieval...");
  console.log("━".repeat(50));

  // Retrieve information based on user query
  const { data, error, queryEmbedding, matchCount } = await retrieveInformation(userQuery, 5);

  // Handle errors
  if (error) {
    console.error("\n❌ Retrieval failed:", error.message);
    process.exit(1);
  }

  // Display results
  console.log("━".repeat(50));
  console.log(`📊 Retrieved Information for: "${userQuery}"`);
  console.log("━".repeat(50));

  if (!data || data.length === 0) {
    console.log("\n⚠️ No matching information found.");
  } else {
    data.forEach((match, index) => {
      console.log(`\n📌 Match ${index + 1} (Similarity: ${(match.similarity * 100).toFixed(2)}%):`);
      console.log("─".repeat(40));
      console.log(`ID: ${match.id}`);
      console.log(`Content Preview: ${match.content.substring(0, 200)}...`);
      if (match.metadata) {
        console.log(`Metadata: ${JSON.stringify(match.metadata)}`);
      }
    });

    console.log("\n" + "━".repeat(50));
    console.log(`✅ Total matches: ${data.length}`);
  }

  // Display embedding info
  if (queryEmbedding) {
    console.log(`📏 Query embedding dimensions: ${queryEmbedding.length}`);
  }
  console.log(`🔢 Match count requested: ${matchCount}`);
  console.log("━".repeat(50));
}

// Run the main function
main();

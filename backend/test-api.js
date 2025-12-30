/**
 * Test script for ResearchAI API endpoints
 * Run with: node test-api.js
 */

const BASE_URL = "http://localhost:5000";

async function testAPI() {
  console.log("🧪 Testing ResearchAI API\n");
  console.log("═".repeat(50));

  // Test 1: Health check
  console.log("\n📋 Test 1: Health Check");
  console.log("─".repeat(30));
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log("Status:", healthRes.status);
    console.log("Response:", JSON.stringify(healthData, null, 2));
    console.log("✅ Health check passed!");
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
  }

  // Test 2: List files
  console.log("\n📋 Test 2: List Files");
  console.log("─".repeat(30));
  try {
    const filesRes = await fetch(`${BASE_URL}/api/ingest/files`);
    const filesData = await filesRes.json();
    console.log("Status:", filesRes.status);
    console.log("Response:", JSON.stringify(filesData, null, 2));
    console.log("✅ List files passed!");
  } catch (error) {
    console.log("❌ List files failed:", error.message);
  }

  // Test 3: Query endpoint
  console.log("\n📋 Test 3: Query Endpoint");
  console.log("─".repeat(30));
  try {
    const queryRes = await fetch(`${BASE_URL}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: "What skills does the developer have?",
        matchCount: 3
      })
    });
    const queryData = await queryRes.json();
    console.log("Status:", queryRes.status);
    console.log("Response:", JSON.stringify(queryData, null, 2));
    if (queryData.success) {
      console.log("✅ Query endpoint passed!");
    } else {
      console.log("⚠️  Query returned:", queryData.message);
    }
  } catch (error) {
    console.log("❌ Query failed:", error.message);
  }

  // Test 4: API documentation
  console.log("\n📋 Test 4: API Documentation");
  console.log("─".repeat(30));
  try {
    const docsRes = await fetch(`${BASE_URL}/api`);
    const docsData = await docsRes.json();
    console.log("Status:", docsRes.status);
    console.log("API Name:", docsData.name);
    console.log("Version:", docsData.version);
    console.log("Endpoints available:", Object.keys(docsData.endpoints || {}).length);
    console.log("✅ API docs passed!");
  } catch (error) {
    console.log("❌ API docs failed:", error.message);
  }

  console.log("\n" + "═".repeat(50));
  console.log("🏁 Testing complete!\n");
}

testAPI();

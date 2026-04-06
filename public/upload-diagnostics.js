// Upload Diagnostics - Run this in browser console
// This script tests connectivity to Convex and diagnoses upload issues

async function runUploadDiagnostics() {
  console.log("=== Upload Diagnostics Starting ===\n");
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: { passed: 0, failed: 0 }
  };
  
  // Test 1: Check if we're in the right context
  console.log("1️⃣ Checking environment...");
  try {
    const hasConvex = typeof window !== 'undefined' && window.location;
    console.log(`   ✓ Running in browser: ${hasConvex}`);
    console.log(`   ✓ Current URL: ${window.location.href}`);
    results.tests.push({ name: "Environment", status: "PASS" });
    results.summary.passed++;
  } catch (error) {
    console.error(`   ✗ Environment check failed:`, error);
    results.tests.push({ name: "Environment", status: "FAIL", error: error.message });
    results.summary.failed++;
  }
  
  // Test 2: Check Convex URL from env
  console.log("\n2️⃣ Checking Convex configuration...");
  try {
    // Try to get Convex URL from meta tags or globals
    const convexUrl = process?.env?.NEXT_PUBLIC_CONVEX_URL || 
                     document.querySelector('meta[name="convex-url"]')?.content ||
                     'https://onprem.spinabot.com/convex-api';
    console.log(`   ✓ Convex URL: ${convexUrl}`);
    results.convexUrl = convexUrl;
    results.tests.push({ name: "Configuration", status: "PASS", convexUrl });
    results.summary.passed++;
  } catch (error) {
    console.error(`   ✗ Configuration check failed:`, error);
    results.tests.push({ name: "Configuration", status: "FAIL", error: error.message });
    results.summary.failed++;
  }
  
  // Test 3: DNS Resolution
  console.log("\n3️⃣ Testing DNS resolution...");
  try {
    const testUrl = 'https://onprem.spinabot.com';
    const start = performance.now();
    const response = await fetch(testUrl, { method: 'HEAD', mode: 'no-cors' });
    const duration = (performance.now() - start).toFixed(0);
    console.log(`   ✓ DNS resolved (${duration}ms)`);
    results.tests.push({ name: "DNS Resolution", status: "PASS", duration: `${duration}ms` });
    results.summary.passed++;
  } catch (error) {
    console.error(`   ✗ DNS resolution failed:`, error.message);
    results.tests.push({ name: "DNS Resolution", status: "FAIL", error: error.message });
    results.summary.failed++;
  }
  
  // Test 4: Convex API Reachability
  console.log("\n4️⃣ Testing Convex API connectivity...");
  try {
    const apiUrl = 'https://onprem.spinabot.com/convex-api';
    const start = performance.now();
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const duration = (performance.now() - start).toFixed(0);
    
    if (response.ok) {
      const data = await response.text();
      console.log(`   ✓ Convex API reachable (${duration}ms)`);
      console.log(`   ✓ Response status: ${response.status}`);
      console.log(`   ✓ Response preview: ${data.substring(0, 100)}...`);
      results.tests.push({ 
        name: "API Connectivity", 
        status: "PASS", 
        duration: `${duration}ms`,
        statusCode: response.status 
      });
      results.summary.passed++;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`   ✗ Convex API unreachable:`, error.message);
    console.error(`   → Check: VPN, firewall, or DNS issues`);
    results.tests.push({ name: "API Connectivity", status: "FAIL", error: error.message });
    results.summary.failed++;
  }
  
  // Test 5: Upload URL Generation (requires Convex client)
  console.log("\n5️⃣ Testing upload URL generation...");
  try {
    // This assumes generateUploadUrl is available in scope
    if (typeof generateUploadUrl === 'function') {
      const uploadUrl = await generateUploadUrl();
      console.log(`   ✓ Upload URL generated successfully`);
      console.log(`   ✓ URL: ${uploadUrl.substring(0, 80)}...`);
      results.uploadUrl = uploadUrl;
      results.tests.push({ name: "Upload URL Generation", status: "PASS" });
      results.summary.passed++;
    } else {
      console.warn(`   ⚠ generateUploadUrl not available (run from upload dialog context)`);
      results.tests.push({ name: "Upload URL Generation", status: "SKIP", reason: "Function not in scope" });
    }
  } catch (error) {
    console.error(`   ✗ Upload URL generation failed:`, error.message);
    results.tests.push({ name: "Upload URL Generation", status: "FAIL", error: error.message });
    results.summary.failed++;
  }
  
  // Test 6: Test Upload (if URL available)
  if (results.uploadUrl) {
    console.log("\n6️⃣ Testing file upload with small blob...");
    try {
      const testBlob = new Blob(['Test upload content'], { type: 'text/plain' });
      const start = performance.now();
      
      const response = await fetch(results.uploadUrl, {
        method: 'POST',
        body: testBlob,
      });
      
      const duration = (performance.now() - start).toFixed(0);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✓ Test upload successful (${duration}ms)`);
        console.log(`   ✓ Storage ID: ${data.storageId}`);
        results.tests.push({ 
          name: "Test Upload", 
          status: "PASS", 
          duration: `${duration}ms`,
          storageId: data.storageId 
        });
        results.summary.passed++;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`   ✗ Test upload failed:`, error.message);
      results.tests.push({ name: "Test Upload", status: "FAIL", error: error.message });
      results.summary.failed++;
    }
  }
  
  // Test 7: Browser Compatibility
  console.log("\n7️⃣ Checking browser capabilities...");
  try {
    const checks = {
      fetch: typeof fetch === 'function',
      abortController: typeof AbortController === 'function',
      formData: typeof FormData === 'function',
      blob: typeof Blob === 'function',
      fileReader: typeof FileReader === 'function',
    };
    
    const allSupported = Object.values(checks).every(v => v);
    
    console.log(`   ${allSupported ? '✓' : '✗'} Fetch API: ${checks.fetch}`);
    console.log(`   ${allSupported ? '✓' : '✗'} AbortController: ${checks.abortController}`);
    console.log(`   ${allSupported ? '✓' : '✗'} FormData: ${checks.formData}`);
    console.log(`   ${allSupported ? '✓' : '✗'} Blob: ${checks.blob}`);
    console.log(`   ${allSupported ? '✓' : '✗'} FileReader: ${checks.fileReader}`);
    
    results.browserCapabilities = checks;
    results.tests.push({ 
      name: "Browser Compatibility", 
      status: allSupported ? "PASS" : "FAIL",
      capabilities: checks
    });
    
    if (allSupported) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  } catch (error) {
    console.error(`   ✗ Browser check failed:`, error);
    results.tests.push({ name: "Browser Compatibility", status: "FAIL", error: error.message });
    results.summary.failed++;
  }
  
  // Summary
  console.log("\n=== Diagnostics Complete ===");
  console.log(`✓ Passed: ${results.summary.passed}`);
  console.log(`✗ Failed: ${results.summary.failed}`);
  console.log(`📋 Total Tests: ${results.tests.length}`);
  
  // Recommendations
  console.log("\n=== Recommendations ===");
  if (results.summary.failed === 0) {
    console.log("✅ All tests passed! Upload should work correctly.");
  } else {
    console.log("⚠️ Issues detected. Review failed tests above.");
    
    const failedTests = results.tests.filter(t => t.status === 'FAIL');
    failedTests.forEach(test => {
      console.log(`\n❌ ${test.name}:`);
      console.log(`   Error: ${test.error}`);
      
      // Specific recommendations
      if (test.name === 'DNS Resolution') {
        console.log(`   Fix: Check network connection, VPN, or DNS settings`);
      } else if (test.name === 'API Connectivity') {
        console.log(`   Fix: Verify Convex server is running and accessible`);
        console.log(`   Try: curl https://onprem.spinabot.com/convex-api`);
      } else if (test.name === 'Test Upload') {
        console.log(`   Fix: Check CORS settings, SSL certificates, or server configuration`);
      } else if (test.name === 'Browser Compatibility') {
        console.log(`   Fix: Update browser to latest version`);
      }
    });
  }
  
  // Export results
  console.log("\n📊 Full Results:");
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

// Auto-run if loaded as script
if (typeof window !== 'undefined') {
  console.log("🔧 Upload Diagnostics Tool Loaded");
  console.log("Run: runUploadDiagnostics()");
  
  // Make available globally
  window.runUploadDiagnostics = runUploadDiagnostics;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runUploadDiagnostics };
}

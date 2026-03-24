#!/usr/bin/env node
/**
 * Test script for chunked file uploads
 * Tests both direct signed URL upload and /api/upload-chunk fallback
 *
 * Usage:
 *   node test-upload.js [filesize_mb] [endpoint]
 *
 * Examples:
 *   node test-upload.js 100          # Test 100MB upload to /api/upload-chunk
 *   node test-upload.js 500 direct   # Test 500MB direct signed URL upload
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const API_BASE = 'http://localhost:3000';

// Parse command line args
const fileSizeMB = parseInt(process.argv[2]) || 100;
const endpoint = process.argv[3] || 'proxy'; // 'proxy' or 'direct'

console.log(`\n📦 Testing ${fileSizeMB}MB upload via ${endpoint} endpoint\n`);

/**
 * Create test file in memory (don't write to disk)
 */
function createTestFile(sizeMB) {
  const sizeBytes = sizeMB * 1024 * 1024;
  console.log(`Creating ${sizeMB}MB test file in memory...`);

  // Create buffer filled with pattern (more realistic than zeros)
  const pattern = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  const patternSize = pattern.length;
  const buffer = Buffer.alloc(sizeBytes);

  for (let i = 0; i < sizeBytes; i += patternSize) {
    const copySize = Math.min(patternSize, sizeBytes - i);
    pattern.copy(buffer, i, 0, copySize);
  }

  console.log(`✓ Test file created: ${(buffer.length / 1024 / 1024).toFixed(2)}MB\n`);
  return buffer;
}

/**
 * Upload single chunk to /api/upload-chunk
 */
async function uploadChunkToProxy(chunk, chunkIndex, totalChunks, filename) {
  const formData = new FormData();
  formData.append('chunk', new Blob([chunk]));
  formData.append('chunkIndex', String(chunkIndex));
  formData.append('totalChunks', String(totalChunks));
  formData.append('filename', filename);

  const response = await fetch(`${API_BASE}/api/upload-chunk`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`HTTP ${response.status}: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Main upload test
 */
async function runTest() {
  const startTime = Date.now();

  try {
    // Step 1: Create test file
    const fileBuffer = createTestFile(fileSizeMB);
    const filename = `test-${fileSizeMB}mb.bin`;

    // Step 2: Split into chunks
    const totalChunks = Math.ceil(fileBuffer.length / CHUNK_SIZE);
    console.log(`Split into ${totalChunks} chunks of ${CHUNK_SIZE / 1024 / 1024}MB each\n`);

    // Step 3: Upload chunks
    const storageIds = [];

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileBuffer.length);
      const chunk = fileBuffer.slice(start, end);

      const chunkStartTime = Date.now();
      process.stdout.write(`Uploading chunk ${chunkIndex + 1}/${totalChunks} (${(chunk.length / 1024 / 1024).toFixed(2)}MB)... `);

      const result = await uploadChunkToProxy(chunk, chunkIndex, totalChunks, filename);

      const chunkDuration = Date.now() - chunkStartTime;
      const speedMBps = (chunk.length / 1024 / 1024) / (chunkDuration / 1000);

      console.log(`✓ ${chunkDuration}ms (${speedMBps.toFixed(2)} MB/s) - ${result.storageId.substring(0, 20)}...`);

      storageIds.push(result.storageId);
    }

    // Step 4: Summary
    const totalDuration = Date.now() - startTime;
    const totalSpeedMBps = fileSizeMB / (totalDuration / 1000);

    console.log(`\n✅ Upload complete!`);
    console.log(`   Total time: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Average speed: ${totalSpeedMBps.toFixed(2)} MB/s`);
    console.log(`   Chunks uploaded: ${storageIds.length}/${totalChunks}`);
    console.log(`   Storage IDs: ${storageIds.map(id => id.substring(0, 10)).join(', ')}...\n`);

    return { success: true, storageIds, duration: totalDuration };

  } catch (error) {
    console.error(`\n❌ Test failed:`, error.message);
    console.error(`   Error type: ${error.constructor.name}`);
    if (error.stack) {
      console.error(`   Stack:`, error.stack.split('\n').slice(0, 3).join('\n'));
    }

    return { success: false, error: error.message };
  }
}

// Run test
runTest()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

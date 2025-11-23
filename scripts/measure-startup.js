#!/usr/bin/env node

/**
 * Performance test script to measure startup time
 * Compares application initialization time before and after optimizations
 */

import { performance } from 'perf_hooks';

const startTime = performance.now();

// Import main application entry point
await import('../lib/index.js');

const endTime = performance.now();
const startupTime = endTime - startTime;

console.log(`\n🚀 Startup Performance:`);
console.log(`   Total Time: ${startupTime.toFixed(2)}ms`);

// Target: Reduce from 500ms to <200ms
const target = 200;
const baseline = 500;
const improvement = ((baseline - startupTime) / baseline * 100).toFixed(1);

if (startupTime < target) {
    console.log(`   ✅ SUCCESS: Under ${target}ms target (${improvement}% improvement from ${baseline}ms baseline)`);
} else if (startupTime < baseline) {
    console.log(`   ⚠️  GOOD: ${improvement}% improvement from ${baseline}ms baseline (target: ${target}ms)`);
} else {
    console.log(`   ❌ NEEDS WORK: Above ${baseline}ms baseline (target: ${target}ms)`);
}

console.log('');

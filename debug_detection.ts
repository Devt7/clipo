#!/usr/bin/env -S deno run --allow-read

import { detectProjectType, PROJECT_DETECTION_RULES } from './projectDetection.ts';
import { join, exists } from "https://deno.land/std@0.212.0/path/mod.ts";

console.log("Testing enhanced project detection with debug...");

// Debug C/C++ rule specifically
const cppRule = PROJECT_DETECTION_RULES.find(r => r.name === "C/C++");
if (cppRule) {
  console.log("C/C++ rule files:", cppRule.files);
  console.log("Checking for C/C++ indicators:");
  
  for (const file of cppRule.files) {
    if (file.includes('*')) {
      // Handle glob patterns
      try {
        const files: string[] = [];
        for await (const dirEntry of Deno.readDir('.')) {
          if (dirEntry.isFile) {
            files.push(dirEntry.name);
          }
        }
        const regex = new RegExp('^' + file.replace('*', '[^.]*') + '$');
        const matches = files.filter(f => regex.test(f));
        console.log(`  Pattern ${file}: found ${matches.length} files:`, matches.slice(0, 3));
      } catch (e) {
        console.log(`  Pattern ${file}: error -`, e.message);
      }
    } else {
      const exists = await Deno.stat(file).then(() => true).catch(() => false);
      console.log(`  File ${file}: ${exists ? 'EXISTS' : 'not found'}`);
    }
  }
}

const types = await detectProjectType('.');
console.log('Final detected types:', types);
console.log('Primary type:', types[0] || 'none');

#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Demo script to test the clipboard monitoring functionality
 */

import { ClipboardMonitor } from "./clipboardMonitor.ts";

async function demo() {
  console.log("🎯 Clipo Clipboard Monitor Demo");
  console.log("==============================\n");
  
  const projectDir = Deno.cwd();
  console.log(`📁 Project Directory: ${projectDir}`);
  
  const monitor = new ClipboardMonitor({
    projectDir,
    checkInterval: 1000,
    verbose: true
  });

  console.log("\n📋 Demo Files to Copy:");
  console.log("Copy any of these examples to your clipboard:\n");
  
  console.log("Example 1 - React Component:");
  console.log("// demo/components/Welcome.tsx");
  console.log("export function Welcome({ name }: { name: string }) {");
  console.log("  return <h1>Welcome, {name}!</h1>;");
  console.log("}\n");
  
  console.log("Example 2 - Utility Function:");
  console.log("// demo/utils/format.ts");
  console.log("export function formatCurrency(amount: number): string {");
  console.log("  return new Intl.NumberFormat('en-US', {");
  console.log("    style: 'currency',");
  console.log("    currency: 'USD'");
  console.log("  }).format(amount);");
  console.log("}\n");

  console.log("Example 3 - Configuration:");
  console.log("// demo/config.json");
  console.log('{');
  console.log('  "name": "My App",');
  console.log('  "version": "1.0.0",');
  console.log('  "description": "A demo application"');
  console.log("}\n");

  console.log("🔄 Starting monitor... Copy any example above to test!");
  console.log("🛑 Press Ctrl+C to stop\n");
  console.log("═".repeat(50));

  await monitor.start();
}

if (import.meta.main) {
  demo();
}

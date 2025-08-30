#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

import { parseArgs } from "https://deno.land/std@0.212.0/cli/parse_args.ts";
import { exists } from "https://deno.land/std@0.212.0/fs/mod.ts";
import { resolve } from "https://deno.land/std@0.212.0/path/mod.ts";
import { startClipboardMonitoring, ClipboardMonitorOptions } from "./clipboardMonitor.ts";

const helpText = `
🎯 Clipo Clipboard Monitor - Continuous File Replacement Tool

Usage: deno run --allow-read --allow-write --allow-run monitor.ts [OPTIONS] <project_directory>

Description:
  Monitors the clipboard for file replacement patterns and automatically updates files
  in your project directory when clipboard content matches the pattern:
  
  // <filepath>
  <file_content>

Arguments:
  <project_directory>    Path to the project directory to monitor

Options:
  --interval=<ms>        Check interval in milliseconds (default: 1000)
  --verbose             Enable verbose logging
  --help                Show this help message

Examples:
  # Monitor current directory with default 1-second interval
  deno run --allow-read --allow-write --allow-run monitor.ts .
  
  # Monitor with custom interval and verbose output
  deno run --allow-read --allow-write --allow-run monitor.ts . --interval=500 --verbose
  
  # Monitor specific project directory
  deno run --allow-read --allow-write --allow-run monitor.ts /path/to/project --verbose

Clipboard Pattern:
  Copy text in this format to your clipboard:
  
  // src/components/Button.tsx
  export function Button({ children, onClick }: ButtonProps) {
    return (
      <button onClick={onClick} className="btn">
        {children}
      </button>
    );
  }
  
  The file 'src/components/Button.tsx' will be created/updated with the content.

Supported Paths:
  • Relative paths: src/main.ts, components/Button.tsx
  • Absolute paths: /full/path/to/file.ts
  • Nested directories: deep/nested/folder/file.js (creates directories automatically)
`;

interface MonitorArgs {
  projectDir: string;
  interval: number;
  verbose: boolean;
  help: boolean;
}

function parseMonitorArgs(args: string[]): MonitorArgs | null {
  const parsed = parseArgs(args, {
    string: ["interval"],
    boolean: ["verbose", "help"],
    default: {
      interval: "1000",
      verbose: false,
      help: false,
    },
  });

  if (parsed.help) {
    console.log(helpText);
    return null;
  }

  const projectDir = parsed._[0] as string;
  if (!projectDir) {
    console.error("❌ Error: Missing project directory argument");
    console.log(helpText);
    return null;
  }

  const interval = parseInt(parsed.interval);
  if (isNaN(interval) || interval < 100) {
    console.error("❌ Error: Invalid interval. Must be a number >= 100ms");
    return null;
  }

  return {
    projectDir: resolve(projectDir),
    interval,
    verbose: parsed.verbose,
    help: false,
  };
}

async function validateProjectDirectory(path: string): Promise<boolean> {
  try {
    const dirExists = await exists(path, { isDirectory: true });
    if (!dirExists) {
      console.error(`❌ Error: Directory '${path}' does not exist`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`❌ Error validating directory '${path}':`, error.message);
    return false;
  }
}

async function main() {
  const args = parseMonitorArgs(Deno.args);
  
  if (!args) {
    Deno.exit(1);
  }

  if (!(await validateProjectDirectory(args.projectDir))) {
    Deno.exit(1);
  }

  console.log("🎯 Clipo Clipboard Monitor Starting...");
  console.log(`📁 Project Directory: ${args.projectDir}`);
  console.log(`⏱️  Check Interval: ${args.interval}ms`);
  console.log(`🔊 Verbose Logging: ${args.verbose ? 'ON' : 'OFF'}`);
  console.log("");
  console.log("📋 Pattern Format:");
  console.log("   // <filepath>");
  console.log("   <file_content>");
  console.log("");
  console.log("📝 Example:");
  console.log("   // src/main.ts");
  console.log("   console.log('Hello, World!');");
  console.log("");
  console.log("💡 Tip: Copy code with the filepath comment to automatically replace files!");
  console.log("🛑 Press Ctrl+C to stop monitoring");
  console.log("═".repeat(70));

  const monitorOptions: ClipboardMonitorOptions = {
    projectDir: args.projectDir,
    checkInterval: args.interval,
    verbose: args.verbose,
  };

  try {
    const monitor = await startClipboardMonitoring(monitorOptions);
    
    // Keep the process alive indefinitely
    await new Promise(() => {});
  } catch (error) {
    console.error("❌ Failed to start clipboard monitor:", error.message);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}

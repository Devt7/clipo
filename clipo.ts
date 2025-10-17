#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Clipo - Unified CLI Entry Point
 * 
 * This is the main entry point that handles both:
 * 1. Regular file processing and directory structure generation
 * 2. Clipboard monitoring for real-time file updates
 */

import { basename } from "https://deno.land/std@0.212.0/path/mod.ts";
import { DEFAULT_CONFIG, loadConfig, writeConfig } from "./config.ts";
import { getFilesWithContent, generateDirectoryStructure } from "./fileProcessor.ts";
import { parseArgs, validateDirectory, CliOptions } from "./cli.ts";
import { formatForAI } from "./streamlinedAIFormatter.ts";
import { startClipboardMonitoring, ClipboardMonitorOptions } from "./clipboardMonitor.ts";
import { setClipboardText } from "./src/utils/clipboard.ts";

const VERSION = "2.1.0"; // Updated for cross-platform support

async function showVersion() {
  console.log(`Clipo v${VERSION}`);
  console.log("Enhanced Deno utility for file processing and clipboard monitoring");
}

async function main() {
  const args = Deno.args;
  
  if (args.includes("--version") || args.includes("-v")) {
    await showVersion();
    Deno.exit(0);
  }

  const options = parseArgs(args);
  if (!options) Deno.exit(1);

  const validatedOptions = options!;
  if (validatedOptions.createConfig) {
    const dir = validatedOptions.directoryPath || ".";
    if (!(await validateDirectory(dir))) {
      Deno.exit(1);
    }
    const configPath = `${dir}/clipo.json`;
    await writeConfig(DEFAULT_CONFIG, configPath);
    console.log(`✅ Default configuration file created at ${configPath}`);
    Deno.exit(0);
  }

  if (!(await validateDirectory(validatedOptions.directoryPath))) {
    Deno.exit(1);
  }

  if (validatedOptions.monitor) {
    console.log("🎯 Clipo Clipboard Monitor Mode");
    const monitorOptions: ClipboardMonitorOptions = {
      projectDir: validatedOptions.directoryPath,
      checkInterval: validatedOptions.monitorInterval,
      verbose: validatedOptions.verbose,
    };
    await startClipboardMonitoring(monitorOptions);
    return; // Keep process alive for monitoring
  }

  if (validatedOptions.cpymon) {
    await handleCopyThenMonitor(validatedOptions);
    return; // Keep process alive for monitoring
  }

  await handleFileProcessing(validatedOptions);
}

async function handleCopyThenMonitor(options: CliOptions) {
  console.log("🚀 Clipo Copy+Monitor Mode");
  try {
    const config = await loadConfig(
      options.configPath,
      options.directoryPath,
      false // Always auto-detect for cpymon
    );

    const executableName = basename(Deno.execPath());
    const fileContents = await getFilesWithContent(options.directoryPath, executableName, options.fileExtensions, config, options.includeIgnoredFiles, options.outputFile, options.verbose);
    const directoryStructure = await generateDirectoryStructure(options.directoryPath, config, options.includeIgnoredFiles, options.includeIgnoredFilesSuffix, options.outputFile, executableName, options.useStyles);

    const combinedContent = `// Directory Structure:\n${directoryStructure}\n\n${fileContents.join("\n\n")}`;
    const finalContent = options.aiFormat !== 'standard'
      ? await formatForAI(combinedContent, {
          format: options.aiFormat,
          includeStats: options.includeStats,
          includePrompts: options.includePrompts,
          includeInstructions: options.includeInstructions,
          optimizeFor: options.optimizeFor,
          projectType: config.project_type,
          maxTokens: options.maxTokens,
        })
      : combinedContent;

    const instructionHeader = [
      "Reply with code using ONE of these two formats:", "",
      "FORMAT 1 - Complete File (default):", "``` // <filepath>", "<complete file contents>", "```", "",
      "FORMAT 2 - Search & Replace (for targeted edits):", "// <filepath>", "------- SEARCH", "<exact code to find>", "=======", "<replacement code>", "+++++++ REPLACE", "",
      "DECISION LOGIC:", "- Use Format 1 (complete file) by default for each file", "- Use Format 1 if user says 'full' in chat", "- Use Format 2 if user says 'sr' for targeted code changes only", "- One file per message, no extra text", "- Only provide files that need modification", ""
    ].join('\n');

    const clipboardPayload = `${instructionHeader}\n${finalContent}`;
    
    await setClipboardText(clipboardPayload);
    console.log("📋 Project snapshot + instructions copied to clipboard.");

    const monitorOptions: ClipboardMonitorOptions = {
      projectDir: options.directoryPath,
      checkInterval: options.monitorInterval,
      verbose: options.verbose,
    };
    await startClipboardMonitoring(monitorOptions);
  } catch (error) {
    console.error("❌ Copy+Monitor failed:", error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}

async function handleFileProcessing(options: CliOptions) {
  try {
    const config = await loadConfig(
      options.configPath, 
      options.directoryPath,
      options.disableAutoDetect
    );

    const configUpdated = await updateConfigFromOptions(config, options);
    if (configUpdated) {
      await writeConfig(config, options.configPath);
      console.log(`Config updated in ${options.configPath}`);
    }

    const executableName = basename(Deno.execPath());
    const fileContents = await getFilesWithContent(options.directoryPath, executableName, options.fileExtensions, config, options.includeIgnoredFiles, options.outputFile, options.verbose);
    const directoryStructure = await generateDirectoryStructure(options.directoryPath, config, options.includeIgnoredFiles, options.includeIgnoredFilesSuffix, options.outputFile, executableName, options.useStyles);

    const combinedContent = `// Directory Structure:\n${directoryStructure}\n\n${fileContents.join("\n\n")}`;
    const finalContent = options.aiFormat !== 'standard' 
      ? await formatForAI(combinedContent, {
          format: options.aiFormat,
          includeStats: options.includeStats,
          includePrompts: options.includePrompts,
          includeInstructions: options.includeInstructions,
          optimizeFor: options.optimizeFor,
          projectType: config.project_type,
          maxTokens: options.maxTokens
        })
      : combinedContent;

    if (options.outputFile) {
      await Deno.writeTextFile(options.outputFile, finalContent);
      console.log(`File contents written to ${options.outputFile}`);
    } else {
      console.log(finalContent);
    }
  } catch (error) {
    console.error(`Error processing directory '${options.directoryPath}':`, error);
    Deno.exit(1);
  }
}

async function updateConfigFromOptions(config: any, options: CliOptions): Promise<boolean> {
  let updated = false;
  if (options.addFile) {
    config.ignoreFiles = config.ignoreFiles || [];
    if (!config.ignoreFiles.includes(options.addFile)) {
      config.ignoreFiles.push(options.addFile);
      updated = true;
    }
  }
  if (options.addFolder) {
    config.ignoreFolders = config.ignoreFolders || [];
    if (!config.ignoreFolders.includes(options.addFolder)) {
      config.ignoreFolders.push(options.addFolder);
      updated = true;
    }
  }
  if (options.addExt) {
    config.ignoreExtensions = config.ignoreExtensions || [];
    if (!config.ignoreExtensions.includes(options.addExt)) {
      config.ignoreExtensions.push(options.addExt);
      updated = true;
    }
  }
  return updated;
}

if (import.meta.main) {
  main();
}

import { basename } from "https://deno.land/std@0.212.0/path/mod.ts";
import { loadConfig, writeConfig, Config } from "./config.ts";
import { getFilesWithContent, generateDirectoryStructure } from "./fileProcessor.ts";
import { parseArgs, validateDirectory, CliOptions } from "./cli.ts";
import { formatForAI } from "./streamlinedAIFormatter.ts";
import { startClipboardMonitoring, ClipboardMonitorOptions } from "./clipboardMonitor.ts";
import { setClipboardText } from "./src/utils/clipboard.ts";

async function main() {
  const args = Deno.args;
  const options = parseArgs(args);

  if (!options) {
    Deno.exit(1);
  }

  const validatedOptions = options!;

  if (!(await validateDirectory(validatedOptions.directoryPath))) {
    Deno.exit(1);
  }

  // Handle clipboard monitoring mode
  if (validatedOptions.monitor) {
    console.log("🎯 Starting Clipboard Monitor Mode");
    console.log(`📁 Project Directory: ${validatedOptions.directoryPath}`);
    console.log("📋 Monitoring clipboard for file replacement patterns...");
    console.log("Pattern: // <filepath>");
    console.log("Example:");
    console.log("  // src/main.ts");
    console.log("  console.log('Hello, World!');");
    console.log("");

    const monitorOptions: ClipboardMonitorOptions = {
      projectDir: validatedOptions.directoryPath,
      checkInterval: validatedOptions.monitorInterval,
      verbose: validatedOptions.verbose,
    };

    const monitor = await startClipboardMonitoring(monitorOptions);
    
    // Keep the process alive
    return;
  }

  // Handle copy-then-monitor mode
  if (validatedOptions.cpymon) {
    console.log("🚀 Copy+Monitor Mode: Preparing project snapshot for clipboard and starting monitor...");
    try {
      // Always run with auto-detect enabled for this mode
      const config = await loadConfig(
        validatedOptions.configPath,
        validatedOptions.directoryPath,
        /* disableAutoDetect */ false,
      );

      const executableName = basename(Deno.execPath());

      const fileContents = await getFilesWithContent(
        validatedOptions.directoryPath,
        executableName,
        validatedOptions.fileExtensions,
        config,
        validatedOptions.includeIgnoredFiles,
        validatedOptions.outputFile,
        validatedOptions.verbose
      );

      const directoryStructure = await generateDirectoryStructure(
        validatedOptions.directoryPath,
        config,
        validatedOptions.includeIgnoredFiles,
        validatedOptions.includeIgnoredFilesSuffix,
        validatedOptions.outputFile,
        executableName,
        validatedOptions.useStyles
      );

      const combinedContent = `// Directory Structure:\n${directoryStructure}\n\n${fileContents.join("\n\n")}`;

      const finalContent = validatedOptions.aiFormat !== 'standard'
        ? await formatForAI(combinedContent, {
            format: validatedOptions.aiFormat,
            includeStats: validatedOptions.includeStats,
            includePrompts: validatedOptions.includePrompts,
            includeInstructions: validatedOptions.includeInstructions,
            optimizeFor: validatedOptions.optimizeFor,
            projectType: config.project_type,
            maxTokens: validatedOptions.maxTokens,
          })
        : combinedContent;

      const instructionHeader = [
        "Reply with code using ONE of these two formats:",
        "",
        "FORMAT 1 - Complete File (default):",
        "``` // <filepath>",
        "<complete file contents>",
        "```",
        "",
        "FORMAT 2 - Search & Replace (for targeted edits):",
        "// <filepath>",
        "------- SEARCH",
        "<exact code to find>",
        "=======", 
        "<replacement code>",
        "+++++++ REPLACE",
        "",
        "DECISION LOGIC:",
        "- Use Format 1 (complete file) by default for each file",
        "- Use Format 1 if user says 'full' in chat",
        "- Use Format 2 if user says 'sr' for targeted code changes only",
        "- One file per message, no extra text",
        "- Only provide files that need modification",
        ""
      ].join('\n');

      const clipboardPayload = `${instructionHeader}\n${finalContent}`;

      // Copy to clipboard using cross-platform utility
      await setClipboardText(clipboardPayload);
      console.log("📋 Project snapshot + instructions copied to clipboard.");

      // Now start monitoring
      const monitorOptions: ClipboardMonitorOptions = {
        projectDir: validatedOptions.directoryPath,
        checkInterval: validatedOptions.monitorInterval,
        verbose: validatedOptions.verbose,
      };
      await startClipboardMonitoring(monitorOptions);
      return;
    } catch (error) {
      console.error("Failed in Copy+Monitor mode:", error instanceof Error ? error.message : String(error));
      Deno.exit(1);
    }
  }

  try {
    // Pass the directory path and auto-detect option for project detection
    const config = await loadConfig(
      validatedOptions.configPath, 
      validatedOptions.directoryPath,
      validatedOptions.disableAutoDetect
    );

    // Modify Config
    if (validatedOptions.addFile) {
      config.ignoreFiles = config.ignoreFiles || [];
      if (!config.ignoreFiles.includes(validatedOptions.addFile)) {
        config.ignoreFiles.push(validatedOptions.addFile);
      }
    }
    if (validatedOptions.addFolder) {
      config.ignoreFolders = config.ignoreFolders || [];
      if (!config.ignoreFolders.includes(validatedOptions.addFolder)) {
        config.ignoreFolders.push(validatedOptions.addFolder);
      }
    }
    if (validatedOptions.addExt) {
      config.ignoreExtensions = config.ignoreExtensions || [];
      if (!config.ignoreExtensions.includes(validatedOptions.addExt)) {
        config.ignoreExtensions.push(validatedOptions.addExt);
      }
    }

    if (validatedOptions.addFile || validatedOptions.addFolder || validatedOptions.addExt) {
      await writeConfig(config, validatedOptions.configPath);
      console.log(`Config updated in ${validatedOptions.configPath}`);
    }

    const executableName = basename(Deno.execPath());

    const fileContents = await getFilesWithContent(
      validatedOptions.directoryPath,
      executableName,
      validatedOptions.fileExtensions,
      config,
      validatedOptions.includeIgnoredFiles,
      validatedOptions.outputFile,
      validatedOptions.verbose
    );

    const directoryStructure = await generateDirectoryStructure(
      validatedOptions.directoryPath,
      config,
      validatedOptions.includeIgnoredFiles,
      validatedOptions.includeIgnoredFilesSuffix,
      validatedOptions.outputFile,
      executableName,
      validatedOptions.useStyles
    );

    const combinedContent =
      `// Directory Structure:\n${directoryStructure}\n\n` +
      fileContents.join("\n\n");

    // Apply AI formatting if requested
    const finalContent = validatedOptions.aiFormat !== 'standard' 
      ? await formatForAI(combinedContent, {
          format: validatedOptions.aiFormat,
          includeStats: validatedOptions.includeStats,
          includePrompts: validatedOptions.includePrompts,
          includeInstructions: validatedOptions.includeInstructions,
          optimizeFor: validatedOptions.optimizeFor,
          projectType: config.project_type,
          maxTokens: validatedOptions.maxTokens
        })
      : combinedContent;

    if (validatedOptions.outputFile) {
      await Deno.writeTextFile(validatedOptions.outputFile, finalContent);
      console.log(`File contents written to ${validatedOptions.outputFile}`);
    } else {
      console.log(finalContent);
    }
  } catch (error) {
    console.error(`Error processing directory '${validatedOptions.directoryPath}':`, error);
    Deno.exit(1);
  }
}

main();

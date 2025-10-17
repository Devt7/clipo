import { basename } from "https://deno.land/std@0.212.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.212.0/fs/mod.ts";

export interface CliOptions {
  directoryPath: string;
  outputFile?: string;
  fileExtensions: string[];
  configPath: string;
  addFile?: string;
  addFolder?: string;
  addExt?: string;
  includeIgnoredFiles: boolean;
  includeIgnoredFilesSuffix: boolean;
  useStyles: boolean;
  disableAutoDetect: boolean;
  // AI-specific options
  aiFormat: 'standard' | 'markdown' | 'xml' | 'json';
  includeStats: boolean;
  includePrompts: boolean;
  includeInstructions: boolean;
  includeLineNumbers: boolean;
  optimizeFor: 'gpt' | 'claude' | 'gemini' | 'generic';
  maxTokens?: number;
  splitLargeFiles: boolean;
  // Clipboard monitoring options
  monitor: boolean;
  cpymon: boolean;
  monitorInterval: number;
  verbose: boolean;
  createConfig: boolean;
}

const helpText = `
Usage: clipo <directory_path> [output_file] [file_extensions] [config_file] [options]
   or: deno run --allow-read --allow-write --allow-run clipo.ts <directory_path> [options]

Description:
  🤖 AI-Optimized Codebase Analysis Tool with Real-time Clipboard Monitoring
  
  This tool processes files in a directory and formats them for optimal AI analysis.
  It automatically detects project types, applies smart ignore patterns, and formats
  output specifically for LLM consumption with metadata, statistics, and context.

Arguments:
  <directory_path>   The path to the directory to process.
  [output_file]      Optional. The file to write the output to. If omitted, output is printed to console.
  [file_extensions]  Optional. Comma-separated list of file extensions to include (e.g., .js,.ts,.md).
                       If omitted, all files are included.
  [config_file]      Optional. Path to the configuration file (default: clipo.cfg).

🤖 AI-Specific Options:
  --ai-format=<format>           Output format: standard|markdown|xml|json (default: standard)
  --optimize-for=<model>         Optimize for: gpt|claude|gemini|generic (default: generic)
  --include-stats               Include codebase statistics and token estimates
  --include-prompts             Add suggested AI prompts and analysis questions
  --include-instructions        Add instructions for AI assistant
  --include-line-numbers        Add line numbers to code blocks
  --max-tokens=<number>         Split output if estimated tokens exceed limit
  --split-large                 Automatically split large codebases

📋 Clipboard Monitoring Options:
  --monitor                     Enable clipboard monitoring mode
  --cpymon                      Copy project to clipboard with AI instructions, then start monitoring
  --monitor-interval=<ms>       Clipboard check interval in milliseconds (default: 1000)
  --verbose                     Enable verbose logging for monitoring

📁 Directory Options:
  --help                        Display this help message.
  --add-file=<file>            Add a file to the ignore list in the config file.
  --add-folder=<folder>        Add a folder to the ignore list in the config file.
  --add-ext=<ext>              Add an extension to the ignore list in the config file.
  -AIF                         Include ignored files/folders/extensions in the directory structure.
  -AIFI                        Include ignored files in the directory structure, marked as (excluded).
  -no-style                    Exclude styling emojis from directory structure output
  --no-auto-detect             Disable automatic project type detection
  -cc                          Create a default clipo.json config file in the target directory.

🎯 AI Use Case Examples:
  # Basic AI-ready output with statistics
  clipo . --include-stats --include-prompts
  
  # Markdown format optimized for GPT-4
  clipo . output.md --ai-format=markdown --optimize-for=gpt
  
  # Clipboard monitoring mode
  clipo . --monitor --verbose
  
  # Claude-optimized with line numbers and instructions
  clipo . --optimize-for=claude --include-line-numbers --include-instructions
  
  # JSON format for API consumption
  clipo . output.json --ai-format=json --include-stats

📋 Clipboard Monitoring Examples:
  # Start monitoring current directory
  clipo . --monitor
  
  # Monitor with verbose output and custom interval
  clipo . --monitor --verbose --monitor-interval=500

  # Copy project snapshot with instructions to clipboard, then monitor
  clipo . --cpymon --verbose

📊 Token Management:
  The tool estimates token counts and provides compatibility info for different AI models:
  • GPT-3.5: ~4K tokens
  • GPT-4: ~8K-32K tokens  
  • Claude-2+: ~100K tokens
  • Claude-3+: ~200K tokens

Supported Project Types:
  🚀 Next.js, Vue.js, React, Nuxt.js
  🟨 JavaScript (Node.js), TypeScript (Deno)  
  🐍 Python (pip, poetry, conda)
  🦀 Rust (Cargo)
  🐹 Go (modules)
  🔧 C/C++ (Make, CMake)
  ☕ Java (Maven, Gradle)
  💎 Ruby (Bundler)
  🟣 C#/.NET
  🐘 PHP (Composer)
  🍎 Swift (SPM, Xcode)
  🏗️ Arduino, ESP-IDF
  🎯 Kotlin

Configuration File Format (clipo.cfg):
  # Comments start with '#'
  gitignore: true|false              # Use .gitignore files
  auto_detect_project: true|false    # Enable auto project detection  
  project_type: "Node.js"            # Override detected project type
  output_encoding: utf-8             # Output file encoding
  read_large_files: false            # Process large files
  max_large_files: 10MB              # Maximum file size to process
  
  files: file1, file2, ...           # Specific files to ignore
  folders: folder1, folder2, ...     # Folders to ignore  
  ext: .ext1, .ext2, ...            # File extensions to ignore

  # AI-specific settings
  ai_format: markdown                # Default AI output format
  include_stats: true                # Include statistics by default
  include_prompts: true              # Include suggested prompts
  optimize_for: generic              # Default model optimization

  visual:                            # Visual customization
   style: true                       # Enable styling emojis
   folder: 📁                        # Folder icon
   file: 📄                          # File icon
   excluded: (excluded)              # Excluded file suffix
   .png, .jpeg: 🖼️                  # Custom icons by extension
`;

export function parseArgs(args: string[]): CliOptions | null {
  let directoryPath: string | undefined;
  let outputFile: string | undefined;
  let fileExtensions: string[] = [];
  let configPath: string = "clipo.cfg";

  let addFile: string | undefined;
  let addFolder: string | undefined;
  let addExt: string | undefined;

  let includeIgnoredFiles = false;
  let includeIgnoredFilesSuffix = false;
  let useStyles = true;
  let disableAutoDetect = false;
  
  // AI-specific options with defaults
  let aiFormat: 'standard' | 'markdown' | 'xml' | 'json' = 'standard';
  let includeStats = false;
  let includePrompts = false;
  let includeInstructions = false;
  let includeLineNumbers = false;
  let optimizeFor: 'gpt' | 'claude' | 'gemini' | 'generic' = 'generic';
  let maxTokens: number | undefined;
  let splitLargeFiles = false;
  let monitor = false;
  let cpymon = false;
  let monitorInterval = 1000; // 1 second default
  let verbose = false;
  let createConfig = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help") {
      console.log(helpText);
      return null;
    } else if (arg.startsWith("--ai-format=")) {
      const format = arg.substring("--ai-format=".length) as 'standard' | 'markdown' | 'xml' | 'json';
      if (['standard', 'markdown', 'xml', 'json'].includes(format)) {
        aiFormat = format;
      }
    } else if (arg.startsWith("--optimize-for=")) {
      const model = arg.substring("--optimize-for=".length) as 'gpt' | 'claude' | 'gemini' | 'generic';
      if (['gpt', 'claude', 'gemini', 'generic'].includes(model)) {
        optimizeFor = model;
      }
    } else if (arg.startsWith("--max-tokens=")) {
      maxTokens = parseInt(arg.substring("--max-tokens=".length));
    } else if (arg === "--include-stats") {
      includeStats = true;
    } else if (arg === "--include-prompts") {
      includePrompts = true;
    } else if (arg === "--include-instructions") {
      includeInstructions = true;
    } else if (arg === "--include-line-numbers") {
      includeLineNumbers = true;
    } else if (arg === "--split-large") {
      splitLargeFiles = true;
    } else if (arg === "--monitor") {
      monitor = true;
    } else if (arg === "--cpymon") {
      cpymon = true;
    } else if (arg.startsWith("--monitor-interval=")) {
      monitorInterval = parseInt(arg.substring("--monitor-interval=".length)) || 1000;
    } else if (arg === "--verbose") {
      verbose = true;
    } else if (arg.startsWith("--add-file=")) {
      addFile = arg.substring("--add-file=".length);
    } else if (arg.startsWith("--add-folder=")) {
      addFolder = arg.substring("--add-folder=".length);
    } else if (arg.startsWith("--add-ext=")) {
      addExt = arg.substring("--add-ext=".length);
    } else if (arg === "-AIF") {
      includeIgnoredFiles = true;
    } else if (arg === "-AIFI") {
      includeIgnoredFiles = true;
      includeIgnoredFilesSuffix = true;
    } else if (arg === "-no-style") {
      useStyles = false;
    } else if (arg === "--no-auto-detect") {
      disableAutoDetect = true;
    } else if (arg === "-cc") {
      createConfig = true;
    } else if (!directoryPath) {
      directoryPath = arg;
    } else if (!outputFile && directoryPath) {
      outputFile = arg;
    } else if (directoryPath && outputFile && fileExtensions.length === 0) {
      fileExtensions = arg
        ? arg.split(",").map((ext) => {
            return ext.startsWith(".")
              ? ext.toLowerCase()
              : `.${ext.toLowerCase()}`;
          })
        : [];
    } else {
      configPath = arg;
    }
  }

  if (!directoryPath) {
    console.error("Error: Missing <directory_path> argument.");
    console.log(helpText);
    return null;
  }

  return {
    directoryPath,
    outputFile,
    fileExtensions,
    configPath,
    addFile,
    addFolder,
    addExt,
    includeIgnoredFiles,
    includeIgnoredFilesSuffix,
    useStyles,
    disableAutoDetect,
    aiFormat,
    includeStats,
    includePrompts,
    includeInstructions,
    includeLineNumbers,
    optimizeFor,
    maxTokens,
    splitLargeFiles,
    monitor,
    cpymon,
    monitorInterval,
    verbose,
    createConfig,
  };
}

export async function validateDirectory(directoryPath: string): Promise<boolean> {
  try {
    const dirExists = await exists(directoryPath, { isDirectory: true });
    if (!dirExists) {
      console.error(`Error: Directory '${directoryPath}' does not exist.`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error validating directory '${directoryPath}':`, error);
    return false;
  }
}

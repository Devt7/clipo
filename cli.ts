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
  showConfigHelp: boolean;
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
  -cc, --cc                    Create a default clipo.json config file in the target directory.

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

export const configHelpText = `
Clipo Configuration File (`clipo.json`)

The \`clipo.json\` file allows for detailed customization of Clipo's behavior.
You can generate a default config file by running: clipo -cc

Here are the available options:

{
  "useGitignore": true,
  // (boolean) If true, Clipo will respect the ignore patterns found in .gitignore files.

  "ignoreFiles": ["file1.ts", "file2.js"],
  // (string[]) A list of specific file names to ignore.

  "ignoreFolders": ["node_modules", "dist"],
  // (string[]) A list of folder names to ignore.

  "ignoreExtensions": [".log", ".tmp"],
  // (string[]) A list of file extensions to ignore.

  "visual": {
    "style": "true",
    // (string) "true" or "false" to enable or disable visual styling (emojis).

    "folder": "📁",
    // (string) The emoji or character to use for folders in the directory structure.

    "file": "📄",
    // (string) The emoji or character to use for files in the directory structure.

    "excluded": "(excluded)"
    // (string) The suffix to append to excluded files in the directory structure.
  },

  "output_encoding": "utf-8",
  // (string) The encoding to use for the output file.

  "read_large_files": false,
  // (boolean) If true, Clipo will attempt to read files larger than the max_large_files limit.

  "max_large_files": "10MB",
  // (string) The maximum size for files to be read.

  "auto_detect_project": true
  // (boolean) If true, Clipo will automatically detect the project type and apply default ignore patterns.
}
`;

export function parseArgs(args: string[]): CliOptions | null {
  // --- Initialize Options with Defaults ---
  const options: CliOptions = {
    directoryPath: "",
    fileExtensions: [],
    configPath: "clipo.cfg",
    includeIgnoredFiles: false,
    includeIgnoredFilesSuffix: false,
    useStyles: true,
    disableAutoDetect: false,
    aiFormat: 'standard',
    includeStats: false,
    includePrompts: false,
    includeInstructions: false,
    includeLineNumbers: false,
    optimizeFor: 'generic',
    splitLargeFiles: false,
    monitor: false,
    cpymon: false,
    monitorInterval: 1000,
    verbose: false,
    createConfig: false,
    showConfigHelp: false,
  };

  const positionalArgs: string[] = [];

  // --- First Pass: Parse Flags and Options ---
  for (const arg of args) {
    if (arg.startsWith('-')) { // It's a flag or an option
      if (arg === "--help") {
        if (args.includes("-cc") || args.includes("--cc")) {
          options.showConfigHelp = true;
        } else {
          console.log(helpText);
          return null; // Exit after showing help
        }
      } else if (arg === "-cc" || arg === "--cc") {
        options.createConfig = true;
      } else if (arg.startsWith("--ai-format=")) {
        const format = arg.substring("--ai-format=".length) as CliOptions['aiFormat'];
        if (['standard', 'markdown', 'xml', 'json'].includes(format)) {
          options.aiFormat = format;
        }
      } else if (arg.startsWith("--optimize-for=")) {
        const model = arg.substring("--optimize-for=".length) as CliOptions['optimizeFor'];
        if (['gpt', 'claude', 'gemini', 'generic'].includes(model)) {
          options.optimizeFor = model;
        }
      } else if (arg.startsWith("--max-tokens=")) {
        options.maxTokens = parseInt(arg.substring("--max-tokens=".length));
      } else if (arg === "--include-stats") {
        options.includeStats = true;
      } else if (arg === "--include-prompts") {
        options.includePrompts = true;
      } else if (arg === "--include-instructions") {
        options.includeInstructions = true;
      } else if (arg === "--include-line-numbers") {
        options.includeLineNumbers = true;
      } else if (arg === "--split-large") {
        options.splitLargeFiles = true;
      } else if (arg === "--monitor") {
        options.monitor = true;
      } else if (arg === "--cpymon") {
        options.cpymon = true;
      } else if (arg.startsWith("--monitor-interval=")) {
        options.monitorInterval = parseInt(arg.substring("--monitor-interval=".length)) || 1000;
      } else if (arg === "--verbose") {
        options.verbose = true;
      } else if (arg.startsWith("--add-file=")) {
        options.addFile = arg.substring("--add-file=".length);
      } else if (arg.startsWith("--add-folder=")) {
        options.addFolder = arg.substring("--add-folder=".length);
      } else if (arg.startsWith("--add-ext=")) {
        options.addExt = arg.substring("--add-ext=".length);
      } else if (arg === "-AIF") {
        options.includeIgnoredFiles = true;
      } else if (arg === "-AIFI") {
        options.includeIgnoredFiles = true;
        options.includeIgnoredFilesSuffix = true;
      } else if (arg === "-no-style") {
        options.useStyles = false;
      } else if (arg === "--no-auto-detect") {
        options.disableAutoDetect = true;
      } else if (arg !== "-cc" && arg !== "--cc" && arg !== "--help") {
        // It's a flag, but not one we explicitly handle above as a primary action.
        // It could be a positional argument that starts with a dash.
        // We will treat it as positional for now.
        positionalArgs.push(arg);
      }
    } else {
      // --- It's a Positional Argument ---
      positionalArgs.push(arg);
    }
  }

  // --- Second Pass: Assign Positional Arguments ---
  if (positionalArgs.length > 0) {
    options.directoryPath = positionalArgs.shift()!;
  }
  if (positionalArgs.length > 0) {
    options.outputFile = positionalArgs.shift()!;
  }
  if (positionalArgs.length > 0) {
    const exts = positionalArgs.shift()!;
    options.fileExtensions = exts
      ? exts.split(",").map((ext) => (ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`))
      : [];
  }
   if (positionalArgs.length > 0) {
    options.configPath = positionalArgs.shift()!;
  }

  // --- Validation ---
  // If no directory is provided, but we aren't creating a config or showing help, it's an error.
  if (!options.directoryPath && !options.createConfig && !options.showConfigHelp) {
    console.error("Error: Missing <directory_path> argument.");
    console.log(helpText);
    return null;
  }

  return options;
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

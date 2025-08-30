# Clipo - Clip & C0de

A command-line tool designed to streamline your AI-assisted development workflow (compatible with Google Gemini, Claude, Grok, ChatGPT, and other LLMs). Clipo intelligently analyzes your project structure, automatically detects project types, and processes files with smart ignore patterns—making it effortless to share your codebase context with Large Language Models. Features real-time clipboard monitoring to automatically detect file patterns and seamlessly replace file content during development.

## 🚀 Key Features

### **📋 NEW: Clipboard Monitoring**
- **⚡ Real-time Updates**: Monitor clipboard for file replacement patterns
- **🎯 Smart Pattern Detection**: Automatically detects `// filepath` patterns
- **📁 Auto Directory Creation**: Creates nested directories automatically
- **🔄 Continuous Monitoring**: Run in background during development

### **Automatic Project Detection**
- **🔍 Smart Recognition**: Automatically detects 17+ project types
- **📋 Intelligent Defaults**: Applies appropriate ignore patterns based on project type
- **⚡ Zero Configuration**: Works out of the box with sensible defaults

### **Supported Project Types**
- 🚀 **Frontend**: Next.js, Vue.js, React, Nuxt.js
- 🟨 **JavaScript/TypeScript**: Node.js, Deno
- 🐍 **Python**: pip, poetry, conda environments
- 🦀 **Rust**: Cargo projects
- 🐹 **Go**: Go modules
- 🔧 **C/C++**: Make, CMake projects
- ☕ **Java**: Maven, Gradle
- 💎 **Ruby**: Bundler projects
- 🟣 **C#/.NET**: MSBuild projects
- 🐘 **PHP**: Composer projects
- 🍎 **Swift**: SPM, Xcode projects
- 🏗️ **IoT**: Arduino, ESP-IDF
- 🎯 **Kotlin**: Gradle projects

### **Enhanced Configuration System**
- **📄 Robust Config Parsing**: Better handling of complex configurations
- **🔄 Auto-generated Configs**: Creates intelligent default configurations
- **🛠️ Flexible Override**: Manual override options for all settings
- **📝 Human-readable Format**: Clean, commented configuration files

## 📦 Installation

#### Global Deno Installation
```bash
# Install globally using Deno (requires repository to be public)
deno install --global --allow-read --allow-write --allow-run --name clipo https://raw.githubusercontent.com/Devt7/clipo/main/clipo.ts

# Alternative: Install from local clone
git clone https://github.com/Devt7/clipo.git
cd clipo
deno task install
```

#### Build from Source
```bash
# Clone the repository
git clone https://github.com/Devt7/CopyFileContents_deno.git
cd CopyFileContents_deno

# Build for current platform (executable created in build/ folder)
deno task build

# Build for all platforms (all executables in build/ folder)
deno task build-all

# Install globally
deno task install

# Run the locally built executable
./build/clipo . --help
```

## 📋 Clipboard Monitoring

### How It Works

The clipboard monitor watches for clipboard content that starts with a file path comment in this format:

```
// <filepath>
<file_content>
```

When detected, it automatically creates or updates the specified file with the provided content.

### Usage Examples

#### Starting Clipboard Monitor

```bash
# Start monitoring current directory
clipo . --monitor

# Monitor with verbose output
clipo . --monitor --verbose

# Custom check interval (500ms)
clipo . --monitor --monitor-interval=500 --verbose
```

#### Example File Creation

Copy this to your clipboard:
```
// src/components/Button.tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button 
      onClick={onClick} 
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}
```

Result: The file `src/components/Button.tsx` will be created with the content.

#### Code Section Replacement

Clipo also supports targeted code replacement using search-and-replace patterns. This allows you to make precise edits without replacing entire files:

```
// project/file.ext
------- SEARCH
      collapsed: false,
      setCollapsed: (val) => set({ collapsed: val }),
=======
      collapsed: true,
      setCollapsed: (val) => set({ collapsed: val }),
+++++++ REPLACE
```

**Pattern Structure:**
- `// filepath` - Target file path
- `------- SEARCH` - Marks the beginning of code to find
- `=======` - Separator between search and replacement
- `+++++++ REPLACE` - Marks the end of replacement code

**Features:**
- **Precise Targeting**: Only replaces the exact code block you specify
- **Safe Replacement**: Preserves surrounding code structure
- **Context Aware**: Maintains proper indentation and formatting
- **Error Handling**: Reports if search pattern is not found

Copy the pattern above to your clipboard while monitoring is active, and Clipo will find the search block and replace it with the replacement block in the specified file.

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `--monitor` | Enable clipboard monitoring mode | `false` |
| `--monitor-interval=<ms>` | Check interval in milliseconds | `1000` |
| `--verbose` | Enable verbose logging | `false` |

### Important Notes

- **macOS Only**: Currently uses `pbpaste` command (macOS-specific)
- **File Overwrites**: Existing files will be completely replaced with new content
- **Directory Creation**: Directories are created automatically if they don't exist
- **Process Control**: Use `Ctrl+C` to stop monitoring

### 🤖 Optimized AI Prompts

To maximize efficiency when working with AI assistants, use these optimized prompts:

#### For Complete File Generation
```
Reply only with code in this exact structure — no extra text.

One file per message.

Start with: // <filepath>

Then a newline and the complete file contents.

End with a closing ``` on its own line.
```

#### For Targeted Code Changes
```
Reply only with the search-and-replace pattern in this exact structure:

// <filepath>
------- SEARCH
[exact code to find]
=======
[replacement code]
+++++++ REPLACE

Use this format for precise edits without replacing entire files.
```

These prompts ensure your AI responses are immediately compatible with Clipo's clipboard monitoring system.

## 🚀 Basic Usage

### File Processing
```bash
# Auto-detect and process current directory
clipo .

# Process with output file
clipo /path/to/project output.txt

# Include specific file extensions only
clipo /path/to/project output.txt .js,.ts,.md

# AI-optimized output
clipo . output.md --ai-format=markdown --include-stats
```

### Advanced Options
```bash
# Disable auto-detection
clipo . --no-auto-detect

# Include ignored files in structure (marked as excluded)
clipo . -AIFI

# Add files/folders/extensions to ignore list
clipo . --add-file=secrets.txt
clipo . --add-folder=temp
clipo . --add-ext=.tmp
```

## 🔧 Configuration File

The system automatically generates intelligent configuration files (`config.json` or `clipo.cfg`):

```json
{
  "gitignore": true,
  "auto_detect_project": true,
  "project_type": "Deno",
  "output_encoding": "utf-8",
  "read_large_files": false,
  "max_large_files": "10MB",
  "ignore": {
    "files": [".DS_Store", "Thumbs.db", "deno.lock", ".env", "*.tmp"],
    "folders": [".git", "node_modules", "target", "build", ".deno", "vendor"],
    "extensions": [".tmp", ".log", ".cache", ".bin", ".obj", ".exe"]
  },
  "visual": {
    "style": true,
    "folder": "📁",
    "file": "📄",
    "excluded": "(excluded)"
  }
}
```

## 🧠 Smart Project Detection

### Detection Logic
1. **File-based Detection**: Looks for key files (e.g., `package.json`, `Cargo.toml`, `deno.json`)
2. **Folder-based Detection**: Checks for characteristic folders (e.g., `node_modules`, `target`)
3. **Pattern-based Detection**: Analyzes file patterns (e.g., `*.py`, `*.rs`, `*.go`)
4. **Priority Scoring**: Uses weighted scoring to determine the most likely project type

### Automatic Ignore Patterns

Each project type comes with curated ignore patterns:

#### **Deno Projects**
- Files: `deno.lock`, `.env`
- Folders: `.deno`, `vendor`
- Extensions: `.log`, `.cache`

#### **Node.js Projects**
- Files: `.env`, `npm-debug.log*`, `yarn-debug.log*`
- Folders: `node_modules`, `dist`, `build`, `coverage`
- Extensions: `.log`, `.lock`, `.tgz`

#### **Python Projects**
- Files: `.env`, `*.pyc`, `*.pyo`, `pip-log.txt`
- Folders: `__pycache__`, `venv`, `.venv`, `.pytest_cache`
- Extensions: `.pyc`, `.pyo`, `.egg`, `.whl`

#### **Rust Projects**
- Files: `Cargo.lock` (in some contexts)
- Folders: `target`, `.cargo`
- Extensions: `.rlib`, `.rmeta`, `.crate`

## 🛠️ Development Workflow Integration

### VS Code Integration
Add to your `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Clipo Monitor",
      "type": "shell",
      "command": "clipo",
      "args": [".", "--monitor", "--verbose"],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    }
  ]
}
```

### Use Cases

1. **Code Sharing**: Quickly share and apply code snippets from colleagues
2. **Template Application**: Apply code templates with proper file paths
3. **Rapid Prototyping**: Quickly create multiple files from copied examples
4. **Documentation to Code**: Convert documentation examples directly to files
5. **AI-Generated Code**: Apply AI-generated code snippets to specific files

## 🔒 Security & Permissions

The tool requires the following permissions:
- **File system access** (`--allow-read`, `--allow-write`): For reading and creating files
- **Process spawning** (`--allow-run`): For clipboard access on macOS
- **No network access required** for core functionality

## 🐛 Troubleshooting

### Installation Issues

#### "Permission denied" error
```bash
chmod +x clipo
```

#### "Command not found" error
Make sure the executable is in your PATH:
```bash
echo $PATH
which clipo
```

### Clipboard Monitoring Issues

#### Monitor not detecting clipboard changes
- Ensure clipboard content starts with `// ` followed by a file path
- Check that the monitor is running and not stopped
- Try copying the content again

#### File not created/updated
- Verify the file path is valid and accessible
- Check directory permissions
- Look for error messages in verbose mode

### Platform-Specific Notes

#### macOS
- **Clipboard monitoring**: Uses `pbpaste` command (built-in)
- **Gatekeeper**: You may need to allow the executable in System Preferences > Security & Privacy

#### Linux
- **Clipboard monitoring**: Requires `xclip` or `xsel` (need to modify for Linux support)
- **Dependencies**: Standalone - no additional dependencies needed

#### Windows
- **Clipboard monitoring**: Requires PowerShell access (need to modify for Windows support)
- **Path**: Add to your system PATH for global access

## 📞 Support

- **Issues**: Create an issue on GitHub
- **Documentation**: Check this README for complete information
- **Updates**: Watch the repository for new releases

## � What's New in This Version

### **Enhanced Project Detection**
- Added support for 17+ project types with intelligent scoring
- Multi-project detection (e.g., detects both Deno and C/C++ in projects with CMakeLists.txt)
- Configurable detection sensitivity and priority

### **Robust Configuration System**
- Better config file parsing with error recovery
- Auto-generation of commented, structured config files
- Smart merging of user preferences with detected defaults
- Support for complex configuration hierarchies

### **Improved User Experience**
- Rich console output with emoji indicators
- Clear project detection feedback
- Better error messages and warnings
- Self-contained executables with no dependencies

### **Clipboard Monitoring (NEW!)**
- Real-time clipboard watching for development workflow
- Automatic file creation and updates
- Pattern-based file path detection
- Cross-platform support (macOS ready, Linux/Windows adaptable)
- Comprehensive help documentation

### **Performance & Reliability**
- Faster project detection with caching
- Better handling of edge cases and errors
- More efficient file processing
- Reduced memory usage for large projects

## 📚 Examples

### **Detected Output Examples**

```bash
$ deno run --allow-read --allow-write main.ts .
📋 Detected project type(s): Deno, C/C++
✅ Applied default ignore patterns for Deno, C/C++
File contents written to output.txt
```

### **Generated Directory Structure**
```
// Directory Structure:
└── 📄 main.ts
└── 📄 config.ts  
└── 📄 cli.ts
└── 📄 deno.json
└── 📄 fileProcessor.ts
└── 📄 projectDetection.ts
```

## 🎯 Use Cases

- **📊 Code Analysis**: Prepare codebases for AI analysis
- **📚 Documentation**: Generate comprehensive project overviews  
- **🔄 Migration**: Understand project structure when migrating
- **👥 Onboarding**: Help new team members understand project layout
- **🛠️ DevOps**: Automated project analysis and reporting
- **📖 Learning**: Study project structures and patterns

## 🤝 Contributing

The modular architecture makes it easy to add new project types:

1. Add detection rules in `projectDetection.ts`
2. Define ignore patterns for the new project type
3. Test with real-world projects
4. Submit a PR with examples

## 📄 License

MIT License - Feel free to use in your projects!

---

**Made with ❤️ for developers who value intelligent automation**

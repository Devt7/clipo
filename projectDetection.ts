import { join, basename } from "https://deno.land/std@0.212.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.212.0/fs/mod.ts";

export interface ProjectDetectionRule {
  name: string;
  priority: number;
  files: string[];
  folders: string[];
  patterns: string[];
}

export interface DefaultIgnorePattern {
  files: string[];
  folders: string[];
  extensions: string[];
}

// Project detection rules - higher priority = checked first
export const PROJECT_DETECTION_RULES: ProjectDetectionRule[] = [
  {
    name: "Next.js",
    priority: 10,
    files: ["next.config.js", "next.config.ts", "next.config.mjs"],
    folders: [".next"],
    patterns: ["pages/", "app/", "components/"]
  },
  {
    name: "Vue.js",
    priority: 9,
    files: ["vue.config.js", "vite.config.js", "nuxt.config.js", "nuxt.config.ts"],
    folders: [".nuxt", "dist"],
    patterns: ["*.vue"]
  },
  {
    name: "React",
    priority: 8,
    files: ["package.json"], // Will check for react dependency in content
    folders: [],
    patterns: ["*.jsx", "*.tsx", "components/", "pages/", "app/"]
  },
  {
    name: "Deno",
    priority: 10, // Higher priority than Node.js
    files: ["deno.json", "deno.jsonc", "import_map.json"],
    folders: [],
    patterns: ["deps.ts", "mod.ts", "main.ts"]
  },
  {
    name: "Node.js",
    priority: 8,
    files: ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"],
    folders: ["node_modules"],
    patterns: []
  },
  {
    name: "Python",
    priority: 7,
    files: ["requirements.txt", "setup.py", "pyproject.toml", "Pipfile", "poetry.lock"],
    folders: ["__pycache__", "venv", ".venv", "env", ".env"],
    patterns: ["*.py"]
  },
  {
    name: "Rust",
    priority: 7,
    files: ["Cargo.toml", "Cargo.lock"],
    folders: ["target"],
    patterns: ["*.rs"]
  },
  {
    name: "Go",
    priority: 7,
    files: ["go.mod", "go.sum"],
    folders: ["vendor"],
    patterns: ["*.go"]
  },
  {
    name: "Arduino",
    priority: 6,
    files: ["*.ino"],
    folders: ["libraries", "hardware"],
    patterns: ["*.ino"]
  },
  {
    name: "ESP-IDF",
    priority: 8,
    files: ["CMakeLists.txt", "sdkconfig", "idf_component.yml"],
    folders: ["build", "managed_components"],
    patterns: ["main/", "components/"]
  },
  {
    name: "C/C++",
    priority: 5,
    files: ["Makefile", "CMakeLists.txt", "configure.ac"],
    folders: ["build", "obj"],
    patterns: ["*.c", "*.cpp", "*.cc", "*.cxx", "*.h", "*.hpp"]
  },
  {
    name: "Java",
    priority: 6,
    files: ["pom.xml", "build.gradle", "gradle.properties"],
    folders: ["target", "build", ".gradle"],
    patterns: ["*.java"]
  },
  {
    name: "C#/.NET",
    priority: 6,
    files: ["*.csproj", "*.sln", "project.json", "packages.config"],
    folders: ["bin", "obj", "packages"],
    patterns: ["*.cs"]
  },
  {
    name: "PHP",
    priority: 5,
    files: ["composer.json", "composer.lock"],
    folders: ["vendor"],
    patterns: ["*.php"]
  },
  {
    name: "Ruby",
    priority: 5,
    files: ["Gemfile", "Gemfile.lock", "Rakefile"],
    folders: ["vendor/bundle"],
    patterns: ["*.rb"]
  },
  {
    name: "Swift",
    priority: 6,
    files: ["Package.swift", "*.xcodeproj", "*.xcworkspace"],
    folders: [".build", "DerivedData"],
    patterns: ["*.swift"]
  },
  {
    name: "Kotlin",
    priority: 6,
    files: ["build.gradle.kts", "settings.gradle.kts"],
    folders: ["build", ".gradle"],
    patterns: ["*.kt", "*.kts"]
  }
];

// Default ignore patterns for each project type
export const DEFAULT_IGNORE_PATTERNS: Record<string, DefaultIgnorePattern> = {
  "Next.js": {
    files: [".env.local", ".env.development.local", ".env.test.local", ".env.production.local"],
    folders: [".next", "out", "dist", "node_modules", ".vercel", ".netlify"],
    extensions: [".log", ".lock"]
  },
  "Vue.js": {
    files: [".env.local", ".env.*.local"],
    folders: ["dist", "node_modules", ".nuxt", ".output", ".cache", ".temp"],
    extensions: [".log", ".lock"]
  },
  "React": {
    files: [".env.local", ".env.development.local", ".env.test.local", ".env.production.local"],
    folders: ["build", "dist", "node_modules", ".cache"],
    extensions: [".log", ".lock"]
  },
  "Deno": {
    files: ["deno.lock", ".env"],
    folders: [".deno", "vendor"],
    extensions: [".log", ".cache"]
  },
  "Node.js": {
    files: [".env", ".env.local", ".env.*.local", "npm-debug.log*", "yarn-debug.log*", "yarn-error.log*"],
    folders: ["node_modules", "dist", "build", ".nyc_output", "coverage", ".cache"],
    extensions: [".log", ".lock", ".tgz", ".tar.gz"]
  },
  "Python": {
    files: [".env", "*.pyc", "*.pyo", "*.pyd", ".Python", "pip-log.txt", "pip-delete-this-directory.txt"],
    folders: ["__pycache__", "*.egg-info", "dist", "build", ".pytest_cache", ".coverage", ".mypy_cache", "venv", ".venv", "env", ".env", "ENV", "env.bak", "venv.bak"],
    extensions: [".pyc", ".pyo", ".pyd", ".so", ".egg", ".whl"]
  },
  "Rust": {
    files: ["Cargo.lock"],
    folders: ["target", ".cargo"],
    extensions: [".rlib", ".rmeta", ".crate"]
  },
  "Go": {
    files: ["go.sum"],
    folders: ["vendor", "bin", "pkg"],
    extensions: [".exe", ".test", ".prof"]
  },
  "Arduino": {
    files: ["*.hex", "*.bin", "*.elf"],
    folders: ["build", ".vscode"],
    extensions: [".hex", ".bin", ".elf", ".map", ".lst"]
  },
  "ESP-IDF": {
    files: ["sdkconfig.old", "*.bin", "*.elf", "*.map"],
    folders: ["build", "managed_components", ".espressif"],
    extensions: [".bin", ".elf", ".map", ".hex"]
  },
  "C/C++": {
    files: ["*.o", "*.obj", "*.exe", "*.dll", "*.so", "*.dylib", "core", "a.out"],
    folders: ["build", "bin", "obj", ".vs", "Debug", "Release"],
    extensions: [".o", ".obj", ".exe", ".dll", ".so", ".dylib", ".a", ".lib", ".pdb", ".ilk", ".exp"]
  },
  "Java": {
    files: ["*.class", "*.jar", "*.war", "*.ear", "hs_err_pid*"],
    folders: ["target", "build", ".gradle", ".mvn", "bin"],
    extensions: [".class", ".jar", ".war", ".ear"]
  },
  "C#/.NET": {
    files: ["*.exe", "*.dll", "*.pdb", "*.cache"],
    folders: ["bin", "obj", "packages", ".vs", ".vscode", "TestResults"],
    extensions: [".exe", ".dll", ".pdb", ".cache", ".user", ".suo"]
  },
  "PHP": {
    files: [".env", "composer.phar"],
    folders: ["vendor", "storage/logs", "bootstrap/cache"],
    extensions: [".log"]
  },
  "Ruby": {
    files: [".env", "*.gem", ".bundle"],
    folders: ["vendor/bundle", ".bundle", "log", "tmp"],
    extensions: [".gem", ".rbc"]
  },
  "Swift": {
    files: ["*.xcuserstate", "*.xcuserdatad"],
    folders: [".build", "DerivedData", "xcuserdata", ".swiftpm"],
    extensions: [".xcuserstate", ".xcuserdatad"]
  },
  "Kotlin": {
    files: ["*.class", "*.jar", "*.war", "*.ear"],
    folders: ["build", ".gradle", "bin"],
    extensions: [".class", ".jar", ".war", ".ear"]
  }
};

// Common ignore patterns that apply to most projects
export const COMMON_IGNORE_PATTERNS: DefaultIgnorePattern = {
  files: [".DS_Store", "Thumbs.db", "desktop.ini", "*.swp", "*.swo", "*~"],
  folders: [".git", ".svn", ".hg", ".idea", ".vscode", "*.tmp", "tmp", "temp"],
  extensions: [".tmp", ".temp", ".bak", ".backup", ".old"]
};

export async function detectProjectType(dirPath: string): Promise<string[]> {
  const detectedTypes: Array<{ name: string; priority: number; confidence: number }> = [];

  // Sort rules by priority (higher first)
  const sortedRules = PROJECT_DETECTION_RULES.sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    let confidence = 0;
    let matchCount = 0;
    let totalChecks = 0;

    // Check for specific files
    for (const file of rule.files) {
      totalChecks++;
      if (file.includes('*')) {
        // Handle glob patterns for files like *.ino
        try {
          const files: string[] = [];
          for await (const dirEntry of Deno.readDir(dirPath)) {
            if (dirEntry.isFile) {
              files.push(dirEntry.name);
            }
          }
          // More precise regex for file extensions - must end with the extension
          let regex: RegExp;
          if (file.startsWith('*.')) {
            const ext = file.substring(2);
            regex = new RegExp(`\\.${ext}$`);
          } else {
            regex = new RegExp('^' + file.replace('*', '[^.]*') + '$');
          }
          if (files.some(f => regex.test(f))) {
            confidence += 4; // Strong indicator for pattern files
            matchCount++;
          }
        } catch {
          // Ignore errors reading directory
        }
      } else if (await exists(join(dirPath, file))) {
        // Special handling for package.json to check React dependency
        if (file === "package.json" && rule.name === "React") {
          try {
            const packageContent = await Deno.readTextFile(join(dirPath, file));
            const packageJson = JSON.parse(packageContent);
            const hasReact = (packageJson.dependencies?.react || packageJson.devDependencies?.react);
            if (hasReact) {
              confidence += 5; // Very strong indicator
              matchCount++;
            }
          } catch {
            // Fallback to file existence
            confidence += 3;
            matchCount++;
          }
        } else {
          // Special handling for C/C++ - require both build files AND source files
          if (rule.name === "C/C++" && ["Makefile", "CMakeLists.txt", "configure.ac"].includes(file)) {
            // For C/C++, only count build files if we also have C/C++ source files
            try {
              const files: string[] = [];
              for await (const dirEntry of Deno.readDir(dirPath)) {
                if (dirEntry.isFile) {
                  files.push(dirEntry.name);
                }
              }
              const hasCppSources = files.some(f => /\.(c|cpp|cc|cxx|c\+\+)$/i.test(f));
              if (hasCppSources) {
                confidence += 3;
                matchCount++;
              }
            } catch {
              // Don't count build files without source files
            }
          } else {
            confidence += 3; // Files are strong indicators
            matchCount++;
          }
        }
      }
    }

    // Check for specific folders
    for (const folder of rule.folders) {
      totalChecks++;
      if (await exists(join(dirPath, folder))) {
        confidence += 2; // Folders are medium indicators
        matchCount++;
      }
    }

    // Check for patterns (improved pattern matching)
    if (rule.patterns.length > 0) {
      try {
        const allFiles: string[] = [];
        const allDirs: string[] = [];
        
        // Recursively collect files and directories (limited depth)
        const collectFiles = async (currentPath: string, depth = 0) => {
          if (depth > 2) return; // Limit recursion depth
          
          for await (const dirEntry of Deno.readDir(currentPath)) {
            if (dirEntry.isFile) {
              allFiles.push(dirEntry.name);
            } else if (dirEntry.isDirectory) {
              allDirs.push(dirEntry.name + '/');
              // Only recurse into common source directories
              if (['src', 'lib', 'app', 'pages', 'components', 'main'].includes(dirEntry.name)) {
                await collectFiles(join(currentPath, dirEntry.name), depth + 1);
              }
            }
          }
        };
        
        await collectFiles(dirPath);
        
        for (const pattern of rule.patterns) {
          totalChecks++;
          let matchesPattern = false;
          
          if (pattern.includes('*')) {
            let regex: RegExp;
            if (pattern.startsWith('*.')) {
              const ext = pattern.substring(2);
              regex = new RegExp(`\\.${ext}$`);
            } else {
              regex = new RegExp(pattern.replace('*', '.*'));
            }
            matchesPattern = allFiles.some(file => regex.test(file));
          } else if (pattern.endsWith('/')) {
            // Directory pattern
            matchesPattern = allDirs.some(dir => dir === pattern);
          } else {
            // Exact file match
            matchesPattern = allFiles.includes(pattern);
          }
          
          if (matchesPattern) {
            confidence += 1; // Patterns are weaker indicators
            matchCount++;
          }
        }
      } catch {
        // Ignore errors reading directory
      }
    }

    // Only consider if we have some matches and minimum confidence
    if (matchCount > 0 && confidence >= 2) {
      const normalizedConfidence = totalChecks > 0 ? confidence / Math.max(totalChecks, rule.files.length + rule.folders.length) : 0;
      detectedTypes.push({
        name: rule.name,
        priority: rule.priority,
        confidence: normalizedConfidence
      });
    }
  }

  // Sort by confidence first, then by priority
  detectedTypes.sort((a, b) => {
    if (Math.abs(a.confidence - b.confidence) < 0.2) {
      return b.priority - a.priority;
    }
    return b.confidence - a.confidence;
  });

  // Limit results to avoid too many false positives
  return detectedTypes.slice(0, 3).map(t => t.name);
}

export function getDefaultIgnorePatterns(projectTypes: string[]): DefaultIgnorePattern {
  const combined: DefaultIgnorePattern = {
    files: [...COMMON_IGNORE_PATTERNS.files],
    folders: [...COMMON_IGNORE_PATTERNS.folders],
    extensions: [...COMMON_IGNORE_PATTERNS.extensions]
  };

  // Merge patterns from all detected project types
  for (const projectType of projectTypes) {
    const patterns = DEFAULT_IGNORE_PATTERNS[projectType];
    if (patterns) {
      combined.files.push(...patterns.files);
      combined.folders.push(...patterns.folders);
      combined.extensions.push(...patterns.extensions);
    }
  }

  // Remove duplicates
  combined.files = [...new Set(combined.files)];
  combined.folders = [...new Set(combined.folders)];
  combined.extensions = [...new Set(combined.extensions)];

  return combined;
}

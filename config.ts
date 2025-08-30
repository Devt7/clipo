import { join, basename } from "https://deno.land/std@0.212.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.212.0/fs/mod.ts";
import { detectProjectType, getDefaultIgnorePatterns } from "./projectDetection.ts";

export interface Config {
  useGitignore?: boolean;
  ignoreFiles?: string[];
  ignoreFolders?: string[];
  ignoreExtensions?: string[];
  visual?: {
    style?: string;
    folder?: string;
    file?: string;
    excluded?: string;
    [key: string]: string | undefined;
  };
  output_encoding?: string;
  read_large_files?: boolean;
  max_large_files?: string;
  auto_detect_project?: boolean;
  project_type?: string;
}

export const DEFAULT_CONFIG_PATH = "clipo.cfg";

export async function loadConfig(
  configPath: string = DEFAULT_CONFIG_PATH,
  projectPath: string = ".",
  disableAutoDetect: boolean = false
): Promise<Config> {
  let config: Config = {};

  // Try to load existing config file
  try {
    const configContent = await Deno.readTextFile(configPath);
    config = parseConfigFile(configContent);
  } catch (error) {
    console.warn(
      `Config file '${configPath}' not found or invalid: ${error}. Using defaults.`
    );
  }

  // Set defaults if not specified
  config.useGitignore = config.useGitignore ?? true;
  config.auto_detect_project = config.auto_detect_project ?? true;
  config.read_large_files = config.read_large_files ?? false;
  config.max_large_files = config.max_large_files ?? "10MB";
  config.output_encoding = config.output_encoding ?? "utf-8";

  // Override auto-detection if disabled via CLI
  if (disableAutoDetect) {
    config.auto_detect_project = false;
  }

  // Auto-detect project type and apply defaults if enabled
  if (config.auto_detect_project) {
    const detectedTypes = await detectProjectType(projectPath);
    
    if (detectedTypes.length > 0) {
      // Prefer Deno as primary when deno.json/deno.jsonc exists at root
      try {
        const hasDenoJson = await exists(join(projectPath, "deno.json")) || await exists(join(projectPath, "deno.jsonc"));
        const denoIdx = detectedTypes.indexOf("Deno");
        if (hasDenoJson && denoIdx > 0) {
          detectedTypes.splice(denoIdx, 1);
          detectedTypes.unshift("Deno");
        }
      } catch {
        // ignore
      }

      config.project_type = detectedTypes[0]; // Primary detected type
      console.log(`📋 Detected project type(s): ${detectedTypes.join(", ")}`);
      console.log(`⭐ Primary project type: ${config.project_type}`);
      
      // Apply default ignore patterns if not already configured
      const defaultPatterns = getDefaultIgnorePatterns(detectedTypes);
      
      // Merge with existing patterns (existing takes precedence)
      config.ignoreFiles = mergeArrays(config.ignoreFiles, defaultPatterns.files);
      config.ignoreFolders = mergeArrays(config.ignoreFolders, defaultPatterns.folders);
      config.ignoreExtensions = mergeArrays(config.ignoreExtensions, defaultPatterns.extensions);
      
      console.log(`✅ Applied default ignore patterns for ${detectedTypes.join(", ")}`);
    } else {
      console.log("🔍 No specific project type detected, using minimal defaults");
    }
  }

  // Ensure visual config exists
  if (!config.visual) {
    config.visual = {
      style: "true",
      folder: "📁",
      file: "📄",
      excluded: "(excluded)"
    };
  }

  return config;
}

function mergeArrays(existing?: string[], defaults: string[] = []): string[] {
  if (!existing || existing.length === 0) {
    return [...defaults];
  }
  
  // Merge and deduplicate
  const combined = [...existing, ...defaults];
  return [...new Set(combined)];
}

export function parseConfigFile(configContent: string): Config {
  const config: Config = {};
  const lines = configContent.split("\n");
  let inVisualSection = false;
  let visual: { [key: string]: string } = {};

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine === "" || trimmedLine.startsWith("#")) {
      continue;
    }

    if (trimmedLine === "visual:") {
      inVisualSection = true;
      continue;
    }

    const colonIndex = trimmedLine.indexOf(":");
    if (colonIndex === -1) continue;
    
    const key = trimmedLine.substring(0, colonIndex).trim();
    const value = trimmedLine.substring(colonIndex + 1).trim();

    if (inVisualSection) {
      visual[key] = value;
      continue;
    }

    switch (key) {
      case "gitignore":
        config.useGitignore = value.toLowerCase() === "true";
        break;
      case "auto_detect_project":
        config.auto_detect_project = value.toLowerCase() === "true";
        break;
      case "project_type":
        config.project_type = value;
        break;
      case "files":
        config.ignoreFiles = parseListValue(value);
        break;
      case "folders":
        config.ignoreFolders = parseListValue(value);
        break;
      case "ext":
        config.ignoreExtensions = parseListValue(value);
        break;
      case "output_encoding":
        config.output_encoding = value;
        break;
      case "read_large_files":
        config.read_large_files = value.toLowerCase() === "true";
        break;
      case "max_large_files":
        config.max_large_files = value;
        break;
    }
  }

  if (Object.keys(visual).length > 0) {
    config.visual = visual;
  }

  return config;
}

function parseListValue(value: string): string[] {
  if (!value || value.trim() === "") return [];
  
  return value
    .split(",")
    .map(s => s.trim())
    .filter(s => s !== "");
}

export async function writeConfig(
  config: Config,
  configPath: string = DEFAULT_CONFIG_PATH
): Promise<void> {
  const lines: string[] = [];
  
  // Add header comment
  lines.push("# Clipo Configuration");
  lines.push("# Auto-generated configuration file");
  lines.push("");

  // Core settings
  lines.push("# Core Settings");
  lines.push(`gitignore: ${config.useGitignore === true ? "true" : "false"}`);
  lines.push(`auto_detect_project: ${config.auto_detect_project === true ? "true" : "false"}`);
  
  if (config.project_type) {
    lines.push(`project_type: ${config.project_type}`);
  }
  
  lines.push(`output_encoding: ${config.output_encoding || "utf-8"}`);
  lines.push(`read_large_files: ${config.read_large_files === true ? "true" : "false"}`);
  lines.push(`max_large_files: ${config.max_large_files || "10MB"}`);
  lines.push("");

  // Ignore patterns
  lines.push("# Ignore Patterns");
  lines.push(`files: ${formatListValue(config.ignoreFiles)}`);
  lines.push(`folders: ${formatListValue(config.ignoreFolders)}`);
  lines.push(`ext: ${formatListValue(config.ignoreExtensions)}`);
  lines.push("");

  // Visual settings
  if (config.visual && Object.keys(config.visual).length > 0) {
    lines.push("# Visual Settings");
    lines.push("visual:");
    for (const [key, value] of Object.entries(config.visual)) {
      if (value !== undefined) {
        lines.push(`   ${key}: ${value}`);
      }
    }
  }

  await Deno.writeTextFile(configPath, lines.join("\n"));
}

function formatListValue(items?: string[]): string {
  if (!items || items.length === 0) return "";
  return items.join(", ");
}

export async function readGitignore(dirPath: string): Promise<string[]> {
  const gitignorePath = join(dirPath, ".gitignore");

  if (!(await Deno.stat(gitignorePath).catch(() => null))) {
    return [];
  }

  try {
    const gitignoreContent = await Deno.readTextFile(gitignorePath);
    return gitignoreContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
  } catch (error) {
    console.warn(
      `Failed to read .gitignore file: ${error}. Ignoring .gitignore.`
    );
    return [];
  }
}

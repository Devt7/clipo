import { join } from "https://deno.land/std@0.212.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.212.0/fs/mod.ts";

export interface AIProjectConfig {
  name: string;
  extends?: string;
  instructions: string[];
  prompts: string[];
  contextualPrompts: {
    small: string[];
    medium: string[];
    large: string[];
  };
  keyFiles?: string[];
  analysisAreas?: string[];
  formatSettings?: {
    includeLineNumbers: boolean;
    addSeparators: boolean;
    includeFileSummary: boolean;
    includeMetadata: boolean;
  };
}

export interface AIFormattingOptions {
  format: 'standard' | 'markdown' | 'xml' | 'json';
  includeStats: boolean;
  includeInstructions: boolean;
  includePrompts: boolean;
  optimizeFor: 'gpt' | 'claude' | 'gemini' | 'generic';
  projectType?: string;
  maxTokens?: number;
}

export interface CodebaseStats {
  totalFiles: number;
  totalLines: number;
  totalChars: number;
  estimatedTokens: number;
  fileTypes: Record<string, number>;
  largestFiles: Array<{ path: string; lines: number; size: number }>;
  projectComplexity: 'small' | 'medium' | 'large';
}

// Project type to config file mapping
const PROJECT_CONFIG_MAP: Record<string, string> = {
  "Next.js": "nextjs.json",
  "Node.js": "nodejs.json", 
  "Deno": "deno.json",
  "Python": "python.json",
  "ESP-IDF": "esp-idf.json",
  "React": "nodejs.json", // React often uses Node.js patterns
  "Vue.js": "nodejs.json", // Vue.js often uses Node.js patterns
  "TypeScript": "nodejs.json", // TypeScript often Node.js patterns
};

async function loadProjectConfig(projectType?: string): Promise<AIProjectConfig> {
  const configsDir = join(Deno.cwd(), "ai-configs");
  
  // Load base configuration
  const baseConfigPath = join(configsDir, "base.json");
  let baseConfig: AIProjectConfig;
  
  try {
    const baseText = await Deno.readTextFile(baseConfigPath);
    baseConfig = JSON.parse(baseText);
  } catch {
    // Fallback base config if file doesn't exist
    baseConfig = {
      name: "Default Configuration",
      instructions: [
        "Read the entire codebase before providing suggestions",
        "Consider the project structure and existing patterns",
        "Provide specific, actionable recommendations"
      ],
      prompts: [
        "What is the overall structure of this codebase?",
        "What are the main components and their responsibilities?",
        "Are there any potential improvements or issues?"
      ],
      contextualPrompts: {
        small: ["What does this code do?"],
        medium: ["How is this code organized?"],
        large: ["What is the architecture of this system?"]
      }
    };
  }

  // If no project type specified, return base config
  if (!projectType || !PROJECT_CONFIG_MAP[projectType]) {
    return baseConfig;
  }

  // Load project-specific configuration
  const projectConfigFile = PROJECT_CONFIG_MAP[projectType];
  const projectConfigPath = join(configsDir, projectConfigFile);
  
  if (!(await exists(projectConfigPath))) {
    return baseConfig;
  }

  try {
    const projectText = await Deno.readTextFile(projectConfigPath);
    const projectConfig: AIProjectConfig = JSON.parse(projectText);
    
    // Merge with base config if extends is specified
    if (projectConfig.extends) {
      return {
        ...baseConfig,
        ...projectConfig,
        instructions: [...(baseConfig.instructions || []), ...(projectConfig.instructions || [])],
        prompts: [...(baseConfig.prompts || []), ...(projectConfig.prompts || [])],
        contextualPrompts: {
          small: [...(baseConfig.contextualPrompts?.small || []), ...(projectConfig.contextualPrompts?.small || [])],
          medium: [...(baseConfig.contextualPrompts?.medium || []), ...(projectConfig.contextualPrompts?.medium || [])],
          large: [...(baseConfig.contextualPrompts?.large || []), ...(projectConfig.contextualPrompts?.large || [])]
        }
      };
    }
    
    return projectConfig;
  } catch {
    return baseConfig;
  }
}

export async function calculateCodebaseStats(content: string): Promise<CodebaseStats> {
  const sections = content.split('\n\n');
  const files: Array<{ path: string; lines: number; chars: number; type: string }> = [];
  const fileTypes: Record<string, number> = {};
  
  let totalLines = 0;
  let totalChars = content.length;
  
  for (const section of sections) {
    if (section.startsWith('//') && !section.startsWith('// Directory Structure:')) {
      const lines = section.split('\n');
      const filePath = lines[0].replace('//', '').trim();
      const fileContent = lines.slice(1).join('\n');
      const fileLines = lines.length - 1;
      const fileType = detectLanguage(filePath);
      
      files.push({
        path: filePath,
        lines: fileLines,
        chars: fileContent.length,
        type: fileType
      });
      
      totalLines += fileLines;
      fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;
    }
  }
  
  // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil(totalChars / 4);
  
  // Determine complexity based on size and file count
  let projectComplexity: 'small' | 'medium' | 'large' = 'small';
  if (files.length > 20 || totalLines > 5000) projectComplexity = 'medium';
  if (files.length > 50 || totalLines > 15000) projectComplexity = 'large';
  
  // Get largest files
  const largestFiles = files
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 5)
    .map(f => ({ path: f.path, lines: f.lines, size: f.chars }));
  
  return {
    totalFiles: files.length,
    totalLines,
    totalChars,
    estimatedTokens,
    fileTypes,
    largestFiles,
    projectComplexity
  };
}

export async function formatForAI(
  content: string,
  options: AIFormattingOptions
): Promise<string> {
  const config = await loadProjectConfig(options.projectType);
  const stats = await calculateCodebaseStats(content);
  const sections: string[] = [];

  // Add header with metadata
  sections.push(
    `# 🤖 ${config.name}`,
    "",
    `**Generated:** ${new Date().toISOString()}`,
    options.projectType ? `**Project Type:** ${options.projectType}` : "",
    `**Optimized for:** ${options.optimizeFor.toUpperCase()}`,
    "",
    "---",
    ""
  );

  // Add statistics if requested
  if (options.includeStats) {
    sections.push(
      "## 📊 Codebase Statistics",
      "",
      `- **Files:** ${stats.totalFiles}`,
      `- **Lines:** ${stats.totalLines.toLocaleString()}`,
      `- **Estimated Tokens:** ~${stats.estimatedTokens.toLocaleString()}`,
      `- **Complexity:** ${stats.projectComplexity}`,
      ""
    );

    if (Object.keys(stats.fileTypes).length > 0) {
      sections.push("**File Types:**");
      Object.entries(stats.fileTypes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          sections.push(`- ${type}: ${count} files`);
        });
      sections.push("");
    }

    sections.push("---", "");
  }

  // Add project-specific instructions
  if (options.includeInstructions && config.instructions.length > 0) {
    sections.push(
      "## 🎯 Analysis Instructions",
      "",
      ...config.instructions.map(instruction => `- ${instruction}`),
      "",
      "---",
      ""
    );
  }

  // Add contextual prompts based on project complexity
  if (options.includePrompts) {
    const contextualPrompts = config.contextualPrompts[stats.projectComplexity] || [];
    const allPrompts = [...config.prompts, ...contextualPrompts];
    
    if (allPrompts.length > 0) {
      sections.push(
        "## 💡 Suggested Analysis Questions",
        "",
        ...allPrompts.map(prompt => `- ${prompt}`),
        "",
        "---",
        ""
      );
    }
  }

  // Add key files section if available
  if (config.keyFiles && config.keyFiles.length > 0) {
    sections.push(
      "## 🔑 Key Files to Focus On",
      "",
      ...config.keyFiles.map(file => `- \`${file}\``),
      "",
      "---",
      ""
    );
  }

  // Add analysis areas if available
  if (config.analysisAreas && config.analysisAreas.length > 0) {
    sections.push(
      "## 🔍 Analysis Areas",
      "",
      ...config.analysisAreas.map(area => `- ${area}`),
      "",
      "---",
      ""
    );
  }

  // Format and add the main content
  let formattedContent: string;
  
  switch (options.format) {
    case 'markdown':
      formattedContent = formatAsMarkdown(content);
      break;
    case 'xml':
      formattedContent = formatAsXML(content);
      break;
    case 'json':
      formattedContent = formatAsJSON(content, stats);
      break;
    default:
      formattedContent = content;
  }

  sections.push(formattedContent);

  // Add token warning if needed
  if (stats.estimatedTokens > 100000) {
    sections.push(
      "",
      "---",
      "",
      "⚠️ **Large Codebase Notice:** This codebase is substantial. Consider focusing on specific modules or asking targeted questions.",
      ""
    );
  }

  return sections.join('\n');
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'js': 'javascript',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'dockerfile': 'dockerfile'
  };
  
  return languageMap[ext] || 'text';
}

function formatAsMarkdown(content: string): string {
  const sections = content.split('\n\n');
  const formatted: string[] = [];

  for (const section of sections) {
    if (section.startsWith('// Directory Structure:')) {
      formatted.push('## 📁 Directory Structure\n\n```');
      formatted.push(section.replace('// Directory Structure:\n', ''));
      formatted.push('```\n');
    } else if (section.startsWith('//')) {
      const [filePath, ...contentLines] = section.split('\n');
      const fileName = filePath.replace('//', '').trim();
      const language = detectLanguage(fileName);
      
      formatted.push(`## 📄 \`${fileName}\`\n`);
      formatted.push(`\`\`\`${language}`);
      formatted.push(contentLines.join('\n'));
      formatted.push('```\n');
    }
  }

  return formatted.join('\n');
}

function formatAsXML(content: string): string {
  const sections = content.split('\n\n');
  const formatted: string[] = ['<codebase>'];

  for (const section of sections) {
    if (section.startsWith('// Directory Structure:')) {
      formatted.push('  <directory-structure>');
      formatted.push(`    <![CDATA[${section.replace('// Directory Structure:\n', '')}]]>`);
      formatted.push('  </directory-structure>');
    } else if (section.startsWith('//')) {
      const [filePath, ...contentLines] = section.split('\n');
      const fileName = filePath.replace('//', '').trim();
      const language = detectLanguage(fileName);
      
      formatted.push(`  <file path="${fileName}" language="${language}">`);
      formatted.push(`    <![CDATA[${contentLines.join('\n')}]]>`);
      formatted.push('  </file>');
    }
  }

  formatted.push('</codebase>');
  return formatted.join('\n');
}

function formatAsJSON(content: string, stats: CodebaseStats): string {
  const sections = content.split('\n\n');
  const result: any = { 
    metadata: {
      totalFiles: stats.totalFiles,
      totalLines: stats.totalLines,
      estimatedTokens: stats.estimatedTokens,
      complexity: stats.projectComplexity
    },
    files: [], 
    directoryStructure: '' 
  };

  for (const section of sections) {
    if (section.startsWith('// Directory Structure:')) {
      result.directoryStructure = section.replace('// Directory Structure:\n', '');
    } else if (section.startsWith('//')) {
      const [filePath, ...contentLines] = section.split('\n');
      const fileName = filePath.replace('//', '').trim();
      const language = detectLanguage(fileName);
      
      result.files.push({
        path: fileName,
        language: language,
        content: contentLines.join('\n')
      });
    }
  }

  return JSON.stringify(result, null, 2);
}

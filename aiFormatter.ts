import { join } from "https://deno.land/std@0.212.0/path/mod.ts";

export interface AIFormattingOptions {
  includeMetadata: boolean;
  includeStats: boolean;
  includeInstructions: boolean;
  maxTokenEstimate: boolean;
  addContextPrompts: boolean;
  format: 'standard' | 'markdown' | 'xml' | 'json';
  includeLineNumbers: boolean;
  addSeparators: boolean;
  includeFileSummary: boolean;
  optimizeForModel: 'gpt' | 'claude' | 'gemini' | 'generic';
}

export interface CodebaseStats {
  totalFiles: number;
  totalLines: number;
  totalChars: number;
  estimatedTokens: number;
  fileTypes: Record<string, number>;
  largestFiles: Array<{ path: string; lines: number; size: number }>;
  projectComplexity: 'simple' | 'medium' | 'complex';
}

export interface FileInfo {
  path: string;
  lines: number;
  chars: number;
  type: string;
  language: string;
}

export function detectLanguage(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop() || '';
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'sh': 'bash',
    'bash': 'bash',
    'ps1': 'powershell',
    'sql': 'sql',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'vue': 'vue',
    'md': 'markdown',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'xml': 'xml',
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'cmake': 'cmake',
    'txt': 'text',
    'log': 'text',
    'cfg': 'config',
    'ini': 'ini',
    'conf': 'config'
  };
  return languageMap[ext] || 'text';
}

export function estimateTokens(text: string): number {
  // Rough token estimation: ~4 characters per token for most models
  // More accurate for code than general text
  return Math.ceil(text.length / 3.5);
}

export function calculateStats(files: Array<{ path: string; content: string }>): CodebaseStats {
  const stats: CodebaseStats = {
    totalFiles: files.length,
    totalLines: 0,
    totalChars: 0,
    estimatedTokens: 0,
    fileTypes: {},
    largestFiles: [],
    projectComplexity: 'simple'
  };

  const fileInfos: FileInfo[] = [];

  for (const file of files) {
    const lines = file.content.split('\n').length;
    const chars = file.content.length;
    const language = detectLanguage(file.path);
    
    stats.totalLines += lines;
    stats.totalChars += chars;
    
    stats.fileTypes[language] = (stats.fileTypes[language] || 0) + 1;
    
    fileInfos.push({
      path: file.path,
      lines,
      chars,
      type: file.path.split('.').pop() || 'unknown',
      language
    });
  }

  stats.estimatedTokens = estimateTokens(files.map(f => f.content).join('\n'));
  
  // Sort and get largest files
  stats.largestFiles = fileInfos
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 5)
    .map(f => ({ path: f.path, lines: f.lines, size: f.chars }));

  // Determine complexity
  if (stats.totalFiles > 50 || stats.totalLines > 10000) {
    stats.projectComplexity = 'complex';
  } else if (stats.totalFiles > 10 || stats.totalLines > 2000) {
    stats.projectComplexity = 'medium';
  }

  return stats;
}

export function generateAIPromptSuggestions(stats: CodebaseStats, projectType?: string): string[] {
  const suggestions: string[] = [];

  suggestions.push(
    "📋 **Suggested AI Prompts:**",
    "",
    "**Code Review & Analysis:**",
    "- Analyze this codebase for potential improvements, bugs, or security issues",
    "- Review the architecture and suggest better design patterns",
    "- Identify code smells and refactoring opportunities",
    "",
    "**Documentation & Understanding:**",
    "- Explain the overall architecture and data flow of this project",
    "- Generate comprehensive documentation for this codebase",
    "- Create a README file explaining how to set up and use this project",
    "",
    "**Feature Development:**",
    "- Add [specific feature] to this codebase following the existing patterns",
    "- Implement error handling and logging throughout the application",
    "- Add unit tests for the main components",
    ""
  );

  if (projectType) {
    suggestions.push(
      `**${projectType}-Specific:**`
    );
    
    switch (projectType.toLowerCase()) {
      case 'deno':
        suggestions.push(
          "- Optimize this Deno project for performance and security",
          "- Add proper TypeScript types throughout the codebase",
          "- Implement Deno-specific best practices and patterns"
        );
        break;
      case 'node.js':
        suggestions.push(
          "- Convert this to use modern ES modules and async/await",
          "- Add proper error handling and logging with Winston",
          "- Implement API rate limiting and security middleware"
        );
        break;
      case 'python':
        suggestions.push(
          "- Add type hints throughout the Python codebase",
          "- Implement proper exception handling and logging",
          "- Add docstrings following Google/NumPy style"
        );
        break;
      case 'rust':
        suggestions.push(
          "- Review for proper ownership and borrowing patterns",
          "- Add comprehensive error handling with Result types",
          "- Optimize for performance and memory usage"
        );
        break;
    }
    suggestions.push("");
  }

  if (stats.projectComplexity === 'complex') {
    suggestions.push(
      "**Large Codebase Tips:**",
      "- Focus on specific modules or components when asking questions",
      "- Ask for architectural overviews before diving into implementation details",
      "- Request refactoring suggestions for better maintainability",
      ""
    );
  }

  return suggestions;
}

export function formatForAI(
  content: string,
  options: AIFormattingOptions,
  stats?: CodebaseStats,
  projectType?: string
): string {
  const sections: string[] = [];

  // Add AI-optimized header
  if (options.includeMetadata) {
    sections.push(
      "# 📁 Codebase Analysis Request",
      "",
      `**Generated:** ${new Date().toISOString()}`,
      projectType ? `**Project Type:** ${projectType}` : "",
      `**Format:** Optimized for ${options.optimizeForModel?.toUpperCase() || 'AI'} analysis`,
      "",
      "---",
      ""
    );
  }

  // Add statistics
  if (options.includeStats && stats) {
    sections.push(
      "## 📊 Codebase Statistics",
      "",
      `- **Files:** ${stats.totalFiles}`,
      `- **Lines of Code:** ${stats.totalLines.toLocaleString()}`,
      `- **Characters:** ${stats.totalChars.toLocaleString()}`,
      `- **Estimated Tokens:** ~${stats.estimatedTokens.toLocaleString()}`,
      `- **Complexity:** ${stats.projectComplexity}`,
      "",
      "**File Types:**"
    );

    Object.entries(stats.fileTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        sections.push(`- ${type}: ${count} files`);
      });

    if (stats.largestFiles.length > 0) {
      sections.push(
        "",
        "**Largest Files:**"
      );
      stats.largestFiles.forEach(file => {
        sections.push(`- \`${file.path}\`: ${file.lines} lines`);
      });
    }

    sections.push("", "---", "");
  }

  // Add context prompts
  if (options.addContextPrompts && stats && projectType) {
    const prompts = generateAIPromptSuggestions(stats, projectType);
    sections.push(...prompts, "---", "");
  }

  // Add instructions for AI
  if (options.includeInstructions) {
    sections.push(
      "## 🤖 Instructions for AI Assistant",
      "",
      "This codebase has been formatted for your analysis. Please:",
      "",
      "1. **Read the entire codebase** before providing suggestions",
      "2. **Consider the project structure** and existing patterns",
      "3. **Maintain consistency** with the current coding style",
      "4. **Provide specific, actionable recommendations**",
      "5. **Explain your reasoning** for any suggested changes",
      ""
    );

    if (stats && stats.estimatedTokens > 100000) {
      sections.push(
        "⚠️ **Large Codebase Notice:** This is a substantial codebase. Consider focusing on specific areas or asking targeted questions.",
        ""
      );
    }

    sections.push("---", "");
  }

  // Add file summary
  if (options.includeFileSummary) {
    const fileList = content.split('\n\n')
      .filter(section => section.startsWith('//'))
      .map(section => section.split('\n')[0].replace('//', '').trim())
      .filter(file => file && !file.startsWith('Directory Structure'));

    if (fileList.length > 0) {
      sections.push(
        "## 📑 File Index",
        "",
        ...fileList.map(file => `- \`${file}\``),
        "",
        "---",
        ""
      );
    }
  }

  // Format the main content based on output format
  let formattedContent = content;

  switch (options.format) {
    case 'markdown':
      formattedContent = formatAsMarkdown(content, options.includeLineNumbers);
      break;
    case 'xml':
      formattedContent = formatAsXML(content);
      break;
    case 'json':
      formattedContent = formatAsJSON(content);
      break;
    default:
      // Standard format with separators
      if (options.addSeparators) {
        formattedContent = content.replace(/^\/\/ (.+)$/gm, '\n' + '='.repeat(80) + '\n// $1\n' + '='.repeat(80));
      }
  }

  // Add the formatted content
  sections.push(formattedContent);

  // Add footer with token estimate
  if (options.maxTokenEstimate && stats) {
    sections.push(
      "",
      "---",
      "",
      `📏 **Token Estimate:** ~${stats.estimatedTokens.toLocaleString()} tokens`,
      `📊 **Model Compatibility:** ${getModelCompatibility(stats.estimatedTokens)}`,
      ""
    );
  }

  return sections.join('\n');
}

function formatAsMarkdown(content: string, includeLineNumbers: boolean): string {
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
      
      let codeBlock = contentLines.join('\n');
      if (includeLineNumbers) {
        codeBlock = addLineNumbers(codeBlock);
      }
      
      formatted.push(`\`\`\`${language}`);
      formatted.push(codeBlock);
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
      formatted.push(section.replace('// Directory Structure:\n', '').split('\n').map(line => `    ${line}`).join('\n'));
      formatted.push('  </directory-structure>');
    } else if (section.startsWith('//')) {
      const [filePath, ...contentLines] = section.split('\n');
      const fileName = filePath.replace('//', '').trim();
      const language = detectLanguage(fileName);
      
      formatted.push(`  <file path="${fileName}" language="${language}">`);
      formatted.push(`    <![CDATA[`);
      formatted.push(contentLines.join('\n'));
      formatted.push(`    ]]>`);
      formatted.push('  </file>');
    }
  }

  formatted.push('</codebase>');
  return formatted.join('\n');
}

function formatAsJSON(content: string): string {
  const sections = content.split('\n\n');
  const result: any = { files: [], directoryStructure: '' };

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

function addLineNumbers(content: string): string {
  return content
    .split('\n')
    .map((line, index) => `${(index + 1).toString().padStart(3, ' ')} | ${line}`)
    .join('\n');
}

function getModelCompatibility(estimatedTokens: number): string {
  if (estimatedTokens <= 4000) return "✅ Compatible with all models";
  if (estimatedTokens <= 16000) return "✅ Compatible with GPT-3.5, GPT-4, Claude";
  if (estimatedTokens <= 32000) return "✅ Compatible with GPT-4, Claude-2+";
  if (estimatedTokens <= 100000) return "⚠️ Requires Claude-2+ or GPT-4 Turbo";
  if (estimatedTokens <= 200000) return "⚠️ Requires Claude-3+ or specialized models";
  return "❌ Exceeds most model limits - consider splitting";
}

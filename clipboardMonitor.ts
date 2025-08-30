import { dirname, resolve, normalize, isAbsolute, relative } from "https://deno.land/std@0.212.0/path/mod.ts";
import { getClipboardText, ClipboardError } from "./src/utils/clipboard.ts";

export interface ClipboardMonitorOptions {
  projectDir: string;
  checkInterval: number; // in milliseconds
  verbose: boolean;
}

/**
 * Utility function to check if a write path is safely within the project directory.
 */
function isPathSafe(baseDir: string, targetPath: string): boolean {
    const rel = relative(baseDir, targetPath);
    // isInside: path is within baseDir, not .., not absolute, and not the base dir itself
    return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

export class ClipboardMonitor {
  private options: ClipboardMonitorOptions;
  private isRunning = false;
  private lastClipboardContent = "";
  private abortController: AbortController | null = null;
  private baseProjectDirAbs: string | null = null;

  constructor(options: ClipboardMonitorOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Clipboard monitor is already running");
      return;
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    this.baseProjectDirAbs = normalize(resolve(this.options.projectDir));
    
    console.log(`🔍 Starting clipboard monitor for project: ${this.options.projectDir}`);
    console.log(`⏱️  Check interval: ${this.options.checkInterval}ms`);
    console.log("📋 Watching for clipboard patterns:");
    console.log("   - '// <filepath>' for complete file replacement");
    console.log("   - '// <filepath> + ------- SEARCH/=======/+++++++ REPLACE' for targeted edits");
    console.log("Press Ctrl+C to stop monitoring\n");

    const handleShutdown = () => this.stop();
    Deno.addSignalListener("SIGINT", handleShutdown);
    Deno.addSignalListener("SIGTERM", handleShutdown);

    try {
      while (this.isRunning && !this.abortController.signal.aborted) {
        await this.checkClipboard();
        await this.sleep(this.options.checkInterval);
      }
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        console.error("Clipboard monitor error:", error instanceof Error ? error.message : String(error));
      }
    } finally {
      Deno.removeSignalListener("SIGINT", handleShutdown);
      Deno.removeSignalListener("SIGTERM", handleShutdown);
    }
  }

  stop(): void {
    if (!this.isRunning) return;
    console.log("\n🛑 Stopping clipboard monitor...");
    this.isRunning = false;
    this.abortController?.abort();
    console.log("✅ Clipboard monitor stopped");
  }

  private async checkClipboard(): Promise<void> {
    try {
      const clipboardContent = await getClipboardText();
      if (clipboardContent === this.lastClipboardContent || clipboardContent.trim() === "") {
        return;
      }
      this.lastClipboardContent = clipboardContent;
      if (this.isFileReplacementPattern(clipboardContent)) {
        await this.processClipboardContent(clipboardContent);
      }
    } catch (error) {
      if (this.options.verbose) {
        const message = error instanceof Error ? error.message : String(error);
        if (!(error instanceof ClipboardError) || !message.includes("No text found on clipboard")) {
          console.error("Error checking clipboard:", message);
        }
      }
    }
  }
  
  private async processClipboardContent(content: string): Promise<void> {
    try {
      const { filePath } = this.parseFileContent(content);
      if (!filePath) {
        if(this.options.verbose) console.log("... No valid file path found in clipboard content.");
        return;
      }

      if (!this.baseProjectDirAbs) {
        console.error("Base project directory not set.");
        return;
      }
  
      const targetPathAbs = normalize(
        isAbsolute(filePath) ? filePath : resolve(this.baseProjectDirAbs, filePath)
      );

      if (!isPathSafe(this.baseProjectDirAbs, targetPathAbs)) {
        console.error("❌ Blocked write attempt outside of project directory:");
        console.error(`   Base: ${this.baseProjectDirAbs}`);
        console.error(`   Target: ${targetPathAbs}`);
        return;
      }

      if (this.isSearchReplacePattern(content)) {
        await this.processSearchReplace(targetPathAbs, content);
      } else {
        const { fileContent } = this.parseFileContent(content);
        await this.processCompleteFileReplacement(targetPathAbs, fileContent);
      }
    } catch (error) {
      console.error(`❌ Error processing clipboard content:`, error instanceof Error ? error.message : String(error));
    }
  }

  private isFileReplacementPattern(content: string): boolean {
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.startsWith('//') && firstLine.includes('/')) return true;
    if (firstLine.startsWith('```')) {
      const afterTicks = firstLine.replace(/^```/, '').trim();
      if (afterTicks.startsWith('//') && afterTicks.includes('/')) return true;
    }
    return false;
  }

  private isSearchReplacePattern(content: string): boolean {
    return content.includes('------- SEARCH') && content.includes('=======') && content.includes('+++++++ REPLACE');
  }
  
  private parseFileContent(content: string): { filePath: string, fileContent: string, isFence: boolean } {
    const lines = content.split('\n');
    let firstLine = lines[0].trim();
    let isFence = false;

    if (firstLine.startsWith('```')) {
        isFence = true;
        firstLine = firstLine.replace(/^```/, '').trim();
    }

    const filePath = firstLine.startsWith('//') ? firstLine.replace(/^\/\/\s*/, '').trim() : '';
    let fileContent = lines.slice(1).join('\n');

    if (isFence) {
        const contentLines = fileContent.split('\n');
        if (contentLines.length > 0 && contentLines[contentLines.length - 1].trim() === '```') {
            contentLines.pop();
            fileContent = contentLines.join('\n');
        }
    }
    return { filePath, fileContent, isFence };
  }

  private async processSearchReplace(filePath: string, content: string): Promise<void> {
    console.log(`🔍 Processing search-and-replace for: ${filePath}`);
    const searchStart = content.indexOf('------- SEARCH');
    const separator = content.indexOf('=======');
    const replaceEnd = content.indexOf('+++++++ REPLACE');

    if (searchStart === -1 || separator === -1 || replaceEnd === -1) {
      console.log("❌ Invalid search-and-replace pattern format");
      return;
    }

    const searchContent = content.substring(searchStart + '------- SEARCH'.length, separator).trim();
    const replaceContent = content.substring(separator + '======='.length, replaceEnd).trim();

    if (!searchContent) {
      console.log("❌ Empty search pattern");
      return;
    }

    try {
      const originalContent = await Deno.readTextFile(filePath);
      if (!originalContent.includes(searchContent)) {
        console.log(`❌ Search pattern not found in ${filePath}`);
        if (this.options.verbose) {
          console.log(`   Search pattern: "${searchContent.substring(0, 50).replace(/\n/g, ' ')}${searchContent.length > 50 ? '...' : ''}"`);
        }
        return;
      }
      const newFileContent = originalContent.replace(searchContent, replaceContent);
      await Deno.writeTextFile(filePath, newFileContent);
      const timestamp = new Date().toLocaleTimeString();
      console.log(`✅ [${timestamp}] Code section replaced in: ${filePath}`);
    } catch (error) {
      console.error(`❌ Could not read/write file ${filePath}:`, error instanceof Error ? error.message : String(error));
    }
  }

  private async processCompleteFileReplacement(targetPathAbs: string, fileContent: string): Promise<void> {
    console.log(`� Processing complete file replacement:`);
    console.log(`   File: ${targetPathAbs}`);
    if(this.options.verbose) {
        console.log(`   Content size: ${fileContent.length} characters`);
    }
    try {
      await Deno.mkdir(dirname(targetPathAbs), { recursive: true });
      await Deno.writeTextFile(targetPathAbs, fileContent);
      const timestamp = new Date().toLocaleTimeString();
      console.log(`✅ [${timestamp}] File updated successfully: ${targetPathAbs}`);
    } catch (error) {
       console.error(`❌ Error writing file ${targetPathAbs}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timer = setTimeout(resolve, ms);
      this.abortController?.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  isMonitorRunning(): boolean {
    return this.isRunning;
  }
}

export async function startClipboardMonitoring(options: ClipboardMonitorOptions): Promise<ClipboardMonitor> {
  const monitor = new ClipboardMonitor(options);
  monitor.start().catch((error) => {
    console.error("Clipboard monitor failed:", error.message);
  });
  return monitor;
}

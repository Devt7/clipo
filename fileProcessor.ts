import { join, basename, extname } from "https://deno.land/std@0.212.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.212.0/fs/mod.ts";
import { Config, DEFAULT_CONFIG_PATH, readGitignore } from "./config.ts";

const ONE_MB = 1024 * 1024;

export function parseSizeString(sizeStr: string): number {
  const multipliers: { [key: string]: number } = {
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const regex = /^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i;
  const match = sizeStr.match(regex);

  if (!match) {
    console.warn(`Invalid size string: ${sizeStr}. Using default 10MB.`);
    return 10 * ONE_MB;
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || "").toLowerCase();

  return value * (multipliers[unit] || ONE_MB);
}

export async function getFilesWithContent(
  dirPath: string,
  scriptFileName: string,
  fileExtensions: string[],
  config: Config,
  includeIgnored: boolean,
  outputFile: string | undefined,
  verbose: boolean,
  relativePath: string = ""
): Promise<string[]> {
  const ignoreFiles = config.ignoreFiles || [];
  const ignoreFolders = config.ignoreFolders || [];
  const ignoreExtensions = config.ignoreExtensions || [];

  let gitignoreEntries: string[] = [];
  if (config.useGitignore) {
    gitignoreEntries = await readGitignore(dirPath);
  }

  const allIgnoreFiles = [
    ...ignoreFiles,
    ...gitignoreEntries,
    DEFAULT_CONFIG_PATH,
    scriptFileName,
    ...(outputFile ? [basename(outputFile)] : []),
  ];
  const maxSizeBytes = parseSizeString(config.max_large_files || "10MB");

  try {
    const files: string[] = [];
    for await (const dirEntry of Deno.readDir(dirPath)) {
      files.push(dirEntry.name);
    }

    const fileContents: string[] = [];
    const addedFilePaths = new Set<string>();

    for (const file of files) {
      const filePath = join(dirPath, file);
      let stats: Deno.FileInfo;
      try {
        stats = await Deno.stat(filePath);
      } catch (error) {
        console.error(`Error stating file ${filePath}:`, error);
        continue;
      }

      if (!includeIgnored && allIgnoreFiles.includes(file)) {
        continue;
      }

      if (
        !includeIgnored &&
        stats.isDirectory &&
        ignoreFolders.includes(file)
      ) {
        continue;
      }

      if (
        !includeIgnored &&
        ignoreExtensions.includes(extname(file).toLowerCase())
      ) {
        continue;
      }

      if (stats.isFile) {
        if (!config.read_large_files && stats.size > maxSizeBytes) {
          console.warn(
            `Skipping large file: ${file} (size: ${stats.size} bytes, max: ${maxSizeBytes} bytes).`
          );
          continue;
        }

        const ext = extname(file).toLowerCase();
        if (
          file !== scriptFileName &&
          (fileExtensions.length === 0 || fileExtensions.includes(ext))
        ) {
          const fullRelativePath = join(relativePath, file);
          if (!addedFilePaths.has(fullRelativePath)) {
            if (verbose) {
              console.log(`[+] Processing: ${fullRelativePath}`);
            }
            const fileContent = await Deno.readTextFile(filePath);

            const lines = fileContent.split("\n");
            let firstNonCommentLine = 0;
            for (let i = 0; i < lines.length; i++) {
              if (!lines[i].trim().startsWith("//")) {
                firstNonCommentLine = i;
                break;
              }
            }
            let existingComment = `// ${fullRelativePath}`;
            if (
              lines
                .slice(0, firstNonCommentLine)
                .some((line) => line.trim() === existingComment)
            ) {
              existingComment = "";
            } else {
              existingComment = `// ${fullRelativePath}\n`;
            }

            fileContents.push(`${existingComment}${fileContent}`);
            addedFilePaths.add(fullRelativePath);
          }
        }
      } else if (stats.isDirectory) {
        const newRelativePath = join(relativePath, file);
        const subdirectoryContents = await getFilesWithContent(
          filePath,
          scriptFileName,
          fileExtensions,
          config,
          includeIgnored,
          outputFile,
          verbose,
          newRelativePath
        );
        fileContents.push(...subdirectoryContents);
      }
    }
    return fileContents;
  } catch (err) {
    console.error("Error reading directory or files:", err);
    return [];
  }
}

export async function generateDirectoryStructure(
  dirPath: string,
  config: Config,
  includeIgnored: boolean,
  includeIgnoredFilesSuffix: boolean,
  outputFile: string | undefined,
  scriptFileName: string,
  useStyles: boolean,
  indent: string = ""
): Promise<string> {
  const ignoreFiles = config.ignoreFiles || [];
  const ignoreFolders = config.ignoreFolders || [];
  const ignoreExtensions = config.ignoreExtensions || [];
  let gitignoreEntries: string[] = [];

  if (config.useGitignore) {
    gitignoreEntries = await readGitignore(dirPath);
  }

  const allIgnoreFiles = [
    ...ignoreFiles,
    ...gitignoreEntries,
    DEFAULT_CONFIG_PATH,
    scriptFileName,
    ...(outputFile ? [basename(outputFile)] : []),
  ];

  let structure = "";
  const files: string[] = [];
  for await (const dirEntry of Deno.readDir(dirPath)) {
    files.push(dirEntry.name);
  }

  for (const file of files) {
    let suffix = "";
    const isFileIgnored = allIgnoreFiles.includes(file);
    const isFolderIgnored = ignoreFolders.includes(file);
    const isExtIgnored = ignoreExtensions.includes(extname(file).toLowerCase());

    const isIgnored = isFileIgnored || isFolderIgnored || isExtIgnored;

    if (!includeIgnored && isIgnored) {
      continue;
    }

    const filePath = join(dirPath, file);
    let stats: Deno.FileInfo;
    try {
      stats = await Deno.stat(filePath);
    } catch (error) {
      console.error(`Error stating file ${filePath}:`, error);
      continue;
    }

    const styleConfig = config.visual;
    let displayChar: string;
    if (stats.isDirectory) {
      displayChar = useStyles ? styleConfig?.folder || "📁" : "";
    } else {
      const ext = extname(file).toLowerCase();
      displayChar = useStyles
        ? styleConfig?.[ext] || styleConfig?.file || "📄"
        : "";
    }

    if (includeIgnoredFilesSuffix && isFileIgnored && !stats.isDirectory) {
      suffix = useStyles ? " " + (styleConfig?.excluded || "(excluded)") : "";
    }

    structure +=
      indent +
      (stats.isDirectory ? "├── " : "└── ") +
      displayChar +
      " " +
      file +
      suffix +
      "\n";

    if (stats.isDirectory) {
      structure += await generateDirectoryStructure(
        filePath,
        config,
        includeIgnored,
        includeIgnoredFilesSuffix,
        outputFile,
        scriptFileName,
        useStyles,
        indent +
          (files.indexOf(file) === files.length - 1 ||
          (files.length === 2 &&
            (files[0] === "node_modules" ||
              files[0] === ".env" ||
              files[0] === ".git")) ||
          files.length === 1
            ? "    "
            : "│   ")
      );
    }
  }
  return structure;
}

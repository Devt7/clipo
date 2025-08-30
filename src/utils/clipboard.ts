/**
 * Cross-platform clipboard utilities.
 * Supports macOS, Linux (with xclip), and Windows.
 */

class ClipboardError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ClipboardError";
    }
}

async function getClipboardText(): Promise<string> {
    let command: string[];
    let commandName: string;

    switch (Deno.build.os) {
        case "darwin":
            command = ["pbpaste"];
            commandName = "pbpaste";
            break;
        case "linux":
            command = ["xclip", "-selection", "clipboard", "-o"];
            commandName = "xclip";
            break;
        case "windows":
            command = ["powershell", "-NoProfile", "-Command", "Get-Clipboard"];
            commandName = "powershell";
            break;
        default:
            throw new ClipboardError(`Unsupported OS for clipboard operations: ${Deno.build.os}`);
    }

    try {
        const process = new Deno.Command(command[0], {
            args: command.slice(1),
            stdout: "piped",
            stderr: "piped",
        });

        const { success, stdout, stderr } = await process.output();

        if (!success) {
            const errorText = new TextDecoder().decode(stderr).trim();
            if (Deno.build.os === "linux" && errorText.includes("not found")) {
                throw new ClipboardError("`xclip` is not installed. Please run `sudo apt-get install xclip` or your system's equivalent.");
            }
             // On Windows, Get-Clipboard can fail if it's empty. Don't throw, just return empty.
            if (Deno.build.os === "windows" && errorText.includes("Cannot open clipboard")) {
                return "";
            }
            throw new ClipboardError(`Failed to read from clipboard using '${commandName}': ${errorText}`);
        }
        return new TextDecoder().decode(stdout);
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
             throw new ClipboardError(`Clipboard command '${commandName}' not found in PATH.`);
        }
        throw error; // Re-throw other errors
    }
}

async function setClipboardText(text: string): Promise<void> {
    let command: string[];
    let commandName: string;

    switch (Deno.build.os) {
        case "darwin":
            command = ["pbcopy"];
            commandName = "pbcopy";
            break;
        case "linux":
            command = ["xclip", "-selection", "clipboard"];
            commandName = "xclip";
            break;
        case "windows":
            // Using Set-Clipboard which is more reliable than piping
            command = ["powershell", "-NoProfile", "-Command", "Set-Clipboard"];
            commandName = "powershell";
            break;
        default:
            throw new ClipboardError(`Unsupported OS for clipboard operations: ${Deno.build.os}`);
    }
    
    try {
        const process = new Deno.Command(command[0], {
            args: command.slice(1),
            stdin: "piped",
            stderr: "piped", // Capture stderr
        });

        const proc = process.spawn();
        const writer = proc.stdin.getWriter();
        await writer.write(new TextEncoder().encode(text));
        await writer.close();

        const result = await proc.output();

        if (!result.success) {
            const errorText = new TextDecoder().decode(result.stderr).trim();
            if (Deno.build.os === "linux" && errorText.includes("not found")) {
                 throw new ClipboardError("`xclip` is not installed. Please run `sudo apt-get install xclip` or your system's equivalent.");
            }
            throw new ClipboardError(`Failed to write to clipboard using '${commandName}': ${errorText}`);
        }
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
             throw new ClipboardError(`Clipboard command '${commandName}' not found in PATH.`);
        }
        throw error;
    }
}

export { getClipboardText, setClipboardText, ClipboardError };

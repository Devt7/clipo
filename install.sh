#!/bin/bash

# Clipo Installer Script
# Automatically installs Clipo to /usr/local/bin

set -e

INSTALL_DIR="/usr/local/bin"
EXECUTABLE_NAME="clipo"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Clipo Installer${NC}"
echo -e "${BLUE}=================${NC}"

# Check if running as root for system-wide installation
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Running as root - installing system-wide${NC}"
    INSTALL_DIR="/usr/local/bin"
else
    echo -e "${YELLOW}💡 Not running as root - you may need sudo for system-wide installation${NC}"
    echo -e "${YELLOW}   Alternative: install to ~/bin or ~/.local/bin${NC}"
    
    read -p "Install to /usr/local/bin (requires sudo) or ~/bin? [system/local]: " choice
    case $choice in
        local|~/bin|home)
            INSTALL_DIR="$HOME/bin"
            mkdir -p "$INSTALL_DIR"
            ;;
        system|/usr/local/bin|*)
            INSTALL_DIR="/usr/local/bin"
            ;;
    esac
fi

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case $OS in
    Darwin)
        case $ARCH in
            arm64)
                EXECUTABLE="clipo-macos-arm64"
                PLATFORM="macOS Apple Silicon"
                ;;
            x86_64)
                EXECUTABLE="clipo-macos-x64"
                PLATFORM="macOS Intel"
                ;;
            *)
                EXECUTABLE="clipo"
                PLATFORM="macOS (current)"
                ;;
        esac
        ;;
    Linux)
        EXECUTABLE="clipo-linux-x64"
        PLATFORM="Linux x86_64"
        ;;
    MINGW*|CYGWIN*|MSYS*)
        EXECUTABLE="clipo-windows-x64.exe"
        EXECUTABLE_NAME="clipo.exe"
        PLATFORM="Windows x86_64"
        ;;
    *)
        echo -e "${YELLOW}⚠️  Unknown platform: $OS $ARCH${NC}"
        echo -e "${YELLOW}   Using default executable: clipo${NC}"
        EXECUTABLE="clipo"
        PLATFORM="Unknown"
        ;;
esac

echo -e "${BLUE}📋 Installation Details:${NC}"
echo -e "   Platform: $PLATFORM"
echo -e "   Executable: $EXECUTABLE"
echo -e "   Install Directory: $INSTALL_DIR"
echo -e "   Final Name: $EXECUTABLE_NAME"

# Check if source executable exists
if [ ! -f "$EXECUTABLE" ]; then
    echo -e "${RED}❌ Error: Executable '$EXECUTABLE' not found${NC}"
    echo -e "${YELLOW}💡 Make sure you're running this script from the Clipo directory${NC}"
    echo -e "${YELLOW}   Or build the executables first with: deno task build-all${NC}"
    exit 1
fi

# Install
echo ""
echo -e "${BLUE}📦 Installing Clipo...${NC}"

if [ "$INSTALL_DIR" = "/usr/local/bin" ] && [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}🔐 Installing to system directory, sudo required...${NC}"
    sudo cp "$EXECUTABLE" "$INSTALL_DIR/$EXECUTABLE_NAME"
    sudo chmod +x "$INSTALL_DIR/$EXECUTABLE_NAME"
else
    cp "$EXECUTABLE" "$INSTALL_DIR/$EXECUTABLE_NAME"
    chmod +x "$INSTALL_DIR/$EXECUTABLE_NAME"
fi

# Verify installation
if [ -f "$INSTALL_DIR/$EXECUTABLE_NAME" ] && [ -x "$INSTALL_DIR/$EXECUTABLE_NAME" ]; then
    echo -e "${GREEN}✅ Clipo installed successfully!${NC}"
    
    # Test the installation
    if command -v "$EXECUTABLE_NAME" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Clipo is available in PATH${NC}"
        
        # Show version
        echo -e "${BLUE}📋 Version Information:${NC}"
        "$EXECUTABLE_NAME" --version
        
        echo ""
        echo -e "${GREEN}🎉 Installation Complete!${NC}"
        echo -e "${BLUE}📖 Usage Examples:${NC}"
        echo -e "   clipo --help                    # Show help"
        echo -e "   clipo .                         # Process current directory"
        echo -e "   clipo . --monitor --verbose     # Start clipboard monitoring"
        echo -e "   clipo /path/to/project output.txt  # Process specific directory"
        
    else
        echo -e "${YELLOW}⚠️  Clipo installed but not found in PATH${NC}"
        echo -e "${YELLOW}   You may need to restart your terminal or add $INSTALL_DIR to PATH${NC}"
        
        if [ "$INSTALL_DIR" = "$HOME/bin" ]; then
            echo -e "${YELLOW}💡 To add ~/bin to PATH, add this to your shell profile:${NC}"
            echo -e "   export PATH=\"\$HOME/bin:\$PATH\""
        fi
    fi
    
else
    echo -e "${RED}❌ Installation failed${NC}"
    exit 1
fi

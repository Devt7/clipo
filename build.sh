#!/bin/bash

# Clipo Build Script
# Compiles the Deno application into standalone executables

set -e

echo "🔨 Building Clipo Executable..."
echo "==============================="

# Create build directory
echo "📁 Creating build directory..."
mkdir -p build

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -f build/clipo build/clipo-* clipo clipo-* 2>/dev/null || true

echo ""
echo "📦 Building for current platform..."
deno compile --allow-read --allow-write --allow-run --output build/clipo clipo.ts

if [ -f "build/clipo" ] || [ -f "build/clipo.exe" ]; then
    echo "✅ Build successful! Executable created: build/clipo"
    
    # Test the executable
    echo ""
    echo "🧪 Testing executable..."
    if ./build/clipo --version 2>/dev/null || ./build/clipo.exe --version 2>/dev/null; then
        echo "✅ Executable test passed!"
    else
        echo "⚠️  Executable test failed, but binary was created"
    fi
    
    echo ""
    echo "📋 Usage Examples:"
    echo "  ./build/clipo . --help                    # Show help"
    echo "  ./build/clipo . output.txt                # Process current directory"
    echo "  ./build/clipo . --monitor --verbose       # Start clipboard monitoring"
    echo "  ./build/clipo /path/to/project            # Process specific directory"
    
else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "🎯 To build for multiple platforms, run:"
echo "  deno task build-all"
echo ""
echo "🚀 To install globally, run:"
echo "  deno task install"

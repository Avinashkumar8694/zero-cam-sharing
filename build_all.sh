#!/bin/bash
set -e

echo "==========================================="
echo "   Fabrixly Cam Sharing - Build Script     "
echo "==========================================="

# 1. Check Dependencies
echo "[1/4] Installing Node.js dependencies..."
npm install

# 2. Build Android APK
echo "[2/4] Building Android APK..."
# Try to dynamically locate Java 21 if JAVA_HOME isn't set properly
if [ -z "$JAVA_HOME" ] || [[ ! "$JAVA_HOME" == *"21"* ]]; then
    if [ -d "/opt/homebrew/opt/openjdk@21" ]; then
        export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
    elif [ -d "/opt/homebrew/opt/openjdk" ]; then
        export JAVA_HOME="/opt/homebrew/opt/openjdk"
    fi
fi

if [ -d "/opt/homebrew/share/android-commandlinetools" ]; then
    export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
    export PATH="$ANDROID_HOME/platform-tools:$PATH"
fi

if [ -n "$JAVA_HOME" ]; then
    echo "Using JAVA_HOME: $JAVA_HOME"
    cd android
    ./gradlew assembleDebug
    cd ..
    echo "✅ Android build successful."
else
    echo "⚠️ Warning: Java 21 environment not detected. Skipping Android build."
    echo "To build Android, ensure JAVA_HOME is set to a JDK 21 installation."
fi

# 3. Build Desktop Applications
echo "[3/4] Building Desktop Apps (Electron)..."
echo "Building for macOS..."
npm run build:mac || echo "⚠️ macOS build failed or skipped."

echo "Building for Windows..."
npm run build:win || echo "⚠️ Windows build failed or skipped."

echo "Building for Linux..."
npm run build:linux || echo "⚠️ Linux build failed or skipped."

# 4. Build Website & Docker Aggregator
echo "[4/4] Packaging Website..."
# This script (copy-builds.js) inside npm run build will harvest the APK and Desktop binaries
npm run build

echo "==========================================="
echo "🎉 Build Complete!"
echo "All binaries have been collected into 'dist/downloads'."
echo "You can now run 'docker compose up -d' to start the web server."
echo "==========================================="

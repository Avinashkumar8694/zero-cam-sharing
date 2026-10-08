import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
const version = pkg.version;

const PUBLIC_DOWNLOADS_DIR = path.join(__dirname, 'public', 'downloads');
const DESKTOP_DIR = path.join(PUBLIC_DOWNLOADS_DIR, 'desktop');
const ANDROID_DIR = path.join(PUBLIC_DOWNLOADS_DIR, 'android');

// Ensure directories exist and are empty of old versions
if (fs.existsSync(DESKTOP_DIR)) fs.rmSync(DESKTOP_DIR, { recursive: true, force: true });
if (fs.existsSync(ANDROID_DIR)) fs.rmSync(ANDROID_DIR, { recursive: true, force: true });
fs.mkdirSync(DESKTOP_DIR, { recursive: true });
fs.mkdirSync(ANDROID_DIR, { recursive: true });

// Copy Android APK
const apkSource = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (fs.existsSync(apkSource)) {
    fs.copyFileSync(apkSource, path.join(ANDROID_DIR, 'app-debug.apk'));
    console.log('✅ Copied Android APK');
} else {
    console.log('⚠️ Android APK not found. Skipping.');
}

// Copy Desktop Builds from Release Folder
const releaseDir = path.join(__dirname, 'release');
if (fs.existsSync(releaseDir)) {
    const files = fs.readdirSync(releaseDir);
    let copiedAny = false;
    files.forEach(file => {
        // Only copy files that contain the current version number and are not blockmaps
        if (file.includes(version) && (file.endsWith('.dmg') || file.endsWith('.zip') || file.endsWith('.exe') || file.endsWith('.AppImage'))) {
            fs.copyFileSync(path.join(releaseDir, file), path.join(DESKTOP_DIR, file));
            console.log(`✅ Copied Desktop build: ${file}`);
            copiedAny = true;
        }
    });
    
    // Cleanup release directory after copying
    if (copiedAny) {
      fs.rmSync(releaseDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up release/ directory');
    }
} else {
    console.log('⚠️ Release folder not found. Skipping desktop builds.');
}

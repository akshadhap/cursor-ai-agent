import esbuild from 'esbuild';
import fs from 'fs';

// Create dist directory
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

// Bundle content script
await esbuild.build({
    entryPoints: ['content/index.ts'],
    bundle: true,
    outfile: 'dist/content.js',
    format: 'iife',
    target: 'es2020',
    platform: 'browser',
});

// Bundle background script
await esbuild.build({
    entryPoints: ['background/index.ts'],
    bundle: true,
    outfile: 'dist/background.js',
    format: 'iife',
    target: 'es2020',
    platform: 'browser',
});

// Bundle popup script
await esbuild.build({
    entryPoints: ['popup/popup.ts'],
    bundle: true,
    outfile: 'dist/popup.js',
    format: 'iife',
    target: 'es2020',
    platform: 'browser',
});

// Create manifest without icons (to avoid loading errors if icons are missing)
const manifestContent = {
    "manifest_version": 3,
    "name": "Spinabot Cursor AI",
    "version": "1.0.0",
    "description": "AI-powered cursor assistance for browsing with intelligent text analysis",
    "permissions": [
        "activeTab",
        "contextMenus",
        "storage",
        "scripting"
    ],
    "host_permissions": [
        "http://localhost:3000/*",
        "https://*/*"
    ],
    "background": {
        "service_worker": "background.js"
    },
    "content_scripts": [
        {
            "matches": ["<all_urls>"],
            "js": ["content.js"],
            "css": ["content.css"],
            "run_at": "document_end"
        }
    ],
    "action": {
        "default_popup": "popup.html"
    },
    "commands": {
        "toggle-panel": {
            "suggested_key": {
                "default": "Alt+S"
            },
            "description": "Toggle Spinabot side panel"
        }
    }
};

fs.writeFileSync('dist/manifest.json', JSON.stringify(manifestContent, null, 2));

// Copy static files
if (fs.existsSync('popup/index.html')) {
    fs.copyFileSync('popup/index.html', 'dist/popup.html');
}
if (fs.existsSync('content/content.css')) {
    fs.copyFileSync('content/content.css', 'dist/content.css');
}

console.log('✅ Extension built successfully!');

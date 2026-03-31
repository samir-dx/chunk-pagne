const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, 'dist');

const filesToCopy = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'background.js',
  'style.css',
  'icons'
];

console.log('🧹 Cleaning old build...');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

console.log('📁 Copying files to /dist...');
filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  } else {
    console.warn(`⚠️ Warning: ${file} not found!`);
  }
});

console.log('🗜️ Minifying JS and CSS...');
try {
  execSync('terser dist/background.js -o dist/background.js -c passes=2,drop_console=true,toplevel=true -m toplevel=true', { stdio: 'inherit' });
  execSync('terser dist/popup.js -o dist/popup.js -c passes=2,drop_console=true,toplevel=true -m toplevel=true', { stdio: 'inherit' });
  execSync('cleancss -o dist/style.css dist/style.css', { stdio: 'inherit' });
  
  console.log('✅ Build complete! Your production-ready extension is in the /dist folder.');
} catch (error) {
  console.error('❌ Build failed. Make sure terser and clean-css-cli are installed globally.', error.message);
}
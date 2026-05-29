const fs = require('fs');
const path = require('path');

const sharedDir = path.resolve(__dirname, '..', '..', 'shared');
const suffixes = ['.js', '.js.map', '.d.ts', '.d.ts.map'];
const sourceSuffixes = ['.ts', '.tsx', '.json', '.md'];

function hasSourceSibling(filePath) {
  return sourceSuffixes.some(suffix => fs.existsSync(filePath.replace(/\.(js|js\.map|d\.ts|d\.ts\.map)$/, suffix)));
}

function clean(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      clean(fullPath);
      continue;
    }

    if (suffixes.some(suffix => entry.name.endsWith(suffix)) && hasSourceSibling(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}

clean(sharedDir);

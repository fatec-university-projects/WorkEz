const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.js') && !filePath.endsWith('.jsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Regex to find className attributes
  const classNameRegex = /className=(["'`])([^"'`]+)\1|className=\{(`)([^`]+)\3\}/g;

  content = content.replace(classNameRegex, (match, quote1, classes1, quote2, classes2) => {
    let quote = quote1 || quote2;
    let classes = classes1 || classes2;
    
    let tokens = classes.split(/\s+/);
    if (tokens.includes('flex')) {
      if (!tokens.includes('flex-row') && !tokens.includes('flex-col') && !tokens.includes('flex-col-reverse')) {
        tokens = tokens.map(t => t === 'flex' ? 'flex-row' : t);
      }
    }
    
    if (quote1) {
        return `className=${quote1}${tokens.join(' ')}${quote1}`;
    } else {
        return `className={\`${tokens.join(' ')}\`}`;
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated: ${filePath}`);
  }
}

const rootDir = path.join(__dirname, '..'); // Go up to WorkEzApp

const dirsToProcess = [
  path.join(rootDir, 'app'),
  path.join(rootDir, 'components')
];

dirsToProcess.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDir(dir, processFile);
  } else {
    console.log(`Dir not found: ${dir}`);
  }
});

console.log('Flex classes fixed!');

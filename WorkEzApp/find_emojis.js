const fs = require('fs');
const path = require('path');

const emojis = ['🔧', '🧹', '⚡', '🚙', '⏱️', '⭐', '💰', '✅', '🛡️'];

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      search(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const foundEmojis = emojis.filter(e => content.includes(e));
      if (foundEmojis.length > 0) {
        console.log(`${fullPath} contains: ${foundEmojis.join(', ')}`);
      }
    }
  }
}

search(path.join(__dirname, 'app'));
search(path.join(__dirname, 'components'));

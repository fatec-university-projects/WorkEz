const fs = require('fs');

const mappings = {
  '🔧': { icon: 'Wrench', color: '#3B82F6' },
  '🧹': { icon: 'Brush', color: '#8B5CF6' },
  '⚡': { icon: 'Zap', color: '#EAB308' },
  '⏱️': { icon: 'Timer', color: '#3B82F6' }, // For Timer, maybe it doesn't need a text color if it's not wrapped
  '⭐': { icon: 'Star', color: '#EAB308' },
  '💰': { icon: 'DollarSign', color: '#10B981' }
};

const files = [
  'd:/Dev/WorkEz/WorkEzApp/app/client/category.tsx',
  'd:/Dev/WorkEz/WorkEzApp/app/client/index.tsx',
  'd:/Dev/WorkEz/WorkEzApp/app/client/payment/[id].tsx',
  'd:/Dev/WorkEz/WorkEzApp/app/client/tracking/[id].tsx',
  'd:/Dev/WorkEz/WorkEzApp/app/provider/index.tsx',
  'd:/Dev/WorkEz/WorkEzApp/app/provider/new-call/[id].tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let iconsNeeded = new Set();
  
  // Replace <Text className="...">EMOJI</Text> with <Icon className="... text-color" />
  // We'll use a regex
  
  for (const [emoji, {icon, color}] of Object.entries(mappings)) {
    if (content.includes(emoji)) {
      iconsNeeded.add(icon);
      // Let's replace raw emojis inside Text.
      const regex1 = new RegExp(`<Text[^>]*>${emoji}<\/Text>`, 'g');
      content = content.replace(regex1, `<${icon} className="w-5 h-5 text-[${color}]" />`);
      
      // Also replace raw emojis without Text tags just in case
      // E.g., `⭐ 4.9` -> `<Star className="..." /> 4.9`
      const regex2 = new RegExp(emoji, 'g');
      content = content.replace(regex2, `<${icon} className="w-4 h-4 text-[${color}] inline" />`);
    }
  }
  
  if (iconsNeeded.size > 0) {
    // Check if lucide-react-native is imported
    const lucideRegex = /import\s+{([^}]+)}\s+from\s+['"]lucide-react-native['"];?/;
    const match = content.match(lucideRegex);
    if (match) {
      let existingImports = match[1].split(',').map(s => s.trim());
      for (const icon of iconsNeeded) {
        if (!existingImports.includes(icon) && !existingImports.includes(`${icon} as`)) {
          existingImports.push(icon);
        }
      }
      content = content.replace(lucideRegex, `import { ${existingImports.join(', ')} } from 'lucide-react-native';`);
    } else {
      // Add import at the top (after other imports)
      const newImport = `import { ${Array.from(iconsNeeded).join(', ')} } from 'lucide-react-native';\n`;
      // insert after first import
      content = content.replace(/^(import.*?\n)/m, `$1${newImport}`);
    }
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file} with icons:`, Array.from(iconsNeeded));
  }
}

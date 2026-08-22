const fs = require('fs');
const path = '/Users/mac/Projects/PlayVerse/PlayVerseNode/src/module/match/match.service.ts';

if (!fs.existsSync(path)) {
  console.error('File not found:', path);
  process.exit(1);
}

let content = fs.readFileSync(path, 'utf8');

const target = `  private parseMetadata(metaString: string): any {
    try {
      return JSON.parse(metaString);
    } catch {
      return {};
    }
  }`;

const replacement = `  private parseMetadata(metaString: any): any {
    if (metaString && typeof metaString === "object") {
      return metaString;
    }
    try {
      return JSON.parse(metaString);
    } catch {
      return {};
    }
  }`;

if (!content.includes(target)) {
  console.error('Target content not found in match.service.ts');
  process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Successfully patched match.service.ts');

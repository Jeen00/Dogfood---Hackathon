
const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('frontend/src');
let matches = new Set();
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const regex = /(?:hoverColor|hoverBg)\s*[:=]\s*['\" ]([^'\" ]+)['\" ]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.add(match[1]);
  }
});
console.log(Array.from(matches));


const fs = require('fs');
let code = fs.readFileSync('src/db/seed.js', 'utf8');
code = code.replace(/db\.exec\(`[\s\S]*?DELETE FROM users;\s*`\);/g, '// Tables are no longer cleared to preserve data.');
code = code.replace(/INSERT INTO/g, 'INSERT OR IGNORE INTO');
fs.writeFileSync('src/db/seed.js', code);

const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'frontend/src/pages');
fs.readdirSync(dir).forEach(f => {
  if (f.endsWith('.jsx')) {
    const p = path.join(dir, f);
    let c = fs.readFileSync(p, 'utf8');
    if (c.includes("from 'framer-motion'")) {
      fs.writeFileSync(p, c.replace(/from 'framer-motion'/g, "from 'motion/react'"));
      console.log('Fixed', f);
    }
  }
});

const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Theme.jsx', 'utf8');

code = code.replace(/hoverColor = 'hover:bg-white\\/\\[0\\.05\\]'/g, "hoverColor = 'hover:bg-[var(--card-hover-bg)]'");
code = code.replace(/hoverColor = 'hover:bg-white\\/70'/g, "hoverColor = 'hover:bg-[var(--card-hover-bg)]'");
code = code.replace(/rounded-3xl/g, 'rounded-lg');
code = code.replace(/rounded-\[20px\]/g, 'rounded-md');
code = code.replace(/rounded-full/g, 'rounded-pill');

fs.writeFileSync('frontend/src/components/Theme.jsx', code);

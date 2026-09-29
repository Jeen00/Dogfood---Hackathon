const fs = require('fs');
const file = 'frontend/src/pages/LandingPage.jsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/text-sky-300',\s*bg: 'bg-sky-400\/20',\s*cardBg: 'bg-black\/60 hover:bg-\[var\(--card-hover-bg\)\]'/g, "text-sky-300', bg: 'bg-sky-400/20', cardBg: 'bg-black/60 hover:bg-sky-500/20'");
code = code.replace(/text-amber-300',\s*bg: 'bg-amber-400\/20',\s*cardBg: 'bg-black\/60 hover:bg-\[var\(--card-hover-bg\)\]'/g, "text-amber-300', bg: 'bg-amber-400/20', cardBg: 'bg-black/60 hover:bg-amber-500/20'");
code = code.replace(/text-fuchsia-300',\s*bg: 'bg-fuchsia-400\/20',\s*cardBg: 'bg-black\/60 hover:bg-\[var\(--card-hover-bg\)\]'/g, "text-fuchsia-300', bg: 'bg-fuchsia-400/20', cardBg: 'bg-black/60 hover:bg-fuchsia-500/20'");
code = code.replace(/text-teal-300',\s*bg: 'bg-teal-400\/20',\s*cardBg: 'bg-black\/60 hover:bg-\[var\(--card-hover-bg\)\]'/g, "text-teal-300', bg: 'bg-teal-400/20', cardBg: 'bg-black/60 hover:bg-teal-500/20'");

fs.writeFileSync(file, code);

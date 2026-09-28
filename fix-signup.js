const fs = require('fs');
const p = 'frontend/src/pages/SignupPage.jsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/else navigate\('\/participant\/dashboard'\)/g, "else navigate('/verify-email')");
fs.writeFileSync(p, c);
console.log('Fixed SignupPage.jsx');

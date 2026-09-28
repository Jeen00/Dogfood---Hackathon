const fs = require('fs');
const p = 'src/routes/auth.js';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/router\.get\('\/login', \(req, res\) => \{[\s\S]*?return res\.render\('login', \{ session: null, error: null \}\);\n\}\);/m, 
`router.get('/login', (req, res) => {
  return res.redirect('/'); // Changed to root, or Vite proxy handles /login automatically
});`);

c = c.replace(/return res\.render\('login', \{ session: null, error: 'Email is required' \}\);/g, `return res.status(400).json({ error: 'Email is required' });`);
c = c.replace(/return res\.render\('login', \{ session: null, error: 'Invalid credentials' \}\);/g, `return res.status(401).json({ error: 'Invalid credentials' });`);
c = c.replace(/return res\.render\('login', \{ session: null, error: 'Password is required' \}\);/g, `return res.status(400).json({ error: 'Password is required' });`);

c = c.replace(/if \(user\.role === 'judge'\)     return res\.redirect\('\/judge\/dashboard'\);\n    if \(user\.role === 'organizer'\) return res\.redirect\('\/organizer\/events'\);\n    if \(user\.role === 'participant'\) return res\.redirect\('\/team'\);\n    return res\.redirect\('\/projects'\);/m,
`return res.json({ success: true, role: user.role });`);

c = c.replace(/return res\.render\('login', \{ session: null, error: 'An error occurred\. Please try again\.' \}\);/g, `return res.status(500).json({ error: 'An error occurred.' });`);

fs.writeFileSync(p, c);
console.log('Fixed auth.js');

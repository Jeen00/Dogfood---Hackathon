const fs = require('fs');
const p = 'frontend/src/App.jsx';
let c = fs.readFileSync(p, 'utf8');
if (!c.includes('VerifyEmailPage')) {
  c = c.replace("import ParticipantDashboard from './pages/ParticipantDashboard'", "import ParticipantDashboard from './pages/ParticipantDashboard'\nimport VerifyEmailPage from './pages/VerifyEmailPage'");
  c = c.replace('<Route path="/participant/dashboard" element={<ParticipantDashboard />} />', '<Route path="/verify-email" element={<VerifyEmailPage />} />\n        <Route path="/participant/dashboard" element={<ParticipantDashboard />} />');
  fs.writeFileSync(p, c);
  console.log('Fixed App.jsx');
}

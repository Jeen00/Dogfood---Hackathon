const fs = require('fs');
const file = 'C:/Projects/Dogfood Hackathon - 2026/New Dogfood/frontend/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import SignupPage from './pages/SignupPage'",
  "import SignupPage from './pages/SignupPage'\nimport ForgotPasswordPage from './pages/ForgotPasswordPage'\nimport ResetPasswordPage from './pages/ResetPasswordPage'"
);

content = content.replace(
  "<Route path=\"/signup\" element={<SignupPage />} />",
  "<Route path=\"/signup\" element={<SignupPage />} />\n        <Route path=\"/forgot-password\" element={<ForgotPasswordPage />} />\n        <Route path=\"/reset-password\" element={<ResetPasswordPage />} />"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Done');

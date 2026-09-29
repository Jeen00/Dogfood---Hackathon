const fs = require('fs');

function updateFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/<PageContainer[\s\S]*?<DarkCard[^>]*>/g, 
    '<AuthLayout>\n      <motion.div\n        initial={{ opacity: 0, y: 20 }}\n        animate={{ opacity: 1, y: 0 }}\n        className="w-full relative"\n      >\n        <div className="p-8 rounded-[32px] bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-7">\n          <div className="space-y-2 text-center flex flex-col items-center">\n            <div className="relative flex flex-col items-center mb-4 cursor-pointer" onClick={() => navigate(\'/\')}>\n              <DinoIcon className="w-10 h-8 text-white" style={{ fill: \'currentColor\' }} />\n              <div className="w-8 h-[2px] mt-0.5 bg-white" />\n            </div>'
  );

  content = content.replace(/<\/DarkCard>[\s\S]*?<\/PageContainer>/g, 
    '</div>\n      </motion.div>\n    </AuthLayout>'
  );

  content = content.replace(/import \{ PageContainer.*?\} from '\.\.\/components\/Theme'/, "import { AuthLayout, Heading, Subheading, Label, Input, PrimaryButton } from '../components/Theme'");

  fs.writeFileSync(file, content);
}

updateFile('frontend/src/pages/ForgotPasswordPage.jsx');
updateFile('frontend/src/pages/ResetPasswordPage.jsx');

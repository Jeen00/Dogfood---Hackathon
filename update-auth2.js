const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/VerifyEmailPage.jsx', 'utf8');

content = content.replace(/<div className="min-h-screen bg-\[#0a0d12\] flex flex-col items-center justify-center text-white p-6 font-sans selection:bg-white\/30">/g, 
  '<AuthLayout>'
);

content = content.replace(/<motion.div\n\s*initial=\{\{ opacity: 0, y: 20 \}\}\n\s*animate=\{\{ opacity: 1, y: 0 \}\}\n\s*transition=\{\{ duration: 0.6 \}\}\n\s*className="max-w-md w-full flex flex-col items-center text-center"\n\s*>/g, 
  '<motion.div\n        initial={{ opacity: 0, y: 20 }}\n        animate={{ opacity: 1, y: 0 }}\n        transition={{ duration: 0.6 }}\n        className="w-full max-w-md shrink-0 relative"\n      >\n        <div className="p-8 rounded-[32px] bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-7 flex flex-col items-center text-center">'
);

content = content.replace(/<\/motion.div>\n    <\/div>/g, 
  '</div>\n      </motion.div>\n    </AuthLayout>'
);

content = "import { AuthLayout } from '../components/Theme'\n" + content;

fs.writeFileSync('frontend/src/pages/VerifyEmailPage.jsx', content);

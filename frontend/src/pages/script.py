import re

with open('C:/Projects/Dogfood Hackathon - 2026/New Dogfood/frontend/src/pages/ParticipantDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'import \{ Heading', 'import { PageContainer, DarkCard, WhiteCard, Heading', content)

content = re.sub(r'<div className=\"min-h-screen bg-\[\#0a0d12\].*?\">', '<PageContainer className=\"min-h-screen text-white font-sans selection:bg-white/30 overflow-y-auto\">', content)
content = re.sub(r'</div>\s*\)\s*}', '</PageContainer>\n  )\n}', content)

content = re.sub(r'bg-\[\#0a0d12\] border-b border-white/5', 'bg-black/40 backdrop-blur-md border-b border-white/10', content)

content = re.sub(r'\s*!?rounded-none\s*', ' ', content)

content = re.sub(r'bg-\[\#131722\]', 'bg-black/40 backdrop-blur-xl rounded-2xl', content)
content = re.sub(r'hover:bg-sky-900/60', 'hover:bg-[var(--card-hover-bg)]', content)
content = re.sub(r'hover:bg-amber-900/60', 'hover:bg-[var(--card-hover-bg)]', content)
content = re.sub(r'hover:bg-fuchsia-900/60', 'hover:bg-[var(--card-hover-bg)]', content)

content = content.replace('<button onClick={() => setActiveTab(\'team\')} className=\"px-6 py-3 bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/80 transition-all \">', '<PrimaryButton onClick={() => setActiveTab(\'team\')} className=\"uppercase tracking-widest \">')
content = content.replace('Form a Team\n                  </button>', 'Form a Team\n                  </PrimaryButton>')

with open('C:/Projects/Dogfood Hackathon - 2026/New Dogfood/frontend/src/pages/ParticipantDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

const fs = require('fs');
const p = 'frontend/src/pages/LoginPage.jsx';
let c = fs.readFileSync(p, 'utf8');

const replacement = `<form onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              const data = await res.json();
              if (res.ok) {
                if (data.role === 'judge') navigate('/judge/dashboard');
                else if (data.role === 'organizer') navigate('/organizer/events');
                else navigate('/participant/dashboard');
              } else {
                alert(data.error || 'Login failed');
              }
            }} className="space-y-4">`;

c = c.replace('<form action="/auth/login" method="POST" className="space-y-4">', replacement);
fs.writeFileSync(p, c);
console.log('Fixed LoginPage.jsx');

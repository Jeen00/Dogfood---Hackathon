const fs = require('fs');
let code = fs.readFileSync('src/db/seed.js', 'utf8');

const replacement = `
  const bcrypt = require('bcryptjs');
  const defaultPassword = bcrypt.hashSync('Password@123', 10);
  
  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (id, name, email, role, password_hash, isVerified) VALUES (?, ?, ?, ?, ?, ?)'
  );
  
  insertUser.run('usr_judge_seed', 'Seed Judge', 'judge@gmail.com', 'judge', defaultPassword, 1);
  insertUser.run('usr_part_seed', 'Seed Participant', 'participant@gmail.com', 'participant', defaultPassword, 1);
  insertUser.run('usr_org_seed', 'Seed Organizer', 'organizer@gmail.com', 'organizer', defaultPassword, 1);
  
  insertUser.run('usr_organizer', 'Organizer', 'organizer@example.org', 'organizer', null, 1);
  insertUser.run('usr_prt_2e88', 'Priya Sharma', 'priya1@example.org', 'participant', null, 1);
  insertUser.run('usr_prt_b3f1', 'Demo Participant', 'demo2@example.org', 'participant', null, 1);
`;

code = code.replace(/const insertUser = db\.prepare\([\s\S]*?insertUser\.run\('usr_prt_b3f1'[^)]*\);/, replacement);
code = code.replace(/insertUser\.run\(j\.id, j\.name, j\.email, 'judge', null\);/g, "insertUser.run(j.id, j.name, j.email, 'judge', null, 1);");
code = code.replace(/insertUser\.run\(member\.id, member\.name, member\.email, 'participant', null\);/g, "insertUser.run(member.id, member.name, member.email, 'participant', null, 1);");

fs.writeFileSync('src/db/seed.js', code);

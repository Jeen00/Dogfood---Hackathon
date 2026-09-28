const fs = require('fs');

const realProjects = [
  { title: "React", summary: "The library for web and native user interfaces. Create user interfaces from components.", repo_url: "https://github.com/facebook/react" },
  { title: "Vue", summary: "Vue.js is a progressive, incrementally-adoptable JavaScript framework for building UI on the web.", repo_url: "https://github.com/vuejs/core" },
  { title: "VS Code", summary: "Visual Studio Code is a code editor redefined and optimized for building and debugging modern web and cloud applications.", repo_url: "https://github.com/microsoft/vscode" },
  { title: "TensorFlow", summary: "An Open Source Machine Learning Framework for Everyone. Comprehensive, flexible ecosystem of tools, libraries and community resources.", repo_url: "https://github.com/tensorflow/tensorflow" },
  { title: "Kubernetes", summary: "Production-Grade Container Scheduling and Management. Automates deployment, scaling, and management of containerized applications.", repo_url: "https://github.com/kubernetes/kubernetes" },
  { title: "Linux", summary: "Linux kernel source tree. The core interface between a computer's hardware and its processes.", repo_url: "https://github.com/torvalds/linux" },
  { title: "Next.js", summary: "The React Framework. Provides the building blocks to create fast, scalable web applications.", repo_url: "https://github.com/vercel/next.js" },
  { title: "Tailwind CSS", summary: "A utility-first CSS framework for rapid UI development. Create custom designs without leaving your HTML.", repo_url: "https://github.com/tailwindlabs/tailwindcss" },
  { title: "Docker", summary: "Moby is an open-source project created by Docker to enable and accelerate software containerization.", repo_url: "https://github.com/moby/moby" },
  { title: "Node.js", summary: "Node.js JavaScript runtime built on Chrome's V8 JavaScript engine. Fast, scalable network applications.", repo_url: "https://github.com/nodejs/node" },
  { title: "PyTorch", summary: "Tensors and Dynamic neural networks in Python with strong GPU acceleration. Deep learning framework.", repo_url: "https://github.com/pytorch/pytorch" },
  { title: "Django", summary: "The Web framework for perfectionists with deadlines. High-level Python Web framework.", repo_url: "https://github.com/django/django" },
  { title: "Flutter", summary: "Flutter makes it easy and fast to build beautiful apps for mobile and beyond from a single codebase.", repo_url: "https://github.com/flutter/flutter" },
  { title: "Svelte", summary: "Cybernetically enhanced web apps. A radical new approach to building user interfaces.", repo_url: "https://github.com/sveltejs/svelte" },
  { title: "Godot", summary: "Godot Engine – Multi-platform 2D and 3D game engine. Free and open-source under the MIT license.", repo_url: "https://github.com/godotengine/godot" },
  { title: "Rust", summary: "Empowering everyone to build reliable and efficient software. A language that guarantees memory safety.", repo_url: "https://github.com/rust-lang/rust" },
  { title: "Go", summary: "The Go programming language. An open source language that makes it simple to build reliable software.", repo_url: "https://github.com/golang/go" },
  { title: "Ansible", summary: "Ansible is a radically simple IT automation platform that makes your applications and systems easier to deploy.", repo_url: "https://github.com/ansible/ansible" },
  { title: "Elasticsearch", summary: "Free and Open, Distributed, RESTful Search Engine. A highly scalable open-source full-text search and analytics engine.", repo_url: "https://github.com/elastic/elasticsearch" },
  { title: "Redis", summary: "Redis is an in-memory database that persists on disk. The data model is key-value, but many different kind of values are supported.", repo_url: "https://github.com/redis/redis" }
];

const fixturesPath = './fixtures.json';
const data = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

const tracks = data.tracks.map(t => t.id);

data.projects = data.teams.slice(0, 20).map((team, index) => {
  const rp = realProjects[index];
  return {
    id: `prj_${String(index + 1).padStart(2, '0')}`,
    event_id: "evt_01",
    team_id: team.id,
    track_id: tracks[index % tracks.length],
    title: rp.title,
    summary: rp.summary,
    repo_url: rp.repo_url,
    status: "submitted",
    submitted_at: `2026-02-${String(28 - (index % 28)).padStart(2, '0')}T10:00:00Z`
  };
});

fs.writeFileSync(fixturesPath, JSON.stringify(data, null, 2));
console.log('Fixtures updated with real projects.');

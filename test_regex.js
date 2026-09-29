
const hovers = [
  'hover:bg-[var(--card-hover-bg)]',
  'hover:bg-sky-500/40',
  'hover:bg-sky-900/60',
  'hover:bg-white/[0.08]',
  'hover:bg-teal-500/40',
  'hover:bg-sky-500/20'
];

const regex = /^hover:bg-([a-z]+)-(\d+)(?:\/(?:\[[\d.]+\]|\d+))?$/;

hovers.forEach(h => {
  const match = h.match(regex);
  if (match) {
    console.log(h, '->', match[1], match[2]);
  } else {
    console.log(h, '-> NO MATCH');
  }
});


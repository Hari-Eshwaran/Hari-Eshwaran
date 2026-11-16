#!/usr/bin/env node
/**
 * Builds the hand-designed profile art: assets/hero.svg, milestones.svg, footer.svg and
 * the project cards in assets/projects/, and regenerates the "Selected work" grid in README.md.
 *
 * Edit the data below (a new role, award or stat), then run:
 *   node scripts/build-art.mjs
 * and commit the regenerated SVGs. The animations are plain SVG/CSS, which
 * GitHub renders inside <img> tags.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Black and orange. Every colour in the art comes from here, so a retheme is a one-place change.
// Keep generate-card.mjs in step with this block.
const THEME = {
  heroBg: ['#050505', '#120C08', '#070605'],
  cardBg: ['#0A0908', '#14100D'],
  border: '#2B211A',
  divider: '#241B15',
  dots: '#2A1E15',
  node: '#0B0908',
  tile: '#16110D',
  text: '#F7F1EA',
  body: '#DCCDBF',
  textSoft: '#F3E3D3',
  muted: '#B09A87',
  faint: '#8E7B6C',
  ember: '#FF4D00',
  orange: '#FF7A1A',
  amber: '#FFB347',
  gold: '#FFC857',
  silver: '#D4CCC4',
  spark: '#FFE2C2',
};

const PROFILE = {
  first: 'Harishwaran',
  last: 'Petchimuthu',
  eyebrow: 'CHENNAI, INDIA  ·  TECHNOLOGY ENTREPRENEUR',
  // Typed out one after another in the hero, then erased.
  roles: [
    'CEO @ Thenam Software Solutions',
    'Full-stack developer · AI innovator',
    'Hackathon winner · published researcher',
    'Building intelligent products',
  ],
  chips: [
    { text: '8 hackathon & startup awards', color: THEME.gold },
    { text: '2 research papers', color: THEME.orange },
    { text: '23+ products shipped', color: THEME.amber },
  ],
  site: 'harishwaran.dpdns.org',
};

const MILESTONES = {
  stats: [
    { value: '8', label: 'hackathon & startup awards', color: THEME.gold },
    { value: '₹48K+', label: 'won in prize money', color: THEME.orange },
    { value: '2', label: 'research papers published', color: THEME.amber },
    { value: '20', label: 'certifications', color: THEME.ember },
  ],
  // Oldest first; the timeline draws left to right.
  awards: [
    { date: 'Mar 2025', event: 'Codeathon 3.0', result: 'Winner', project: 'TastyLens' },
    { date: 'Jun 2025', event: "Drestein'25", result: 'Winner', project: 'ZARA' },
    { date: 'Aug 2025', event: 'DCE Hackathon', result: 'Winner', project: 'AgriSmart' },
    { date: 'Jan 2026', event: "Ecoverse'25", result: 'Special winner', project: 'SmartBin' },
    { date: 'Jan 2026', event: 'Project Expo', result: '2nd place', project: 'ReportX' },
    { date: 'Apr 2026', event: 'DevHub 1.0', result: 'Winner', project: 'HypexAI' },
  ],
};

const RESULT_COLORS = { Winner: THEME.gold, '2nd place': THEME.silver, 'Special winner': THEME.orange };

// Selected work, in display order. The first project gets the wide featured card and
// the rest fill a two-column grid. Each card links to `link`. Descriptions must fit in
// three lines; the build stops and says so if one is too long.
const PROJECTS = [
  {
    slug: 'zaymazone',
    name: 'ZAYMAZONE',
    kicker: 'Crafting culture. Empowering artisans.',
    description:
      'An e-commerce marketplace connecting Indian artisans, handmade-product sellers and homepreneurs directly with their customers.',
    badges: [{ kind: 'product', text: 'Flagship product' }],
    tags: ['E-commerce', 'Marketplace', 'Artisans'],
    link: 'https://zaymazone-taupe.vercel.app',
    cta: 'Visit live site',
  },
  {
    slug: 'smsla-source360',
    name: 'SMSLA Source360',
    kicker: 'Enterprise ERP',
    description:
      'Purchase management, approval workflows, finance operations and vendor management, with TallyPrime integration.',
    badges: [{ kind: 'product', text: 'Client product' }],
    tags: ['PostgreSQL', 'Redis', 'Nginx', 'IIS'],
    link: 'https://thenamsoftwaresolutions.com',
    cta: 'Built at Thenam',
  },
  {
    slug: 'zara',
    name: 'ZARA',
    kicker: 'AI student assistant',
    description:
      'AI and IoT assistant that automates academic scheduling, reminders and personalised learning for 100+ students.',
    badges: [{ kind: 'winner', text: "Winner · Drestein'25" }],
    tags: ['AI assistant', 'IoT', 'Real-time AI'],
    link: 'https://zara-ai.vercel.app/',
  },
  {
    slug: 'reportx',
    name: 'ReportX',
    kicker: 'Offline AI audit generator',
    description:
      'Audit reports from local LLMs that cut enterprise documentation effort by 70% while keeping every byte of data on-premise.',
    badges: [{ kind: 'second', text: '2nd place · Project Expo' }],
    tags: ['Ollama', 'Local LLMs', 'Python'],
    link: 'https://report-x-ai.vercel.app/',
  },
  {
    slug: 'agrismart',
    name: 'AgriSmart',
    kicker: 'AI smart agriculture',
    description:
      'Farm-management ecosystem combining IoT sensors, blockchain traceability, predictive analytics and real-time monitoring.',
    badges: [{ kind: 'winner', text: 'Winner · DCE Hackathon' }],
    tags: ['IoT', 'Blockchain', 'Predictive'],
    link: 'https://agrismart-ai-web.vercel.app/',
  },
  {
    slug: 'smartbin',
    name: 'SmartBin',
    kicker: 'Intelligent waste management',
    description:
      'Multi-modal AI and IoT platform that automates waste classification and improves recycling with real-time analytics.',
    badges: [{ kind: 'special', text: "Special winner · Ecoverse'25" }],
    tags: ['Multi-modal AI', 'IoT', 'Analytics'],
    link: 'https://smartbin-ppt.netlify.app/',
  },
  {
    slug: 'plan-panni-pannuvom',
    name: 'Plan Panni Pannuvom',
    kicker: 'AI project generator',
    description:
      'Generative and agentic AI that produces project workflows, intelligent roadmaps and execution guidance for dev teams.',
    badges: [{ kind: 'special', text: 'Special winner · Neurothon 2K26' }],
    tags: ['Generative AI', 'Agentic AI'],
    link: 'https://plan-panni-pannuvom-p3.vercel.app/',
  },
  {
    slug: 'tastylens',
    name: 'TastyLens',
    kicker: 'AR/VR food ordering',
    description:
      'Immersive AR/VR food previews with blockchain-backed supply-chain transparency, built with React and AI.',
    badges: [
      { kind: 'winner', text: 'Winner · Codeathon 3.0' },
      { kind: 'published', text: 'ICEET 2025' },
    ],
    tags: ['React', 'Node.js', 'AR/VR', 'Blockchain'],
    link: 'https://tastylensar.vercel.app/',
  },
  {
    slug: 'heal-fit',
    name: 'Heal-Fit',
    kicker: 'Health & fitness tracker',
    description: 'Tracks health and fitness with personalised workout and nutrition recommendations.',
    badges: [{ kind: 'published', text: 'Published · ICIRES 2025' }],
    tags: ['React', 'TypeScript', 'Supabase'],
    link: 'https://heal-fit.vercel.app/',
  },
];

const SANS = `'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, 'Cascadia Code', Consolas, Menlo, monospace`;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const r2 = (n) => Math.round(n * 100) / 100;
const chars = (s) => [...s].length;

/**
 * Discrete keyframes for a typewriter: each role types in, holds, is erased.
 * Monospace text is pinned to exactly `charW` per character with textLength,
 * so the clip width and the cursor position line up on every font.
 */
function typewriter(roles, { x0, charW, typeStep = 0.055, eraseStep = 0.022, hold = 2.2, gap = 0.45 }) {
  let t = 0.35;
  const lines = roles.map(() => [[0, 0]]);
  const cursor = [[0, x0]];
  roles.forEach((role, i) => {
    const n = chars(role);
    for (let k = 1; k <= n; k++) {
      t += typeStep;
      lines[i].push([t, k * charW]);
      cursor.push([t, x0 + k * charW]);
    }
    t += hold;
    for (let k = n - 1; k >= 0; k--) {
      t += eraseStep;
      lines[i].push([t, k * charW]);
      cursor.push([t, x0 + k * charW]);
    }
    t += gap;
  });
  const total = t;
  const anim = (frames, attr) =>
    `<animate attributeName="${attr}" dur="${r2(total)}s" repeatCount="indefinite" calcMode="discrete" ` +
    `keyTimes="${frames.map(([time]) => (time / total).toFixed(4)).join(';')}" values="${frames.map(([, v]) => r2(v)).join(';')}"/>`;
  return { lines: lines.map((f) => anim(f, 'width')), cursor: anim(cursor, 'x') };
}

function hero() {
  const W = 1200;
  const H = 400;
  const X = 80;
  const typing = { y: 250, size: 24, charW: 14.4 };
  const textX = X + 24;
  const tw = typewriter(PROFILE.roles, { x0: textX, charW: typing.charW });

  // Without animation support, the first role shows fully typed and the rest stay hidden.
  const staticWidth = (i) => (i === 0 ? r2(chars(PROFILE.roles[0]) * typing.charW) : 0);
  const roles = PROFILE.roles
    .map(
      (role, i) => `<clipPath id="type${i}"><rect x="${textX}" y="${typing.y - 26}" width="${staticWidth(i)}" height="36">${tw.lines[i]}</rect></clipPath>
    <text class="typed" x="${textX}" y="${typing.y}" textLength="${r2(chars(role) * typing.charW)}" lengthAdjust="spacingAndGlyphs" clip-path="url(#type${i})">${esc(role)}</text>`,
    )
    .join('\n    ');

  let chipX = X;
  const chips = PROFILE.chips
    .map(({ text, color }) => {
      const w = Math.round(chars(text) * 0.58 * 16 + 34);
      const svg = `<rect x="${chipX}" y="284" width="${w}" height="36" rx="18" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-opacity="0.45"/>
    <text class="chip" x="${chipX + w / 2}" y="308" text-anchor="middle">${esc(text)}</text>`;
      chipX += w + 12;
      return svg;
    })
    .join('\n    ');

  // A small neural network on the right: three layers, fully connected, with signals travelling through it.
  const layers = [
    { x: 905, ys: [150, 220, 290], color: THEME.ember },
    { x: 1010, ys: [115, 185, 255, 325], color: THEME.orange },
    { x: 1115, ys: [150, 220, 290], color: THEME.amber },
  ];
  const edges = [];
  for (let l = 0; l < layers.length - 1; l++) {
    for (const y1 of layers[l].ys) {
      for (const y2 of layers[l + 1].ys) edges.push(`<line x1="${layers[l].x}" y1="${y1}" x2="${layers[l + 1].x}" y2="${y2}"/>`);
    }
  }
  const routes = [
    [0, 1, 0],
    [1, 2, 2],
    [2, 0, 1],
    [1, 3, 0],
    [0, 2, 1],
  ];
  const pulses = routes
    .map((route, i) => {
      const d = route.map((n, l) => `${l ? 'L' : 'M'}${layers[l].x} ${layers[l].ys[n]}`).join(' ');
      const begin = `${r2(i * 0.52)}s`;
      return `<circle r="3.5" fill="${THEME.spark}" opacity="0" filter="url(#glow)">
      <animateMotion path="${d}" dur="2.6s" begin="${begin}" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.85;1" dur="2.6s" begin="${begin}" repeatCount="indefinite"/>
    </circle>`;
    })
    .join('\n    ');
  let nodeIndex = 0;
  const nodes = layers
    .flatMap(({ x, ys, color }) =>
      ys.map((y) => {
        const begin = `${r2(nodeIndex++ * 0.37)}s`;
        return `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${color}" opacity="0">
      <animate attributeName="r" values="10;22" dur="3s" begin="${begin}" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.55;0" dur="3s" begin="${begin}" repeatCount="indefinite"/>
    </circle>
    <circle cx="${x}" cy="${y}" r="10" fill="${THEME.node}" stroke="${color}" stroke-width="2"/>
    <circle cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`;
      }),
    )
    .join('\n    ');

  const alt = `${PROFILE.first} ${PROFILE.last}: ${PROFILE.roles.join('; ')}.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">${esc(`${PROFILE.first} ${PROFILE.last}`)}</title>
  <desc id="desc">${esc(alt)}</desc>
  <style>
    text { font-family: ${SANS}; }
    .eyebrow { font-family: ${MONO}; font-size: 17px; letter-spacing: 3px; fill: ${THEME.orange}; }
    .name { font-size: 56px; font-weight: 700; fill: ${THEME.text}; }
    .prompt, .typed { font-family: ${MONO}; font-size: ${typing.size}px; }
    .prompt { fill: ${THEME.orange}; font-weight: 700; }
    .typed { fill: ${THEME.textSoft}; }
    .chip { font-size: 16px; font-weight: 600; fill: ${THEME.textSoft}; }
    .site { font-family: ${MONO}; font-size: 16px; fill: ${THEME.faint}; }
    .intro { animation: intro 0.9s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
    @keyframes intro { from { opacity: 0; transform: translateY(14px); } }
    @media (prefers-reduced-motion: reduce) { .intro { animation: none; } }
  </style>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${THEME.heroBg[0]}"/>
      <stop offset="0.55" stop-color="${THEME.heroBg[1]}"/>
      <stop offset="1" stop-color="${THEME.heroBg[2]}"/>
    </linearGradient>
    <radialGradient id="glowA">
      <stop offset="0" stop-color="${THEME.orange}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${THEME.orange}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB">
      <stop offset="0" stop-color="${THEME.ember}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${THEME.ember}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="surname" gradientUnits="userSpaceOnUse" x1="430" y1="0" x2="800" y2="0">
      <stop offset="0" stop-color="${THEME.ember}"/>
      <stop offset="0.5" stop-color="${THEME.orange}"/>
      <stop offset="1" stop-color="${THEME.amber}"/>
    </linearGradient>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="12" cy="12" r="1" fill="${THEME.dots}"/>
    </pattern>
    <filter id="glow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="24"/></clipPath>
  </defs>

  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#dots)" opacity="0.7"/>
    <circle cx="300" cy="110" r="300" fill="url(#glowA)">
      <animate attributeName="cx" values="300;380;300" dur="14s" repeatCount="indefinite"/>
    </circle>
    <circle cx="1010" cy="300" r="260" fill="url(#glowB)">
      <animate attributeName="cy" values="300;250;300" dur="11s" repeatCount="indefinite"/>
    </circle>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="${THEME.border}"/>

  <g class="intro">
    <text class="eyebrow" x="${X}" y="122">${esc(PROFILE.eyebrow)}</text>
    <text class="name" x="${X}" y="194" textLength="720" lengthAdjust="spacingAndGlyphs">${esc(PROFILE.first)} <tspan fill="url(#surname)">${esc(PROFILE.last)}</tspan></text>
  </g>

  <text class="prompt" x="${X}" y="${typing.y}">›</text>
  ${roles}
  <rect x="${textX + staticWidth(0)}" y="${typing.y - 22}" width="3" height="28" rx="1.5" fill="${THEME.orange}">
    ${tw.cursor}
    <animate attributeName="opacity" values="1;0" dur="1.05s" calcMode="discrete" repeatCount="indefinite"/>
  </rect>

  <g class="intro" style="animation-delay: 0.25s">
    ${chips}
    <text class="site" x="${X}" y="364">↗ ${esc(PROFILE.site)}</text>
  </g>

  <g stroke="${THEME.orange}" stroke-opacity="0.2" stroke-width="1.2">
    ${edges.join('\n    ')}
  </g>
  ${pulses}
  ${nodes}
</svg>
`;
}

function milestones() {
  const W = 1200;
  const H = 330;
  const colW = W / MILESTONES.stats.length;

  const stats = MILESTONES.stats
    .map(({ value, label, color }, i) => {
      const cx = colW * i + colW / 2;
      const divider = i ? `<line x1="${colW * i}" y1="58" x2="${colW * i}" y2="140" stroke="${THEME.divider}"/>` : '';
      return `${divider}
    <g class="rise" style="animation-delay:${r2(i * 0.1)}s">
      <text class="stat" x="${cx}" y="102" text-anchor="middle" fill="${color}">${esc(value)}</text>
      <text class="stat-label" x="${cx}" y="132" text-anchor="middle">${esc(label)}</text>
    </g>`;
    })
    .join('\n    ');

  const LINE = { x1: 110, x2: 1090, y: 212, draw: 2.4 };
  const step = (LINE.x2 - LINE.x1) / (MILESTONES.awards.length - 1);
  const length = LINE.x2 - LINE.x1;
  const awards = MILESTONES.awards
    .map(({ date, event, result, project }, i) => {
      const x = LINE.x1 + i * step;
      const color = RESULT_COLORS[result] ?? THEME.silver;
      const at = (i / (MILESTONES.awards.length - 1)) * LINE.draw; // when the line reaches this node
      const fade = r2(at + 0.35);
      const reveal = `<animate attributeName="opacity" values="0;0;1" keyTimes="0;${(at / fade).toFixed(3)};1" dur="${fade}s" fill="freeze"/>`;
      const ring =
        result === 'Winner'
          ? `<circle cx="${x}" cy="${LINE.y}" r="9" fill="none" stroke="${color}" opacity="0">
        <animate attributeName="r" values="9;22" dur="2.4s" begin="${fade}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;0" dur="2.4s" begin="${fade}s" repeatCount="indefinite"/>
      </circle>`
          : '';
      return `<g>
      ${reveal}
      ${ring}
      <text class="date" x="${x}" y="${LINE.y - 24}" text-anchor="middle">${esc(date.toUpperCase())}</text>
      <circle cx="${x}" cy="${LINE.y}" r="9" fill="${THEME.node}" stroke="${color}" stroke-width="2.5"/>
      <circle cx="${x}" cy="${LINE.y}" r="4" fill="${color}"/>
      <text class="event" x="${x}" y="${LINE.y + 40}" text-anchor="middle">${esc(event)}</text>
      <text class="result" x="${x}" y="${LINE.y + 65}" text-anchor="middle" fill="${color}">${esc(result)}</text>
      <text class="project" x="${x}" y="${LINE.y + 87}" text-anchor="middle">${esc(project)}</text>
    </g>`;
    })
    .join('\n    ');

  const summary =
    MILESTONES.stats.map((s) => `${s.value} ${s.label}`).join(', ') +
    '. Awards: ' +
    MILESTONES.awards.map((a) => `${a.date}, ${a.event}, ${a.result} (${a.project})`).join('; ') +
    '.';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Milestones</title>
  <desc id="desc">${esc(summary)}</desc>
  <style>
    text { font-family: ${SANS}; }
    .stat { font-size: 48px; font-weight: 700; }
    .stat-label { font-size: 18px; fill: ${THEME.muted}; }
    .date { font-family: ${MONO}; font-size: 15px; letter-spacing: 1px; fill: ${THEME.orange}; }
    .event { font-size: 20px; font-weight: 700; fill: ${THEME.text}; }
    .result { font-size: 16px; font-weight: 600; }
    .project { font-size: 16px; fill: ${THEME.muted}; }
    .rise { animation: rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(12px); } }
    @media (prefers-reduced-motion: reduce) { .rise { animation: none; } }
  </style>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${THEME.cardBg[0]}"/>
      <stop offset="1" stop-color="${THEME.cardBg[1]}"/>
    </linearGradient>
    <linearGradient id="progress" gradientUnits="userSpaceOnUse" x1="${LINE.x1}" y1="0" x2="${LINE.x2}" y2="0">
      <stop offset="0" stop-color="${THEME.ember}"/>
      <stop offset="0.6" stop-color="${THEME.orange}"/>
      <stop offset="1" stop-color="${THEME.gold}"/>
    </linearGradient>
  </defs>

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="url(#bg)" stroke="${THEME.border}"/>
  ${stats}

  <line x1="${LINE.x1}" y1="${LINE.y}" x2="${LINE.x2}" y2="${LINE.y}" stroke="${THEME.border}" stroke-width="3" stroke-linecap="round"/>
  <line x1="${LINE.x1}" y1="${LINE.y}" x2="${LINE.x2}" y2="${LINE.y}" stroke="url(#progress)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${length} ${length}">
    <animate attributeName="stroke-dashoffset" from="${length}" to="0" dur="${LINE.draw}s" fill="freeze"/>
  </line>
  ${awards}
</svg>
`;
}

function footer() {
  const W = 1200;
  const H = 150;
  // Seamless looping waves: each path repeats every `period` px and slides by exactly one period.
  const waves = [
    { y: 118, amp: 10, period: 300, color: THEME.orange, opacity: 0.4, dur: 9, reverse: false },
    { y: 126, amp: 8, period: 400, color: THEME.amber, opacity: 0.28, dur: 13, reverse: true },
    { y: 134, amp: 6, period: 240, color: THEME.ember, opacity: 0.3, dur: 11, reverse: false },
  ]
    .map(({ y, amp, period, color, opacity, dur, reverse }) => {
      const half = period / 2;
      const segments = Math.ceil((W + 2 * period) / half);
      const d = `M${-period} ${y} q${half / 2} ${-amp} ${half} 0` + ` t${half} 0`.repeat(segments - 1);
      const [from, to] = reverse ? [`${-period} 0`, '0 0'] : ['0 0', `${-period} 0`];
      return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="2">
      <animateTransform attributeName="transform" type="translate" from="${from}" to="${to}" dur="${dur}s" repeatCount="indefinite"/>
    </path>`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title">
  <title id="title">Engineer by training, entrepreneur by choice.</title>
  <style>
    text { font-family: ${SANS}; }
    .quote { font-size: 26px; font-weight: 600; fill: ${THEME.text}; }
    .sign { font-family: ${MONO}; font-size: 16px; fill: ${THEME.faint}; }
  </style>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${THEME.cardBg[0]}"/>
      <stop offset="1" stop-color="${THEME.cardBg[1]}"/>
    </linearGradient>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="22"/></clipPath>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="url(#bg)" stroke="${THEME.border}"/>
  <g clip-path="url(#card)">
    ${waves}
  </g>
  <text class="quote" x="${W / 2}" y="62" text-anchor="middle">Engineer by training, entrepreneur by choice.</text>
  <text class="sign" x="${W / 2}" y="94" text-anchor="middle">thanks for stopping by  ·  ${esc(PROFILE.site)}</text>
</svg>
`;
}

// ---------------------------------------------------------------------------
// Project cards

const ICONS = {
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 13v4M8 21h8M10 17h4v4h-4z"/>',
  medal: '<path d="M8 3l3 6M16 3l-3 6"/><circle cx="12" cy="15" r="6"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
};
const BADGES = {
  winner: { color: THEME.gold, icon: 'trophy' },
  second: { color: THEME.silver, icon: 'medal' },
  special: { color: THEME.orange, icon: 'star' },
  published: { color: THEME.amber, icon: 'doc' },
  product: { color: THEME.ember, icon: 'cube' },
};

/** Approximate rendered width of `s` in px. SVG text can't wrap, so layout is measured up front. */
function textWidth(s, size, { mono = false, bold = false } = {}) {
  if (mono) return chars(s) * 0.6 * size;
  let em = 0;
  for (const c of s) {
    if (/[ijl.,:;'!|I]/.test(c)) em += 0.27;
    else if (/[ frt()\-/]/.test(c)) em += 0.34;
    else if (/[mwMW@%]/.test(c)) em += 0.84;
    else if (/[A-Z]/.test(c)) em += 0.65;
    else if (/[0-9]/.test(c)) em += 0.56;
    else em += 0.54;
  }
  return em * size * (bold ? 1.08 : 1);
}

function wrap(text, size, maxWidth, maxLines, where) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (!line || textWidth(next, size) <= maxWidth) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    throw new Error(`${where}: "${text}" wraps to ${lines.length} lines; shorten it to fit in ${maxLines}.`);
  }
  return lines;
}

function badgeRow(badges, x, y, maxRight) {
  let cx = x;
  return badges
    .map((badge) => {
      const { color, icon } = BADGES[badge.kind];
      const label = badge.text.toUpperCase();
      const w = Math.round(40 + textWidth(label, 13, { mono: true }) + 14);
      if (cx + w > maxRight) throw new Error(`Badges don't fit: ${badges.map((b) => b.text).join(', ')}`);
      const svg = `<rect x="${cx}" y="${y}" width="${w}" height="30" rx="15" fill="${color}" fill-opacity="0.1" stroke="${color}" stroke-opacity="0.45"/>
    <g transform="translate(${cx + 13} ${y + 6}) scale(0.75)" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</g>
    <text class="badge" x="${cx + 40}" y="${y + 20}" fill="${color}">${esc(label)}</text>`;
      cx += w + 8;
      return svg;
    })
    .join('\n    ');
}

function tagRow(tags, x, y, maxRight) {
  let cx = x;
  const out = [];
  for (const tag of tags) {
    const w = Math.round(textWidth(tag, 14, { mono: true }) + 24);
    if (cx + w > maxRight) break; // drop tags that would run into the call to action
    out.push(
      `<rect x="${cx}" y="${y}" width="${w}" height="30" rx="8" fill="${THEME.tile}" stroke="${THEME.border}"/>` +
        `<text class="tag" x="${cx + w / 2}" y="${y + 20}" text-anchor="middle">${esc(tag)}</text>`,
    );
    cx += w + 8;
  }
  return out.join('\n    ');
}

function cardStyle() {
  return `<style>
    text { font-family: ${SANS}; }
    .badge { font-family: ${MONO}; font-size: 13px; font-weight: 600; letter-spacing: 0.3px; }
    .index { font-family: ${MONO}; font-size: 16px; fill: ${THEME.faint}; }
    .name { font-weight: 700; fill: ${THEME.text}; }
    .kicker { font-weight: 600; fill: ${THEME.orange}; }
    .body { fill: ${THEME.body}; }
    .tag { font-family: ${MONO}; font-size: 14px; fill: ${THEME.muted}; }
    .cta { font-size: 17px; font-weight: 600; fill: ${THEME.orange}; }
    .button { font-size: 17px; font-weight: 700; fill: #140C06; }
  </style>`;
}

/** Background, rounded border, accent bar and corner glow shared by both card sizes. */
function cardFrame(x, w, h, accent) {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${THEME.cardBg[0]}"/>
      <stop offset="1" stop-color="${THEME.cardBg[1]}"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="0.6" stop-color="${accent}" stop-opacity="0.15"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="shape"><rect x="${x}" width="${w}" height="${h}" rx="20"/></clipPath>
  </defs>
  <g clip-path="url(#shape)">
    <rect x="${x}" width="${w}" height="${h}" fill="url(#bg)"/>
    <circle cx="${x + w}" cy="0" r="${Math.round(h * 0.75)}" fill="url(#glow)"/>
    <rect x="${x}" width="${w}" height="3" fill="url(#bar)"/>
  </g>
  <rect x="${x + 0.5}" y="0.5" width="${w - 1}" height="${h - 1}" rx="20" fill="none" stroke="${THEME.border}"/>`;
}

const projectAlt = (p) =>
  `${p.name}: ${p.kicker.replace(/\.$/, '')}. ${p.badges.map((b) => b.text).join(', ')}. ${p.description}`;

const GRID = { W: 600, H: 340, gutter: 12 };

/** A half-width grid card. Cards carry their own half of the gutter so two sit flush at 50% width. */
function gridCard(p, number, side) {
  const { W, H, gutter } = GRID;
  const x0 = side === 'right' ? gutter : 0;
  const cw = W - gutter;
  const left = x0 + 32;
  const right = x0 + cw - 32;
  const accent = BADGES[p.badges[0].kind].color;

  const name = { size: 32, y: 112 };
  if (textWidth(p.name, name.size, { bold: true }) > right - left) throw new Error(`Name too long: ${p.name}`);
  const body = { size: 19, y: 184, lh: 27 };
  const lines = wrap(p.description, body.size, right - left, 3, p.name);
  const cta = `${p.cta ?? 'Live demo'} ↗`;
  const ctaW = textWidth(cta, 17, { bold: true });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">${esc(p.name)}</title>
  <desc id="desc">${esc(projectAlt(p))}</desc>
  ${cardStyle()}
  ${cardFrame(x0, cw, H, accent)}
  ${badgeRow(p.badges, left, 30, right - 40)}
  <text class="index" x="${right}" y="50" text-anchor="end">${String(number).padStart(2, '0')}</text>
  <text class="name" x="${left}" y="${name.y}" font-size="${name.size}">${esc(p.name)}</text>
  <text class="kicker" x="${left}" y="${name.y + 30}" font-size="18">${esc(p.kicker)}</text>
  <text class="body" font-size="${body.size}">${lines
    .map((l, i) => `<tspan x="${left}" y="${body.y + i * body.lh}">${esc(l)}</tspan>`)
    .join('')}</text>
  <line x1="${left}" y1="270" x2="${right}" y2="270" stroke="${THEME.divider}"/>
  ${tagRow(p.tags, left, 286, right - ctaW - 20)}
  <text class="cta" x="${right}" y="307" text-anchor="end">${esc(cta)}</text>
</svg>
`;
}

/** The wide card for the first project, with a small storefront illustration on the right. */
function featuredCard(p) {
  const W = 1200;
  const H = 380;
  const left = 44;
  const colRight = 660;
  const accent = BADGES[p.badges[0].kind].color;
  const lines = wrap(p.description, 20, colRight - left, 3, p.name);
  const cta = `${p.cta ?? 'Live demo'} ↗`;
  const btnW = Math.round(textWidth(cta, 17, { bold: true }) + 44);

  // Storefront mockup: a browser window with a 3x2 grid of product tiles, one of them highlighted.
  const M = { x: 716, y: 64, w: 440, h: 270 };
  const tileW = (M.w - 32 - 24) / 3;
  const tileH = 88;
  const shapes = [
    (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="11"/>`,
    (cx, cy) => `<rect x="${cx - 11}" y="${cy - 9}" width="22" height="18" rx="4"/>`,
    (cx, cy) => `<path d="M${cx} ${cy - 12} L${cx + 11} ${cy} L${cx} ${cy + 12} L${cx - 11} ${cy} Z"/>`,
  ];
  const tiles = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const tx = M.x + 16 + col * (tileW + 12);
      const ty = M.y + 76 + row * (tileH + 12);
      const hot = row === 0 && col === 1;
      const k = row * 3 + col;
      tiles.push(`<g>
      <rect x="${r2(tx)}" y="${ty}" width="${r2(tileW)}" height="${tileH}" rx="10" fill="#1A140F" stroke="${hot ? THEME.orange : THEME.border}"${hot ? ' stroke-width="1.5"' : ''}>${
        hot ? '<animate attributeName="stroke-opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite"/>' : ''
      }</rect>
      <rect x="${r2(tx + 8)}" y="${ty + 8}" width="${r2(tileW - 16)}" height="44" rx="6" fill="url(#tile)" opacity="${[0.55, 0.9, 0.4, 0.7, 0.5, 0.8][k]}"/>
      <g fill="${THEME.orange}" opacity="0.75">${shapes[k % 3](r2(tx + tileW / 2), ty + 30)}</g>
      <rect x="${r2(tx + 8)}" y="${ty + 60}" width="${r2(tileW * 0.55)}" height="7" rx="3.5" fill="#3A2E25"/>
      <rect x="${r2(tx + 8)}" y="${ty + 73}" width="34" height="7" rx="3.5" fill="${THEME.amber}" opacity="0.75"/>
    </g>`);
    }
  }
  const mockup = `<g>
    <rect x="${M.x}" y="${M.y}" width="${M.w}" height="${M.h}" rx="14" fill="#100C09" stroke="${THEME.border}"/>
    <line x1="${M.x}" y1="${M.y + 32}" x2="${M.x + M.w}" y2="${M.y + 32}" stroke="${THEME.border}"/>
    <circle cx="${M.x + 18}" cy="${M.y + 16}" r="4.5" fill="${THEME.ember}"/>
    <circle cx="${M.x + 34}" cy="${M.y + 16}" r="4.5" fill="${THEME.amber}"/>
    <circle cx="${M.x + 50}" cy="${M.y + 16}" r="4.5" fill="${THEME.gold}"/>
    <rect x="${M.x + 120}" y="${M.y + 8}" width="200" height="16" rx="8" fill="${THEME.tile}" stroke="${THEME.border}"/>
    <text x="${M.x + 220}" y="${M.y + 20}" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${THEME.faint}">${esc(p.name.toLowerCase())}</text>
    <rect x="${M.x + 16}" y="${M.y + 46}" width="74" height="14" rx="4" fill="${THEME.orange}"/>
    <rect x="${M.x + M.w - 150}" y="${M.y + 49}" width="34" height="8" rx="4" fill="#3A2E25"/>
    <rect x="${M.x + M.w - 108}" y="${M.y + 49}" width="34" height="8" rx="4" fill="#3A2E25"/>
    <rect x="${M.x + M.w - 66}" y="${M.y + 45}" width="50" height="16" rx="8" fill="none" stroke="${THEME.orange}"/>
    ${tiles.join('\n    ')}
  </g>`;

  const tagsRight = colRight - btnW - 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">${esc(p.name)}</title>
  <desc id="desc">${esc(projectAlt(p))}</desc>
  ${cardStyle()}
  ${cardFrame(0, W, H, accent)}
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${THEME.ember}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${THEME.amber}" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  ${badgeRow(p.badges, left, 40, colRight)}
  <text class="index" x="${colRight}" y="60" text-anchor="end">01</text>
  <text class="name" x="${left}" y="138" font-size="48">${esc(p.name)}</text>
  <text class="kicker" x="${left}" y="176" font-size="21">${esc(p.kicker)}</text>
  <text class="body" font-size="20">${lines.map((l, i) => `<tspan x="${left}" y="${222 + i * 30}">${esc(l)}</tspan>`).join('')}</text>
  ${tagRow(p.tags, left, 312, tagsRight)}
  <rect x="${colRight - btnW}" y="307" width="${btnW}" height="40" rx="20" fill="${THEME.orange}"/>
  <text class="button" x="${colRight - btnW / 2}" y="333" text-anchor="middle">${esc(cta)}</text>
  ${mockup}
</svg>
`;
}

/** Rewrites the block between the projects markers in README.md so it always matches PROJECTS. */
async function syncReadme(readmeUrl) {
  const start = '<!-- projects:start (generated by scripts/build-art.mjs) -->';
  const end = '<!-- projects:end -->';
  const readme = await readFile(readmeUrl, 'utf8');
  const a = readme.indexOf(start);
  const b = readme.indexOf(end);
  if (a < 0 || b < a) throw new Error('README.md is missing the projects:start / projects:end markers.');

  const card = (p, width) =>
    `<a href="${esc(p.link)}"><img src="./assets/projects/${p.slug}.svg" width="${width}" alt="${esc(projectAlt(p))}" /></a>`;
  const [featured, ...rest] = PROJECTS;
  const rows = [];
  for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2).map((p) => card(p, '49.9%')).join(''));
  const block = [start, '', card(featured, '100%'), '', ...rows.flatMap((r) => [r, '']), end].join('\n');
  await writeFile(readmeUrl, readme.slice(0, a) + block + readme.slice(b + end.length));
}

const assets = new URL('../assets/', import.meta.url);
const projectsDir = new URL('projects/', assets);
await mkdir(projectsDir, { recursive: true });
await writeFile(new URL('hero.svg', assets), hero());
await writeFile(new URL('milestones.svg', assets), milestones());
await writeFile(new URL('footer.svg', assets), footer());
const [featured, ...gridProjects] = PROJECTS;
await writeFile(new URL(`${featured.slug}.svg`, projectsDir), featuredCard(featured));
for (const [i, p] of gridProjects.entries()) {
  // An odd card out at the end sits on the left of its row.
  await writeFile(new URL(`${p.slug}.svg`, projectsDir), gridCard(p, i + 2, i % 2 ? 'right' : 'left'));
}
await syncReadme(new URL('../README.md', import.meta.url));
console.log(`Wrote hero, milestones, footer and ${PROJECTS.length} project cards to ${fileURLToPath(assets)}; synced README.md`);

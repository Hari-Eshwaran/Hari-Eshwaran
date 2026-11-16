#!/usr/bin/env node
/**
 * Builds the hand-designed profile art: assets/hero.svg, assets/milestones.svg and assets/footer.svg.
 *
 * Edit the data below (a new role, award or stat), then run:
 *   node scripts/build-art.mjs
 * and commit the regenerated SVGs. The animations are plain SVG/CSS, which
 * GitHub renders inside <img> tags.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

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
    { text: '8 hackathon & startup awards', color: '#FFD166' },
    { text: '2 research papers', color: '#86A8FF' },
    { text: '23+ products shipped', color: '#7CFFB2' },
  ],
  site: 'harishwaran.dpdns.org',
};

const MILESTONES = {
  stats: [
    { value: '8', label: 'hackathon & startup awards', color: '#FFD166' },
    { value: '₹48K+', label: 'won in prize money', color: '#7CFFB2' },
    { value: '2', label: 'research papers published', color: '#86A8FF' },
    { value: '20', label: 'certifications', color: '#33D6FF' },
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

const RESULT_COLORS = { Winner: '#FFD166', '2nd place': '#C9D6E3', 'Special winner': '#7CFFB2' };

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
    { x: 905, ys: [150, 220, 290], color: '#33D6FF' },
    { x: 1010, ys: [115, 185, 255, 325], color: '#86A8FF' },
    { x: 1115, ys: [150, 220, 290], color: '#7CFFB2' },
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
      return `<circle r="3.5" fill="#B8FFE0" opacity="0" filter="url(#glow)">
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
    <circle cx="${x}" cy="${y}" r="10" fill="#0A1430" stroke="${color}" stroke-width="2"/>
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
    .eyebrow { font-family: ${MONO}; font-size: 17px; letter-spacing: 3px; fill: #33D6FF; }
    .name { font-size: 56px; font-weight: 700; fill: #F5FBFF; }
    .prompt, .typed { font-family: ${MONO}; font-size: ${typing.size}px; }
    .prompt { fill: #7CFFB2; font-weight: 700; }
    .typed { fill: #D8F3FF; }
    .chip { font-size: 16px; font-weight: 600; fill: #E3F4FF; }
    .site { font-family: ${MONO}; font-size: 16px; fill: #6F8FB3; }
    .intro { animation: intro 0.9s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
    @keyframes intro { from { opacity: 0; transform: translateY(14px); } }
    @media (prefers-reduced-motion: reduce) { .intro { animation: none; } }
  </style>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#050816"/>
      <stop offset="0.55" stop-color="#0B1633"/>
      <stop offset="1" stop-color="#02101F"/>
    </linearGradient>
    <radialGradient id="glowA">
      <stop offset="0" stop-color="#33D6FF" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#33D6FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB">
      <stop offset="0" stop-color="#7CFFB2" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#7CFFB2" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="surname" gradientUnits="userSpaceOnUse" x1="430" y1="0" x2="800" y2="0">
      <stop offset="0" stop-color="#33D6FF"/>
      <stop offset="0.5" stop-color="#7CFFB2"/>
      <stop offset="1" stop-color="#86A8FF"/>
    </linearGradient>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="12" cy="12" r="1" fill="#1B2D4F"/>
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
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="#1F3558"/>

  <g class="intro">
    <text class="eyebrow" x="${X}" y="122">${esc(PROFILE.eyebrow)}</text>
    <text class="name" x="${X}" y="194" textLength="720" lengthAdjust="spacingAndGlyphs">${esc(PROFILE.first)} <tspan fill="url(#surname)">${esc(PROFILE.last)}</tspan></text>
  </g>

  <text class="prompt" x="${X}" y="${typing.y}">›</text>
  ${roles}
  <rect x="${textX + staticWidth(0)}" y="${typing.y - 22}" width="3" height="28" rx="1.5" fill="#33D6FF">
    ${tw.cursor}
    <animate attributeName="opacity" values="1;0" dur="1.05s" calcMode="discrete" repeatCount="indefinite"/>
  </rect>

  <g class="intro" style="animation-delay: 0.25s">
    ${chips}
    <text class="site" x="${X}" y="364">↗ ${esc(PROFILE.site)}</text>
  </g>

  <g stroke="#4FB8E6" stroke-opacity="0.22" stroke-width="1.2">
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
      const divider = i ? `<line x1="${colW * i}" y1="58" x2="${colW * i}" y2="140" stroke="#1A2A47"/>` : '';
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
      const color = RESULT_COLORS[result] ?? '#C9D6E3';
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
      <circle cx="${x}" cy="${LINE.y}" r="9" fill="#0A1430" stroke="${color}" stroke-width="2.5"/>
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
    .stat-label { font-size: 18px; fill: #8FB9DA; }
    .date { font-family: ${MONO}; font-size: 15px; letter-spacing: 1px; fill: #5FA8D3; }
    .event { font-size: 20px; font-weight: 700; fill: #EAF6FF; }
    .result { font-size: 16px; font-weight: 600; }
    .project { font-size: 16px; fill: #8FB9DA; }
    .rise { animation: rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(12px); } }
    @media (prefers-reduced-motion: reduce) { .rise { animation: none; } }
  </style>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0A1222"/>
      <stop offset="1" stop-color="#0E1A33"/>
    </linearGradient>
    <linearGradient id="progress" gradientUnits="userSpaceOnUse" x1="${LINE.x1}" y1="0" x2="${LINE.x2}" y2="0">
      <stop offset="0" stop-color="#33D6FF"/>
      <stop offset="0.6" stop-color="#7CFFB2"/>
      <stop offset="1" stop-color="#FFD166"/>
    </linearGradient>
  </defs>

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="url(#bg)" stroke="#1F3558"/>
  ${stats}

  <line x1="${LINE.x1}" y1="${LINE.y}" x2="${LINE.x2}" y2="${LINE.y}" stroke="#1E3356" stroke-width="3" stroke-linecap="round"/>
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
    { y: 118, amp: 10, period: 300, color: '#33D6FF', opacity: 0.35, dur: 9, reverse: false },
    { y: 126, amp: 8, period: 400, color: '#7CFFB2', opacity: 0.28, dur: 13, reverse: true },
    { y: 134, amp: 6, period: 240, color: '#86A8FF', opacity: 0.25, dur: 11, reverse: false },
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
    .quote { font-size: 26px; font-weight: 600; fill: #EAF6FF; }
    .sign { font-family: ${MONO}; font-size: 16px; fill: #6F8FB3; }
  </style>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0A1222"/>
      <stop offset="1" stop-color="#0E1A33"/>
    </linearGradient>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="22"/></clipPath>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="url(#bg)" stroke="#1F3558"/>
  <g clip-path="url(#card)">
    ${waves}
  </g>
  <text class="quote" x="${W / 2}" y="62" text-anchor="middle">Engineer by training, entrepreneur by choice.</text>
  <text class="sign" x="${W / 2}" y="94" text-anchor="middle">thanks for stopping by  ·  ${esc(PROFILE.site)}</text>
</svg>
`;
}

const assets = new URL('../assets/', import.meta.url);
await writeFile(new URL('hero.svg', assets), hero());
await writeFile(new URL('milestones.svg', assets), milestones());
await writeFile(new URL('footer.svg', assets), footer());
console.log(`Wrote hero.svg, milestones.svg and footer.svg to ${fileURLToPath(assets)}`);

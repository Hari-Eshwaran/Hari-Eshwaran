#!/usr/bin/env node
/**
 * Builds the self-hosted "Live from GitHub" card shown on the profile README.
 *
 * Runs daily in .github/workflows/profile-assets.yml, which publishes the SVG
 * to the `output` branch. It replaces third-party stats services, which can
 * pause or rate-limit without warning and leave a broken image behind.
 *
 *   node scripts/generate-card.mjs [--user <login>] [--out <dir>]
 *
 * With GITHUB_TOKEN set it uses the GraphQL API (one request per 100 repos).
 * Without a token it falls back to the public REST API, which is enough for a
 * local preview of an account with a few dozen repositories.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const TIME_ZONE = 'Asia/Kolkata';
const TOP_LANGUAGES = 5;

// Categorical palette checked for colour-blind separation against the card
// surface (#0B1424). Order matters: neighbouring bar segments use neighbouring
// slots, and every adjacent pair in this order passes.
const PALETTE = ['#3987E5', '#D95926', '#199E70', '#C98500', '#D55181'];
const OTHER_COLOR = '#4A5873';
// The languages that dominate this profile keep their colour even when the
// ranking shifts; any other language takes the next free slot.
const PINNED = { TypeScript: 0, JavaScript: 1, Python: 2 };

const SANS = `'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, 'Cascadia Code', Consolas, Menlo, monospace`;

const QUERY = `
  query ($login: String!, $cursor: String) {
    user(login: $login) {
      login
      createdAt
      allRepos: repositories(ownerAffiliations: OWNER, privacy: PUBLIC) {
        totalCount
      }
      repos: repositories(
        first: 100
        after: $cursor
        ownerAffiliations: OWNER
        privacy: PUBLIC
        isFork: false
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          name
          pushedAt
          languages(first: 25, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name } }
          }
        }
      }
    }
  }`;

const token = process.env.GITHUB_TOKEN;

async function request(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      'User-Agent': 'profile-card-generator',
      Accept: 'application/vnd.github+json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}\n${await res.text()}`);
  return res.json();
}

async function fetchViaGraphQL(login) {
  const repos = [];
  let cursor = null;
  let user;
  do {
    const { data, errors } = await request('https://api.github.com/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: QUERY, variables: { login, cursor } }),
    });
    if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));
    user = data?.user;
    if (!user) throw new Error(`No GitHub user named ${login}`);
    for (const r of user.repos.nodes) {
      repos.push({
        name: r.name,
        pushedAt: r.pushedAt,
        languages: Object.fromEntries(r.languages.edges.map((e) => [e.node.name, e.size])),
      });
    }
    cursor = user.repos.pageInfo.hasNextPage ? user.repos.pageInfo.endCursor : null;
  } while (cursor);
  return { login: user.login, createdAt: user.createdAt, publicRepos: user.allRepos.totalCount, repos };
}

async function fetchViaRest(login) {
  const base = `https://api.github.com/users/${encodeURIComponent(login)}`;
  const user = await request(base);
  const owned = [];
  for (let page = 1; ; page++) {
    const batch = await request(`${base}/repos?type=owner&per_page=100&page=${page}`);
    owned.push(...batch);
    if (batch.length < 100) break;
  }
  const repos = await Promise.all(
    owned
      .filter((r) => !r.fork)
      .map(async (r) => ({ name: r.name, pushedAt: r.pushed_at, languages: await request(r.languages_url) })),
  );
  return { login: user.login, createdAt: user.created_at, publicRepos: user.public_repos, repos };
}

function assignColors(languages) {
  const pinned = new Set(languages.map((l) => PINNED[l.name]).filter((slot) => slot !== undefined));
  const free = PALETTE.map((_, slot) => slot).filter((slot) => !pinned.has(slot));
  return languages.map((l) => ({ ...l, color: PALETTE[PINNED[l.name] ?? free.shift()] }));
}

function summarize({ login, createdAt, publicRepos, repos }) {
  const bytes = new Map();
  for (const repo of repos) {
    for (const [name, size] of Object.entries(repo.languages)) bytes.set(name, (bytes.get(name) ?? 0) + size);
  }
  const total = [...bytes.values()].reduce((a, b) => a + b, 0);
  const ranked = total ? [...bytes].sort((a, b) => b[1] - a[1]).map(([name, size]) => ({ name, share: size / total })) : [];
  const languages = assignColors(ranked.slice(0, TOP_LANGUAGES));
  const otherShare = ranked.slice(TOP_LANGUAGES).reduce((sum, l) => sum + l.share, 0);
  if (otherShare > 0) languages.push({ name: 'Other', share: otherShare, color: OTHER_COLOR });

  // The profile repo itself is pushed to every day by this workflow, so it never counts as "latest".
  const latest = repos
    .filter((r) => r.pushedAt && r.name.toLowerCase() !== login.toLowerCase())
    .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))[0];

  return {
    since: new Date(createdAt).getUTCFullYear(),
    publicRepos,
    originalRepos: repos.length,
    languageCount: bytes.size,
    languages,
    latest,
  };
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const count = (n) => n.toLocaleString('en-US');
const pct = (share) => {
  const p = share * 100;
  return p >= 10 ? `${Math.round(p)}%` : p >= 1 ? `${p.toFixed(1)}%` : '<1%';
};
const day = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE });
const truncate = (s, max) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

function renderCard(s, now = new Date()) {
  const W = 1200;
  const H = 336;
  const X = 56;
  const BAR = { y: 174, w: 640, h: 28, gap: 2 };

  const usable = BAR.w - BAR.gap * Math.max(0, s.languages.length - 1);
  let cursor = X;
  const segments = s.languages.map((l) => {
    const w = Math.max(2, l.share * usable);
    const seg = { ...l, x: cursor, w, label: pct(l.share) };
    cursor += w + BAR.gap;
    return seg;
  });

  const bar = segments.length
    ? segments
        .map((seg) => {
          const r = Math.min(4, seg.w / 2);
          const fitsLabel = seg.w >= seg.label.length * 8.6 + 20;
          return (
            `<rect x="${seg.x.toFixed(1)}" y="${BAR.y}" width="${seg.w.toFixed(1)}" height="${BAR.h}" rx="${r}" fill="${seg.color}"/>` +
            (fitsLabel ? `<text class="seg" x="${(seg.x + 10).toFixed(1)}" y="${BAR.y + 19}">${seg.label}</text>` : '')
          );
        })
        .join('\n      ')
    : `<text class="sub" x="${X}" y="${BAR.y + 19}">No public code yet.</text>`;

  const legend = segments
    .map((seg, i) => {
      const x = X + (i % 3) * 216;
      const y = 240 + Math.floor(i / 3) * 30;
      return (
        `<rect x="${x}" y="${y - 11}" width="12" height="12" rx="3" fill="${seg.color}"/>` +
        `<text x="${x + 20}" y="${y}"><tspan class="lg-name">${esc(seg.name)}</tspan><tspan class="lg-pct" dx="8">${seg.label}</tspan></text>`
      );
    })
    .join('\n      ');

  const tiles = [
    ['Public repos', count(s.publicRepos)],
    ['Original projects', count(s.originalRepos)],
    ['Languages', count(s.languageCount)],
    ['On GitHub since', String(s.since)],
  ]
    .map(([label, value], i) => {
      const x = 744 + (i % 2) * 208;
      const y = 100 + Math.floor(i / 2) * 108;
      return `<g class="tile" style="animation-delay:${0.15 + i * 0.12}s">
        <rect x="${x}" y="${y}" width="192" height="92" rx="14" fill="#0F1C36" stroke="#1F3558"/>
        <text class="value" x="${x + 20}" y="${y + 50}">${esc(value)}</text>
        <text class="label" x="${x + 20}" y="${y + 76}">${esc(label)}</text>
      </g>`;
    })
    .join('\n      ');

  const latest = s.latest
    ? `<text class="mono muted" x="${X}" y="306">latest push <tspan class="accent">→ ${esc(truncate(s.latest.name, 32))}</tspan> · ${day(s.latest.pushedAt)}</text>`
    : '';

  const summary = [
    `Language mix by code size: ${s.languages.map((l) => `${l.name} ${pct(l.share)}`).join(', ')}.`,
    `${s.publicRepos} public repos, ${s.originalRepos} original projects, ${s.languageCount} languages, on GitHub since ${s.since}.`,
    s.latest ? `Latest push: ${s.latest.name} on ${day(s.latest.pushedAt)}.` : '',
  ].join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Live from GitHub</title>
  <desc id="desc">${esc(summary)}</desc>
  <style>
    text { font-family: ${SANS}; fill: #EAF6FF; }
    .mono { font-family: ${MONO}; font-size: 15px; letter-spacing: 0.4px; }
    .eyebrow { font-family: ${MONO}; font-size: 15px; letter-spacing: 2.5px; fill: #9FC3E0; }
    .muted { fill: #6F8FB3; }
    .accent { fill: #7CFFB2; }
    .title { font-size: 22px; font-weight: 700; }
    .sub { font-size: 16px; fill: #8FB9DA; }
    .seg { font-size: 14px; font-weight: 600; fill: #FFFFFF; }
    .lg-name { font-size: 16px; fill: #D8E8F5; }
    .lg-pct { font-family: ${MONO}; font-size: 15px; fill: #8FB9DA; }
    .value { font-size: 34px; font-weight: 700; fill: #F5FBFF; }
    .label { font-size: 15px; fill: #8FB9DA; }
    .tile { animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(10px); } }
    @media (prefers-reduced-motion: reduce) { .tile { animation: none; } }
  </style>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0A1222"/>
      <stop offset="1" stop-color="#0E1A33"/>
    </linearGradient>
    <clipPath id="reveal">
      <rect x="${X}" y="${BAR.y - 2}" width="${BAR.w}" height="${BAR.h + 4}">
        <animate attributeName="width" from="0" to="${BAR.w}" dur="1.4s" calcMode="spline" keyTimes="0;1" keySplines="0.22 1 0.36 1" fill="freeze"/>
      </rect>
    </clipPath>
  </defs>

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="url(#bg)" stroke="#1F3558"/>

  <circle cx="${X + 6}" cy="50" r="5" fill="#7CFFB2"/>
  <circle cx="${X + 6}" cy="50" r="5" fill="none" stroke="#7CFFB2" stroke-width="2">
    <animate attributeName="r" values="5;14" dur="2s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.7;0" dur="2s" repeatCount="indefinite"/>
  </circle>
  <text class="eyebrow" x="${X + 22}" y="55">LIVE FROM GITHUB</text>
  <text class="mono muted" x="${W - X}" y="55" text-anchor="end">auto-updated daily · ${day(now)}</text>
  <line x1="${X}" y1="78" x2="${W - X}" y2="78" stroke="#1A2A47"/>

  <text class="title" x="${X}" y="128">Language mix</text>
  <text class="sub" x="${X}" y="154">by code size across ${count(s.originalRepos)} original public repos</text>
  <g clip-path="url(#reveal)">
      ${bar}
  </g>
  <g>
      ${legend}
  </g>
  ${latest}

  <g>
      ${tiles}
  </g>
</svg>
`;
}

const { values } = parseArgs({
  options: {
    user: { type: 'string', default: process.env.GITHUB_USER || 'Hari-Eshwaran' },
    out: { type: 'string', default: 'dist' },
  },
});

const raw = token ? await fetchViaGraphQL(values.user) : await fetchViaRest(values.user);
const summary = summarize(raw);
await mkdir(values.out, { recursive: true });
const file = join(values.out, 'github-card.svg');
await writeFile(file, renderCard(summary));
console.log(`Wrote ${file} via ${token ? 'GraphQL' : 'REST'}:`, JSON.stringify({ ...summary, languages: summary.languages.map((l) => `${l.name} ${pct(l.share)}`) }));

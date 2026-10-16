import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server;
let config;
let api;
let Header;
let ElectionNotice;
let InsightCards;
let PRHighlights;
let locales;
const originalFetch = globalThis.fetch;

before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  config = await server.ssrLoadModule('/src/config/election.ts');
  api = await server.ssrLoadModule('/src/services/api.ts');
  Header = (await server.ssrLoadModule('/src/components/layout/Header.tsx')).default;
  ElectionNotice = (await server.ssrLoadModule('/src/components/ElectionNotice.tsx')).default;
  InsightCards = (await server.ssrLoadModule('/src/components/InsightCards.tsx')).default;
  PRHighlights = (await server.ssrLoadModule('/src/components/PRHighlights.tsx')).default;
  locales = await Promise.all(
    ['en', 'np', 'jp'].map(async (lang) =>
      (await server.ssrLoadModule(`/src/locales/${lang}.ts`))[lang](config.defaultElection),
    ),
  );
});

after(async () => {
  globalThis.fetch = originalFetch;
  await server?.close();
});

test('only live elections schedule refreshes', () => {
  assert.equal(config.getRefreshIntervals('archived'), null);
  assert.equal(config.getRefreshIntervals('upcoming'), null);
  assert.deepEqual(config.getRefreshIntervals('live'), { fptp: 5000, pr: 60000 });
});

test('archive reads all three bundled snapshots without cache-busting or remote fallback', async () => {
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    return { ok: true, json: async () => [] };
  };
  await api.fetchFPTPData(config.defaultElection);
  await api.fetchPRData(config.defaultElection);
  await api.fetchPRByDistrictData(config.defaultElection);
  assert.deepEqual(urls, [
    '/election-np/data/elections/2082/all-results.json',
    '/election-np/data/elections/2082/pr-results.json',
    '/election-np/data/elections/2082/pr-by-district.json',
  ]);
  urls.length = 0;
  globalThis.fetch = async (url) => {
    urls.push(url);
    return { ok: false };
  };
  assert.deepEqual(await api.fetchFPTPData(config.defaultElection), []);
  assert.equal(urls.length, 1);
});

test('archive notices and badges appear in every language without live or loaded-time indicators', () => {
  for (const t of locales) {
    const header = renderToStaticMarkup(
      React.createElement(Header, {
        t,
        election: config.defaultElection,
        setElection() {},
        lang: 'en',
        setLang() {},
        theme: 'dark',
        setTheme() {},
        liveStatus: 'live',
        lastUpdated: 'UNVERIFIED_TIMESTAMP',
        totalElected: 0,
        totalPRDistrictsFinished: 0,
      }),
    );
    const notice = renderToStaticMarkup(
      React.createElement(ElectionNotice, { t, election: config.defaultElection }),
    );
    assert.ok(header.includes(t.archived));
    assert.ok(!header.includes('UNVERIFIED_TIMESTAMP'));
    assert.ok(!header.includes('bg-emerald-400 live'));
    assert.ok(notice.includes(t.archiveTitle));
    assert.ok(notice.includes(t.archiveDescription));
  }
});

test('default selection shows the latest available results, while next election stays separate', () => {
  assert.equal(config.defaultElection.id, '2026');
  assert.equal(config.getElection('next').phase, 'upcoming');
  assert.equal(config.getElection('unknown').id, '2026');
  assert.notEqual(config.getElection('next').dataPath, config.defaultElection.dataPath);
});

test('upcoming elections fetch no previous results; live mode hides completed-election notice', async () => {
  const upcoming = config.getElection('next');
  globalThis.fetch = async () => assert.fail('Upcoming elections must not fetch previous results');
  assert.deepEqual(await api.fetchFPTPData(upcoming), []);
  assert.deepEqual(await api.fetchPRData(upcoming), []);
  assert.deepEqual(await api.fetchPRByDistrictData(upcoming), []);
  assert.ok(
    renderToStaticMarkup(
      React.createElement(ElectionNotice, { t: locales[0], election: upcoming }),
    ).includes(locales[0].upcomingTitle),
  );
  const live = { ...upcoming, phase: 'live' };
  assert.equal(
    renderToStaticMarkup(React.createElement(ElectionNotice, { t: locales[0], election: live })),
    '',
  );
});

test('live elections use their own data path and retain GitHub fallback', async () => {
  const originalWindow = globalThis.window;
  const urls = [];
  globalThis.window = { location: { hostname: 'localhost' } };
  globalThis.fetch = async (url) => {
    urls.push(url);
    return { ok: urls.length > 1, json: async () => [] };
  };
  try {
    await api.fetchPRData({
      ...config.getElection('next'),
      phase: 'live',
      dataPath: 'data/next-test',
    });
    assert.equal(urls.length, 2);
    assert.match(urls[0], /^\/election-np\/data\/next-test\/pr-results\.json\?t=\d+$/);
    assert.match(
      urls[1],
      /^https:\/\/raw\.githubusercontent\.com\/Ashok314\/election-np\/[^/]+\/frontend\/public\/data\/next-test\/pr-results\.json\?t=\d+$/,
    );
  } finally {
    globalThis.window = originalWindow;
  }
});

test('all insight cards remain visible with unpublished values when result data is empty', () => {
  for (const t of locales) {
    const candidates = renderToStaticMarkup(
      React.createElement(InsightCards, { allCandidates: [], leaders: [], t }),
    );
    for (const label of [
      t.closestRace,
      t.mostVotes,
      t.landslideLead,
      t.youngestLeading,
      t.oldestLeading,
      t.womenLeading,
      t.mostContested,
      t.totalCandidates,
      t.independentForce,
      t.winningParties,
    ]) {
      assert.ok(candidates.includes(label), label);
    }
    assert.equal(candidates.split(t.resultsPending).length - 1, 10);
    assert.ok(!candidates.includes('N/A'));
    const pr = renderToStaticMarkup(
      React.createElement(PRHighlights, { prData: [], prByDistrict: [], t }),
    );
    for (const label of [t.totalPRLeader, t.closestBattle, t.totalParties, t.totalVotesLabel]) {
      assert.ok(pr.includes(label), label);
    }
    assert.equal(pr.split(t.resultsPending).length - 1, 4);
  }
});

test('published national PR totals remain visible before district data arrives', () => {
  const t = locales[0];
  const html = renderToStaticMarkup(
    React.createElement(PRHighlights, {
      prData: [{ party_name: 'Example Party', total_votes: 12345 }],
      prByDistrict: [],
      t,
    }),
  );
  assert.ok(html.includes('Example Party'));
  assert.ok(html.includes(t.formatVotes(12345)));
  assert.ok(html.includes(t.closestBattle));
  assert.equal(html.split(t.resultsPending).length - 1, 1);
});

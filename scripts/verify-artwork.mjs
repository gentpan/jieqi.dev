import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const previous = JSON.parse(readFileSync(new URL('docs/artwork-series-progress.json', root)));
const expansion = JSON.parse(readFileSync(new URL('docs/artwork-expansion-progress.json', root)));
const assets = [...previous.assets, ...expansion.assets];
const styles = ['watercolor', 'papercut', 'clay', 'minimal', 'character', 'anime', 'sweet', 'woodblock', 'embroidery'];
const api = 'https://api.jieqi.dev';
const report = { checkedAt: new Date().toISOString(), site: 'https://jieqi.dev', api, series: [], images: [], widget: {}, checks: {} };
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, url);
  return response;
}
const catalog = await (await get(`${api}/v1/styles.json`)).json();
assert.equal(catalog.defaultStyle, 'stamp');
assert.equal(catalog.styles.length, 10);
for (const style of styles) {
  const definition = catalog.styles.find(item => item.id === style);
  assert.equal(definition.coverage, 'complete');
  assert.equal(new Set(definition.eventIds).size, 40);
  const manifest = await (await get(`${api}/v1/manifest.json?style=${style}`)).json();
  const years = [];
  for (const year of [2026, 2027]) {
    const calendar = await (await get(`${api}/v1/calendar/${year}.json?style=${style}`)).json();
    assert.deepEqual([...new Set(calendar.events.map(event => event.eventId))].sort(), [...definition.eventIds].sort());
    for (const event of calendar.events) {
      const asset = assets.find(item => item.style === style && item.eventId === event.eventId);
      assert.deepEqual(event.card.artworkStyle, { requested: style, resolved: style, fallback: false });
      assert.equal(event.card.image, `https://static.jieqi.dev${asset.publishedAsset}`);
      assert.equal(event.card.image, manifest.events.find(item => item.id === event.eventId).image);
    }
    years.push({ year, occurrences: calendar.events.length, uniqueEvents: 40, fallbacks: 0 });
  }
  report.series.push({ style, coverage: definition.coverage, years });
  console.log(`${style}: 2026/2027 each cover 40 unique events, no fallback`);
}
assert.equal(assets.length, 360);
assert.equal(new Set(assets.map(asset => asset.sourceSha256)).size, 360);
assert.equal(new Set(assets.map(asset => asset.sha256)).size, 360);
for (let offset = 0; offset < assets.length; offset += 8) {
  const results = await Promise.all(assets.slice(offset, offset + 8).map(async asset => {
    assert.equal(asset.status, 'approved');
    const url = `https://static.jieqi.dev${asset.publishedAsset}`;
    const response = await get(url);
    assert.match(response.headers.get('content-type'), /image\/webp/);
    const bytes = Buffer.from(await response.arrayBuffer());
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash, asset.sha256, url);
    assert.equal(bytes.length, asset.bytes, url);
    return { style: asset.style, eventId: asset.eventId, url, status: 200, bytes: bytes.length, sha256: hash };
  }));
  report.images.push(...results);
  if (report.images.length % 40 === 0) console.log(`Verified ${report.images.length}/360 image downloads and SHA-256 hashes`);
}
const defaultResponse = await (await get(`${api}/v1/resolve?date=2026-09-07`)).json();
assert.equal(defaultResponse.popup.selected.card.artworkStyle.resolved, 'stamp');
const widgetResponse = await get(`${api}/v1/widget.js`);
assert.equal(widgetResponse.headers.get('access-control-allow-origin'), '*');
const widget = await widgetResponse.text();
assert.match(widget, /height:auto/);
assert.match(widget, /height:fit-content/);
assert.match(widget, /width:min\(880px/);
assert.match(widget, /params|searchParams/);
assert.ok(widget.includes("url.searchParams.set('style', style)"));
const localWidget = readFileSync(new URL('site/public/v1/widget.js', root), 'utf8');
assert.equal(widget, localWidget);
report.widget = { url: `${api}/v1/widget.js`, unchanged: true, styleParameter: true, imageHeightAuto: true, dialogHeightFitContent: true, dialogMaxWidth: 880 };
const html = await (await get('https://jieqi.dev')).text();
assert.ok(html.includes('十种全年系列'));
assert.ok(html.includes('选择卡片集风格'));
report.checks = { httpImages: 360, uniqueOriginals: 360, uniquePublishedImages: 360, matchingHashes: 360, defaultStamp: true, homepageNewSeries: true };
writeFileSync(new URL('docs/artwork-series-verification.json', root), JSON.stringify(report, null, 2) + '\n');
console.log('PASS: production artwork, API coverage, preserved samples, Widget, and homepage');

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

test('JavaScript проходит проверку синтаксиса', () => {
  for (const file of ['js/app.js', 'js/db.js', 'sw.js']) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
    assert.equal(result.status, 0, file + '\n' + result.stderr);
  }
});

test('В HTML есть все пять разделов и нижняя навигация', () => {
  const html = read('index.html');
  for (const view of ['overview', 'clients', 'works', 'money', 'reports']) {
    assert.match(html, new RegExp('id="view-' + view + '"'), 'нет раздела ' + view);
    assert.match(html, new RegExp('data-view="' + view + '"'), 'нет кнопки ' + view);
  }
});

test('Все id, используемые в app.js, существуют в index.html', () => {
  const app = read('js/app.js');
  const html = read('index.html');
  const ids = new Set([...app.matchAll(/\$\('#([A-Za-z0-9_-]+)'\)/g)].map((m) => m[1]));
  const missing = [...ids].filter((id) => !html.includes('id="' + id + '"'));
  assert.deepEqual(missing, [], 'нет элементов: ' + missing.join(', '));
});

test('В HTML нет повторяющихся id', () => {
  const html = read('index.html');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  assert.deepEqual(duplicates, [], 'повторяются: ' + duplicates.join(', '));
});

test('manifest.webmanifest корректен и ссылается на существующие файлы', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.short_name, 'Фрил-Бух');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4);
  for (const icon of manifest.icons) assert.ok(exists(icon.src), 'нет иконки ' + icon.src);
  assert.ok(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 3);
  for (const shortcut of manifest.shortcuts) assert.ok(shortcut.url.startsWith('./'));
  assert.ok(Array.isArray(manifest.screenshots) && manifest.screenshots.length >= 2);
  for (const shot of manifest.screenshots) assert.ok(exists(shot.src), 'нет скриншота ' + shot.src);
});

test('Версия приложения согласована', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, '2.2.0');
  assert.match(read('js/app.js'), /const VERSION = '2\.2\.0';/);
  assert.match(read('index.html'), /<span id="appVersion">2\.2\.0<\/span>/);
});

test('Правила оплаты, акты и связь оплат со счетами на месте', () => {
  const html = read('index.html');
  const app = read('js/app.js');
  for (const id of [
    'clientBillingStep', 'clientMinBillMinutes', 'documentKind',
    'paymentInvoice', 'paymentInvoiceHint', 'invoiceMetaFields',
    'invoiceDateLabel', 'invoiceSubmitBtn'
  ]) {
    assert.match(html, new RegExp('id="' + id + '"'), 'нет поля ' + id);
  }
  assert.match(app, /const BILLING_STEPS = \[0, 5, 10, 15, 30, 60\];/);
  assert.match(app, /const MIN_BILL_MINUTES = \[0, 15, 30, 45, 60, 90, 120\];/);
  assert.match(app, /=== 'act' \? 'act' : 'invoice'/);
  assert.match(app, /invoiceId: linkedInvoice \? linkedInvoice\.id : ''/);
  assert.match(app, /partial: 'Частично оплачен'/);
});

test('Service worker кэширует актуальные файлы', () => {
  const sw = read('sw.js');
  assert.match(sw, /const CACHE = 'frilbuh-v6';/);
  const assets = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);
  for (const asset of assets) assert.ok(exists(asset), 'нет файла в кэше: ' + asset);
});

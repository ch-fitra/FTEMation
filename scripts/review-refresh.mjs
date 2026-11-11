// Regression for the refresh sequence shown in the user's recording.
// Uses the same optional, external Playwright installation as review-ui.mjs.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { chromium } = createRequire(path.join(process.env.PLAYWRIGHT_REVIEW_ROOT ?? path.join(tmpdir(), 'ftemation-ui-review'), 'package.json'))('playwright');
const base = process.env.UI_BASE_URL ?? 'http://localhost:8000';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const env = await readFile(path.join(root, '.env'), 'utf8');
const setting = key => process.env[key] ?? env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1].trim().replace(/^(["'])(.*)\1$/, '$2');
const output = path.join(root, 'storage/app/private/ui-review/refresh');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [];
const errors = [];
function gate() {
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    return { pending, release };
}
try {
    // A signed-out refresh must never mount any workspace UI, even briefly.
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        const name = viewport.width === 390 ? 'mobile' : 'desktop';
        const guest = await browser.newContext({ viewport });
        const page = await guest.newPage();
        let privateRequests = 0;
        page.on('pageerror', err => errors.push(err.message));
        page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/imports')) privateRequests++; });
        await page.addInitScript(() => {
            window.privateFlashes = [];
            new MutationObserver(() => {
                if (document.querySelector('.workspace, .sidebar, .workspace-title, .metrics, .workspace-placeholder')) window.privateFlashes.push('workspace rendered before login');
            }).observe(document, { childList: true, subtree: true });
        });
        for (const url of ['/', '/imports', '/activities']) {
            // Check direct navigation and a second load through the browser refresh.
            for (const refresh of [false, true]) {
                const pending = gate();
                await page.route('**/api/user', async route => { await pending.pending; await route.continue(); });
                if (refresh) await page.reload({ waitUntil: 'domcontentloaded' });
                else await page.goto(`${base}${url}`, { waitUntil: 'domcontentloaded' });
                await page.getByRole('status', { name: 'Memeriksa sesi' }).waitFor();
                assert.equal(await page.locator('.workspace').count(), 0);
                await page.waitForTimeout(200);
                pending.release();
                await page.locator('#password').waitFor();
                await page.waitForURL(url => url.pathname === '/');
                assert.deepEqual(await page.evaluate(() => window.privateFlashes), []);
                assert.equal(privateRequests, 0);
                assert.equal(await page.locator('.login-story').evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
                await page.unrouteAll({ behavior: 'wait' });
            }
            await page.screenshot({ path: path.join(output, `${name}-guest-${url.slice(1) || 'overview'}.png`) });
            checks.push(`${name}/guest${url}: direct load and refresh show no workspace or private requests`);
        }
        await guest.close();
    }
    const context = await browser.newContext();
    const login = await context.newPage();
    await login.goto(`${base}/`);
    await login.getByLabel('Username', { exact: true }).fill(setting('DEMO_USERNAME'));
    await login.getByLabel('Password', { exact: true }).fill(setting('DEMO_PASSWORD'));
    await login.getByRole('button', { name: /^Masuk$/ }).click();
    await login.locator('.department-chart').waitFor();
    const state = await context.storageState();
    await context.close();
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        const name = viewport.width === 390 ? 'mobile' : 'desktop';
        const ctx = await browser.newContext({ viewport, storageState: state, colorScheme: 'dark' });
        const page = await ctx.newPage();
        page.on('pageerror', err => errors.push(err.message));
        await page.addInitScript(() => {
            window.refreshFlashes = [];
            new MutationObserver(() => {
                const text = document.body?.textContent ?? '';
                for (const label of ['Pilih dataset untuk memulai', 'Awali dengan data workload Anda', 'Memuat FTEMation']) {
                    if (text.includes(label)) window.refreshFlashes.push(label);
                }
                if (document.querySelector('#password')) window.refreshFlashes.push('login');
            }).observe(document, { childList: true, subtree: true });
        });
        await page.goto(`${base}/`);
        await page.locator('.department-chart').waitFor();
        const rootWidth = await page.locator('.main-shell').evaluate(el => el.getBoundingClientRect().width);
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'light');
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter), 'stable');
        checks.push(`${name}/scrollbar: light theme retained under dark system preference`);
        const gates = { session: gate(), history: gate(), summary: gate() };
        await page.route('**/api/user', async route => { await gates.session.pending; await route.continue(); });
        await page.route(/\/api\/imports(?:\?.*)?$/, async route => { await gates.history.pending; await route.continue(); });
        await page.route(/\/api\/imports\/\d+$/, async route => { await gates.summary.pending; await route.continue(); });
        await page.reload({ waitUntil: 'domcontentloaded' });
        for (const phase of ['session', 'history', 'summary']) {
            if (phase === 'session') {
                await page.getByRole('status', { name: 'Memeriksa sesi' }).waitFor();
                assert.equal(await page.locator('.workspace').count(), 0);
            } else {
            await page.getByRole('status', { name: 'Memuat halaman' }).waitFor();
            assert.equal(await page.locator('.sidebar').count(), 1);
            assert.equal(await page.locator('.workspace-title').textContent(), 'Ruang kerja assessment');
            assert.equal(await page.locator('.placeholder-line.value').count(), 4);
            }
            // Hold each request to expose intermediate states reliably.
            await page.waitForTimeout(400);
            assert.deepEqual(await page.evaluate(() => window.refreshFlashes), []);
            if (phase !== 'session') assert(Math.abs(await page.locator('.main-shell').evaluate(el => el.getBoundingClientRect().width) - rootWidth) < 1, 'Shell width must remain stable while loading');
            await page.screenshot({ path: path.join(output, `${name}-${phase}.png`) });
            checks.push(`${name}/${phase}: verified session gate then workload placeholder, no false empty/login screen`);
            gates[phase].release();
            if (phase === 'session') await page.waitForRequest(/\/api\/imports(?:\?.*)?$/);
            if (phase === 'history') await page.waitForRequest(/\/api\/imports\/\d+$/);
        }
        await page.locator('.department-chart').waitFor();
        assert.deepEqual(await page.evaluate(() => window.refreshFlashes), []);
        assert.equal(await page.locator('.workspace-placeholder').count(), 0);
        await page.screenshot({ path: path.join(output, `${name}-ready.png`) });
        checks.push(`${name}/ready: real workload replaces placeholder`);
        await page.unrouteAll({ behavior: 'wait' });
        for (const url of ['/imports', '/activities']) {
            const pending = gate();
            await page.route('**/api/user', async route => { await pending.pending; await route.continue(); });
            await page.goto(`${base}${url}`, { waitUntil: 'domcontentloaded' });
            await page.getByRole('status', { name: 'Memeriksa sesi' }).waitFor();
            assert.equal(await page.locator('.workspace').count(), 0);
            const loadingWidth = await page.evaluate(() => document.documentElement.clientWidth);
            await page.screenshot({ path: path.join(output, `${name}-${url.slice(1)}-loading.png`) });
            pending.release();
            if (url === '/activities') await page.locator('tbody .activity-code').first().waitFor();
            else await page.getByRole('heading', { name: 'Import workbook Excel', exact: true }).waitFor();
            assert(Math.abs(await page.evaluate(() => document.documentElement.clientWidth) - loadingWidth) < 1);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
            await page.screenshot({ path: path.join(output, `${name}-${url.slice(1)}-ready.png`) });
            checks.push(`${name}${url}: shell width stable before/after refresh data`);
            await page.unrouteAll({ behavior: 'wait' });
        }
        const filter = gate();
        await page.route(/\/api\/imports\/\d+\/activities\?/, async route => { await filter.pending; await route.continue(); });
        const tableHeight = await page.locator('table').evaluate(el => el.getBoundingClientRect().height);
        await Promise.all([
            page.waitForRequest(request => request.url().includes('department=Operations')),
            page.locator('.filters select').first().selectOption('Operations'),
        ]);
        assert.equal(await page.locator('tbody .activity-code').count(), 20);
        assert(Math.abs(await page.locator('table').evaluate(el => el.getBoundingClientRect().height) - tableHeight) < 1);
        checks.push(`${name}/activities: existing rows retained during filter request`);
        filter.release();
        await page.waitForFunction(() => document.querySelector('.activity-code')?.textContent.includes('ACT-0041'));
        await page.unrouteAll({ behavior: 'wait' });
        const iconUrl = await page.locator('link[rel="icon"]').getAttribute('href');
        const icon = await page.request.get(new URL(iconUrl, base).href);
        assert.equal(icon.status(), 200);
        assert.match(icon.headers()['content-type'], /svg/);
        assert.doesNotMatch(await icon.text(), /<text|<image/);
        assert((await icon.body()).length < 2000);
        checks.push(`${name}/favicon: lightweight vector symbol without text`);
        // A failed summary must show an error, never a misleading empty dataset.
        await page.unrouteAll({ behavior: 'wait' });
        await page.route(/\/api\/imports\/\d+$/, route => route.fulfill({ status: 503, json: { message: 'Test failure' } }));
        await page.goto(`${base}/`);
        await page.getByText(/Server gagal memproses permintaan/).waitFor();
        assert.deepEqual(await page.evaluate(() => window.refreshFlashes), []);
        assert.equal(await page.locator('.workspace-placeholder').count(), 0);
        checks.push(`${name}/failure: actionable error, no false empty state`);
        await page.unrouteAll({ behavior: 'wait' });
        await page.route(/\/api\/imports(?:\?.*)?$/, route => route.fulfill({ json: { data: [], last_page: 1 } }));
        await page.reload();
        await page.getByRole('heading', { name: 'Awali dengan data workload Anda' }).waitFor();
        checks.push(`${name}/empty: genuinely empty history still offers import`);
        await ctx.close();
    }
    assert.deepEqual(errors, []);
    await writeFile(path.join(output, 'report.json'), JSON.stringify({ checks, errors }, null, 2));
    console.log(JSON.stringify({ checks: checks.length, runtimeErrors: errors.length, screenshots: output }));
} finally { await browser.close(); }

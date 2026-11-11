// Read-only real data plus browser-only response fixtures. No import/AI mutation.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = createRequire(path.join(tmpdir(), 'ftemation-ui-review/package.json'))('playwright');
const env = await readFile('.env', 'utf8');
const setting = key => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1].trim().replace(/^(["'])(.*)\1$/, '$2');
const out = 'storage/app/private/ui-review/audit-fixes';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], errors = [];
try {
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:8000');
    await page.getByLabel('Username', { exact: true }).fill(setting('DEMO_USERNAME'));
    await page.getByLabel('Password', { exact: true }).fill(setting('DEMO_PASSWORD'));
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await page.locator('.department-chart').waitFor();
    const headers = { Origin: 'http://localhost:8000', Accept: 'application/json' };
    const imports = await (await page.request.get('http://localhost:8000/api/imports', { headers })).json();
    const id = imports.data.find(i => i.status === 'imported').id;
    const detail = await (await page.request.get(`http://localhost:8000/api/imports/${id}`, { headers })).json();
    const summary = detail.summary;
    assert(summary.analysis_run_id);
    for (const width of [320, 390, 768, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        for (const url of ['/', '/analysis']) {
            await page.goto(`http://localhost:8000${url}`, { waitUntil: 'networkidle' });
            await page.locator(url === '/' ? '.department-chart' : '.analysis-tabs').waitFor();
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
            if (url === '/') {
                assert.equal(await page.locator('.ai-notice').count(), 0);
            }
            await page.screenshot({ path: `${out}/${url === '/' ? 'overview' : 'analysis'}-${width}.png`, fullPage: true });
            checks.push(`${url} responsive and completed state ${width}px`);
        }
    }
    for (const [status, label] of [['not_started', 'Analisis belum dimulai'], ['queued', 'Analisis dalam antrean'], ['processing', 'Analisis sedang berjalan'], ['failed', 'Analisis gagal'], ['partial_failed', 'Analisis sebagian gagal'], ['completed', 'Analisis lengkap']]) {
        const fixture = structuredClone(detail);
        fixture.summary.analysis_status = status;
        if (status === 'not_started') Object.assign(fixture.summary, { analysis_run_id: null, automation_levels: null, estimated_fte_saving: null, remaining_fte: null });
        await page.route(`**/api/imports/${id}`, route => route.fulfill({ json: fixture }));
        await page.goto('http://localhost:8000/', { waitUntil: 'networkidle' });
        await page.locator('.department-chart').waitFor();
        assert.equal(await page.locator('.ai-notice').count(), 0);
        assert.equal(await page.locator('.metric').count(), 4);
        checks.push(`Overview state fixture ${status}`);
        await page.unroute(`**/api/imports/${id}`);
    }
    const historyUrl = /\/api\/imports(?:\?.*)?$/;
    await page.route(historyUrl, route => route.fulfill({ json: { ...imports, data: [] } }));
    await page.goto('http://localhost:8000/', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Awali dengan data workload Anda' }).waitFor();
    checks.push('Overview no-import fixture');
    await page.unroute(historyUrl);
    await page.route('**/api/analyses/*', async route => {
        const response = await route.fetch();
        const data = await response.json();
        if (data.report) data.report.calculation.saving_rates = { high: .55, medium: .25, low: .05 };
        await route.fulfill({ response, json: data });
    });
    await page.goto('http://localhost:8000/analysis', { waitUntil: 'networkidle' });
    await page.getByText('Asumsi High 55% · Medium 25% · Low 5%', { exact: true }).waitFor();
    checks.push('Analysis saving label uses selected snapshot response fixture');
    assert.deepEqual(errors, []);
    await writeFile(`${out}/checks.json`, JSON.stringify({ checks, runtimeErrors: errors }, null, 2));
    console.log(JSON.stringify({ count: checks.length, checks, runtimeErrors: errors }));
} finally { await browser.close(); }

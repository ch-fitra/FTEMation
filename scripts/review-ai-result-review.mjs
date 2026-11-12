// Read-only verification against stored backend results. No inference or data writes.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = createRequire(path.join(tmpdir(), 'ftemation-ui-review/package.json'))('playwright');
const env = await readFile('.env', 'utf8');
const setting = key => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1].trim().replace(/^(["'])(.*)\1$/, '$2');
const out = 'storage/framework/testing/ai-result-review';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], mutations = [], checks = [];
try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => {
        const request = route.request();
        if (request.method() !== 'GET' && !new URL(request.url()).pathname.endsWith('/api/login')) {
            mutations.push(`${request.method()} ${new URL(request.url()).pathname}`);
            return route.abort();
        }
        return route.continue();
    });
    await page.goto('http://localhost:8000');
    await page.getByLabel('Username', { exact: true }).fill(setting('DEMO_USERNAME'));
    await page.getByLabel('Password', { exact: true }).fill(setting('DEMO_PASSWORD'));
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await page.locator('.department-chart').waitFor();
    const get = async endpoint => {
        const response = await page.request.get(`http://localhost:8000${endpoint}`, { headers: { Origin: 'http://localhost:8000', Accept: 'application/json' } });
        assert.equal(response.ok(), true);
        return response.json();
    };
    const imports = await get('/api/imports');
    let data;
    for (const dataset of imports.data) {
        const history = await get(`/api/imports/${dataset.id}/analyses`);
        for (const run of history.filter(run => run.status === 'completed')) {
            const candidate = await get(`/api/analyses/${run.id}`);
            if (candidate.consistency_review?.length) { data = candidate; break; }
        }
        if (data) break;
    }
    assert.ok(data, 'A stored completed run with review groups must exist');
    const review = page.locator('.ai-review');
    const dialog = page.getByRole('dialog', { name: /./ }).filter({ has: page.locator('#ai-review-dialog-title') });
    for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`http://localhost:8000/results?dataset=${data.import_id}&run=${data.id}`);
        await page.getByRole('heading', { name: 'Pemeriksaan Hasil AI', exact: true }).waitFor();
        assert.ok((await review.innerText()).includes(`${data.consistency_review.length} kelompok untuk ditinjau`));
        assert.match(await review.innerText(), /belum tentu kesalahan AI/);
        assert.equal(await review.locator('details').count(), 0);
        assert.equal(await review.locator('.ai-review-group').count(), Math.min(3, data.consistency_review.length));
        if (data.consistency_review.length > 3) await review.getByRole('button', { name: `Lihat semua ${data.consistency_review.length} kelompok`, exact: true }).click();
        assert.equal(await review.locator('.ai-review-group').count(), data.consistency_review.length);
        for (const [index, group] of data.consistency_review.entries()) {
            const button = review.locator('.ai-review-group').nth(index);
            assert.ok((await button.innerText()).includes(`${group.activities.length} aktivitas`));
            const levels = group.activities.reduce((counts, activity) => { counts[activity.automation_level] = (counts[activity.automation_level] ?? 0) + 1; return counts; }, {});
            for (const [level, count] of Object.entries(levels)) {
                assert.equal(await button.locator(`.level-${level} b`).innerText(), String(count));
            }
            await button.click();
            await dialog.waitFor();
            assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
            const articles = dialog.locator('.ai-review-activity');
            assert.equal(await articles.count(), group.activities.length);
            for (const [i, activity] of group.activities.entries()) {
                const article = articles.nth(i);
                assert.equal(await article.locator('h3').innerText(), activity.activity_name);
                assert.equal(await article.locator('.ai-review-identity').innerText(), `${activity.activity_id} · ${activity.department}`);
                assert.equal(await article.locator('.ai-review-reason').textContent(), activity.reason);
                assert.equal(await article.locator(`.level-${activity.automation_level}`).count(), 1);
                assert.equal(await article.locator('.ai-review-factors > div').count(), Object.keys(activity.factors ?? {}).length);
            }
            assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
            assert.equal(await dialog.locator('.activity-dialog-body').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
            if (index === 0) {
                await page.screenshot({ path: `${out}/detail-${width}.png` });
                const headerTop = await dialog.locator('header').evaluate(el => el.getBoundingClientRect().top);
                await dialog.locator('.activity-dialog-body').evaluate(el => { el.scrollTop = el.scrollHeight; });
                assert.equal(await dialog.locator('header').evaluate(el => el.getBoundingClientRect().top), headerTop);
                await dialog.getByRole('button', { name: 'Tutup pemeriksaan hasil AI' }).click();
            } else await page.keyboard.press('Escape');
            await dialog.waitFor({ state: 'hidden' });
            assert.equal(await button.evaluate(el => el === document.activeElement), true);
        }
        if (data.consistency_review.length > 3) await review.getByRole('button', { name: 'Tampilkan lebih sedikit', exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        await review.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${out}/list-${width}.png` });
        checks.push(`${width}px: all ${data.consistency_review.length} groups and activity reasons match stored backend results; levels, modal, close, focus, scrolling and overflow verified`);
    }
    assert.deepEqual(await get(`/api/analyses/${data.id}`), data);
    checks.push('Backend run unchanged after all checks');
    // Client-only empty state: no invented assurance or candidates.
    await page.route(`**/api/analyses/${data.id}`, route => route.fulfill({ json: { ...data, consistency_review: [] } }));
    await page.reload();
    await page.locator('.analysis-tabs').waitFor();
    assert.equal(await review.count(), 0);
    checks.push('Empty candidate list leaves analysis results usable');
    assert.deepEqual(errors, []);
    assert.deepEqual(mutations, []);
    await writeFile(`${out}/checks.json`, JSON.stringify({ run: data.id, checks, errors, mutations }, null, 2));
    console.log(JSON.stringify({ run: data.id, checks, errors, mutations }, null, 2));
} finally {
    await browser.close();
}

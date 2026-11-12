// Local browser verification: reads completed runs; never starts/retries/imports AI data.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = createRequire(path.join(tmpdir(), 'ftemation-ui-review/package.json'))('playwright');
const env = await readFile('.env', 'utf8');
const setting = key => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1].trim().replace(/^(["'])(.*)\1$/, '$2');
const out = 'storage/framework/testing/quality';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], errors = [], mutations = [];
try {
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', route => {
        const request = route.request();
        if (request.method() !== 'GET' && !/\/api\/(login|logout)$/.test(request.url())) {
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
    await page.getByText(/6 karyawan memiliki aktivitas tercatat di atas satu FTE/).waitFor();
    checks.push('Run #4 dashboard: six employees above one FTE with verification guidance');
    await page.goto('http://localhost:8000/results?dataset=4&run=4', { waitUntil: 'networkidle' });
    await page.locator('.analysis-tabs').waitFor();
    const data = await (await page.request.get('http://localhost:8000/api/analyses/4', { headers: { Origin:'http://localhost:8000', Accept:'application/json' } })).json();
    assert.equal(data.report.prompt_version, 'activity-v1');
    assert.deepEqual(data.report.totals.levels, {high:29,medium:28,low:33});
    assert.equal(data.report.activities.length,90);
    assert(data.consistency_review.some(g => g.group_id === 'data_reconciliation'));
    await page.getByRole('heading', { name:'Pemeriksaan Hasil AI', exact:true }).waitFor();
    const more = page.getByRole('button', {name:`Lihat semua ${data.consistency_review.length} kelompok`, exact:true});
    if (await more.count()) await more.click();
    await page.locator('.ai-review-group').filter({hasText:'Pencocokan data'}).click();
    const review = page.locator('.ai-review-dialog[open]');
    assert.match(await review.innerText(), /ACT-1002/);
    assert.match(await review.innerText(), /ACT-1036/);
    await page.keyboard.press('Escape');
    await review.waitFor({state:'hidden'});
    checks.push('Advisory explains differences and preserves historical classifications');
    await page.getByRole('button', {name:'Seluruh aktivitas',exact:true}).click();
    for (const id of ['ACT-1038','ACT-1062','ACT-1063','ACT-1068','ACT-1071']) {
        await page.getByLabel('Cari hasil', {exact:true}).fill(id);
        const row = page.locator('tbody tr').filter({hasText:id});
        await row.waitFor();
        await row.getByRole('button', {name:/Lihat detail/}).click();
        await page.locator('dialog[open]').waitFor();
        const original = data.report.activities.find(a => a.activity_id === id);
        assert.equal(original.oversight_required,false);
        assert.match(await page.locator('dialog').innerText(), /bukan jaminan tanpa manusia/);
        assert((await page.locator('dialog').innerText()).includes(original.recommendation));
        await page.keyboard.press('Escape');
    }
    checks.push('All five audited exception cases: false flags explained beside unchanged recommendations');
    await page.getByRole('button', {name:'Karyawan',exact:true}).click();
    assert.equal(await page.locator('.analysis-cards article').filter({hasText:'Beban aktivitas tercatat melebihi satu FTE'}).count(),6);
    checks.push('Six informative employee workload notes without capping FTE');
    for (const width of [390,768,1440]) {
        await page.setViewportSize({width,height:1000});
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false);
        await page.screenshot({path:`${out}/ai-quality-${width}.png`,fullPage:true});
    }
    checks.push('Employee and advisory presentation fits mobile, tablet, desktop');
    assert.deepEqual(errors,[]);
    assert.deepEqual(mutations,[]);
    await writeFile(`${out}/browser-checks.json`,JSON.stringify({checks,errors,mutations},null,2));
    console.log(JSON.stringify({checks,errors,mutations},null,2));
} finally {
    await browser.close();
}

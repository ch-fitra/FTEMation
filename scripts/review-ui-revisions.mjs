import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = createRequire(path.join(tmpdir(), 'ftemation-ui-review/package.json'))('playwright');
const env = await readFile('.env', 'utf8');
const setting = key => env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1].trim().replace(/^(["'])(.*)\1$/, '$2');
const out = 'storage/app/private/ui-review/ui-revisions';
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
 assert.equal(await page.locator('.ai-notice').count(), 0);
 checks.push('Overview banner removed');
 await page.goto('http://localhost:8000/activities');
 const dept = page.getByRole('combobox', { name: 'Departemen', exact: true });
 await dept.click();
 await page.getByRole('option', { name:'Finance & Accounting', exact:true }).click();
 await page.waitForLoadState('networkidle');
 assert.match(await dept.innerText(), /Finance & Accounting/);
 const frequency = page.getByRole('combobox', { name: 'Frekuensi', exact: true });
 await frequency.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
 assert.match(await frequency.innerText(), /daily/);
 await frequency.click(); await page.keyboard.press('Escape');
 assert.equal(await frequency.getAttribute('aria-expanded'), 'false');
 checks.push('Dropdown pointer, keyboard selection and Escape');
 await page.goto('http://localhost:8000/imports');
 await page.locator('.upload-zone').waitFor();
 async function drop(files) {
  await page.locator('.upload-zone').evaluate((el, files) => {
   const data = new DataTransfer(); for (const file of files) data.items.add(new File(['test'], file, { type:'application/octet-stream' }));
   el.dispatchEvent(new DragEvent('dragover', { bubbles:true, cancelable:true, dataTransfer:data }));
   el.dispatchEvent(new DragEvent('drop', { bubbles:true, cancelable:true, dataTransfer:data }));
  }, files);
 }
 await drop(['invalid.txt']); await page.getByRole('alert').waitFor();
 assert.equal(await page.getByRole('button', { name:/Validasi & import/ }).isDisabled(), true);
 await drop(['workload.xlsx']); assert.equal(await page.getByRole('button', { name:/Validasi & import/ }).isEnabled(), true);
 await drop(['one.xlsx','two.xlsx']); assert.equal(await page.getByRole('button', { name:/Validasi & import/ }).isDisabled(), true);
 await page.locator('input[type=file]').setInputFiles({name:'oversize.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.alloc(5*1024*1024+1)});
 assert.equal(await page.getByRole('button', { name:/Validasi & import/ }).isDisabled(), true);
 await page.locator('input[type=file]').setInputFiles('samples/FTEMation_Workload_Dataset_v1.xlsx');
 assert.equal(await page.getByRole('button', { name:/Validasi & import/ }).isEnabled(), true);
 checks.push('Drag-drop valid, invalid, multiple files; file picker (no import submitted)');
 for (const width of [320,390,768,1440,1920]) {
  await page.setViewportSize({ width, height:900 });
  for (const route of ['/analysis','/imports','/activities']) {
   await page.goto(`http://localhost:8000${route}`, {waitUntil:'networkidle'});
   await page.locator(route === '/analysis' ? '.analysis-tabs' : route === '/imports' ? '.upload-zone' : '.filters').waitFor();
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${route} at ${width}`);
   if (route === '/analysis') {
    assert.doesNotMatch(await page.locator('.analysis-history').innerText(), /Analisis #/);
    const combo = page.locator('.analysis-history [role=combobox]');
    await combo.click();
    await page.getByRole('option').first().click();
    await page.locator('.analysis-tabs').waitFor();
    await page.waitForTimeout(200);
    if (width === 1440) {
     await combo.click(); await page.getByRole('option').nth(1).click();
     await page.locator('.analysis-tabs').waitFor();
     assert.match(await combo.innerText(), /Analisis 2/);
     await combo.click(); await page.getByRole('option').first().click();
     await page.locator('.analysis-tabs').waitFor();
    }
   }
   await page.screenshot({path:`${out}/${route.slice(1)}-${width}.png`,fullPage:true});
  }
 }
 checks.push('Analysis/imports/activities responsive at 320,390,768,1440,1920');
 await page.getByRole('button', {name:/Keluar/}).click();
 await page.getByRole('button',{name:'Yakin',exact:true}).click();
 await page.getByRole('heading',{name:'Berhasil keluar'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'OK',exact:true}).count(),0);
 await page.getByRole('button',{name:'Masuk',exact:true}).waitFor();
 checks.push('Logout success has no OK and returns automatically');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({checks,errors},null,2));
} finally { await browser.close(); }

import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {chromium}=createRequire(path.join(tmpdir(),'ftemation-ui-review/package.json'))('playwright');
const env=await readFile('.env','utf8');
const setting=key=>env.match(new RegExp(`^${key}=(.*)$`,'m'))?.[1].trim().replace(/^(["'])(.*)\1$/,'$2');
const out='storage/app/private/ui-review/login-motion';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checks=[];
try {
 for (const reducedMotion of ['no-preference','reduce']) {
  const context=await browser.newContext({reducedMotion,viewport:{width:390,height:844}});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000');
  await page.getByLabel('Username',{exact:true}).fill(setting('DEMO_USERNAME'));
  await page.getByLabel('Password',{exact:true}).fill('deliberately-wrong');
  await page.getByRole('button',{name:'Masuk',exact:true}).click();
  const dialog=page.locator('.session-dialog');
  await page.getByRole('heading',{name:'Gagal masuk'}).waitFor();
  assert.equal(await dialog.evaluate(el=>getComputedStyle(el).animationName),reducedMotion==='reduce'?'none':'dialog-enter');
  await page.getByRole('button',{name:'Tutup',exact:true}).click();
  await page.locator('.session-dialog[data-closing=true]').waitFor();
  await dialog.waitFor({state:'detached'});
  await page.getByLabel('Password',{exact:true}).fill(setting('DEMO_PASSWORD'));
  await page.getByRole('button',{name:'Masuk',exact:true}).click();
  await page.getByRole('heading',{name:'Berhasil masuk'}).waitFor();
  assert.equal(await dialog.getAttribute('data-closing'),'false');
  await page.evaluate(() => {
   window.sessionExit = null;
   const el = document.querySelector('.session-dialog');
   const observer = new MutationObserver(() => {
    if (el.dataset.closing === 'true') {
     window.sessionExit = {open:el.open,animation:getComputedStyle(el).animationName};
     observer.disconnect();
    }
   });
   observer.observe(el,{attributes:true,attributeFilter:['data-closing']});
  });
  await page.waitForTimeout(reducedMotion==='reduce'?50:600);
  await page.screenshot({path:`${out}/success-${reducedMotion}.png`});
  await page.locator('.workspace').waitFor({state:'attached',timeout:10000});
  const exit = await page.evaluate(()=>window.sessionExit);
  assert.equal(exit?.open,true);
  assert.equal(exit?.animation,reducedMotion==='reduce'?'dialog-backdrop-exit':'dialog-exit');
  await dialog.waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  checks.push(`${reducedMotion}: entry, error exit, success exit before navigation, scroll restored`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({checks,errors},null,2));
} finally {await browser.close();}

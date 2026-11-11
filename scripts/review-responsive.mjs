// Review real pages across portrait, landscape, laptop, and wide viewports.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const {chromium}=createRequire(path.join(process.env.PLAYWRIGHT_REVIEW_ROOT??path.join(tmpdir(),'ftemation-ui-review'),'package.json'))('playwright');
const base=process.env.UI_BASE_URL??'http://localhost:8000';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const env=await readFile(path.join(root,'.env'),'utf8');
const setting=key=>process.env[key]??env.match(new RegExp(`^${key}=(.*)$`,'m'))?.[1].trim().replace(/^(["'])(.*)\1$/,'$2');
const output=path.join(root,'storage/app/private/ui-review/responsive');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[],errors=[];
let currentPage, currentName;
const responses=[];
try {
 const anonymous=await browser.newContext();
 const login=await anonymous.newPage();
 await login.goto(`${base}/`);
 await login.getByLabel('Username',{exact:true}).fill(setting('DEMO_USERNAME'));
 await login.getByLabel('Password',{exact:true}).fill(setting('DEMO_PASSWORD'));
 await login.getByRole('button',{name:'Masuk',exact:true}).click();
 await login.locator('.department-chart').waitFor();
 const state=await anonymous.storageState();
 await anonymous.close();
 for(const [width,height] of [[320,480],[360,640],[390,844],[430,932],[768,1024],[844,390],[568,320],[1024,600],[1366,768],[1440,900],[1920,1080],[2560,1440]]) {
  const name=`${width}x${height}`;
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  currentPage=page; currentName=name;
  page.on('response',response=>{if(response.status()>=400) responses.push({viewport:name,path:new URL(response.url()).pathname,status:response.status()});});
  page.on('pageerror',error=>errors.push(`${name}: ${error.message}`));
  await page.goto(`${base}/`);
  await page.locator('.login-card').waitFor();
  assert.equal(await page.title(),'FTEMation');
  const geometry=await page.evaluate(()=>{
   const form=document.querySelector('.login-form');
   const identity=document.querySelector('.login-identity').getBoundingClientRect();
   const logo=document.querySelector('.login-brand').getBoundingClientRect();
   const button=document.querySelector('.login-submit').getBoundingClientRect();
   return {docOverflow:document.documentElement.scrollHeight>innerHeight+1||document.documentElement.scrollWidth>innerWidth+1,formOverflow:form.scrollHeight>form.clientHeight+1,logoOffset:Math.abs(logo.x+logo.width/2-identity.x-identity.width/2),buttonBottom:button.bottom,buttonTop:button.top};
  });
  assert.equal(geometry.docOverflow,false,`${name}: login document overflow`);
  assert.equal(geometry.formOverflow,false,`${name}: login form must fit`);
  assert(geometry.logoOffset<1,`${name}: logo must be centered`);
  assert(geometry.buttonTop>=0&&geometry.buttonBottom<=height,`${name}: login button must be reachable`);
  for(const text of ['Akses demo','Gunakan akun dan password demo','Keputusan berisiko tinggi','Kelola dataset dan tinjau beban kerja organisasi.']) assert.equal(await page.getByText(text,{exact:false}).count(),0);
  await page.mouse.wheel(0,500);
  assert.equal(await page.evaluate(()=>scrollY),0);
  await page.screenshot({path:path.join(output,`${name}-login.png`)});
  checks.push(`${name}/login: fixed, centered logo, visible form, removed copy, title`);
  await context.addCookies(state.cookies);
  for(const [url,ready,label] of [['/','.department-chart','overview'],['/imports','.upload-zone','imports'],['/activities','tbody .activity-code','activities']]) {
   const response=await page.goto(`${base}${url}`);
   assert.equal(response.status(),200);
   await page.locator(ready).first().waitFor();
   assert.equal(await page.title(),'FTEMation');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${name}/${label}: horizontal overflow`);
   assert.equal(await page.locator('.sidebar-logout > span').count(),0);
   assert.equal(await page.locator('.sidebar-logout').isVisible(),true);
   assert.equal(await page.locator('.header-actions > .primary').count(),label==='imports'?1:0);
   await page.screenshot({path:path.join(output,`${name}-${label}.png`)});
   checks.push(`${name}/${label}: responsive shell, header actions, no global horizontal overflow`);
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(path.join(output,'report.json'),JSON.stringify({checks,errors},null,2));
 console.log(JSON.stringify({checks:checks.length,runtimeErrors:errors.length,screenshots:output}));
}catch(error){
 if(currentPage&&!currentPage.isClosed()) await currentPage.screenshot({path:path.join(output,`${currentName}-failure.png`)});
 await writeFile(path.join(output,'failure.json'),JSON.stringify({viewport:currentName,message:error.message,responses},null,2));
 throw error;
}finally{await browser.close();}

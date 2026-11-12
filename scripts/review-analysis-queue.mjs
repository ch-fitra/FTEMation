import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = createRequire(path.join(tmpdir(), 'ftemation-ui-review/package.json'))('playwright');
const output = 'storage/framework/testing/analysis-queue';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], errors = [], mutations = [];
const calc = {annual_capacity_minutes:115200,annual_factors:{daily:240,weekly:48,monthly:12},saving_rates:{high:.6,medium:.3,low:.1}};
const activities = [1,2,3].map((n) => ({activity_id:`ACT-${n}`,activity_name:`Peluang sintetis ${n}`,employee_name:'Karyawan Contoh',department:'Operasional',automation_level:'medium',group_name:'Klasifikasi',group_id:'classification',fte:.5,estimated_fte_saving:.15,priority_score:100-n,reason:'Proses terstruktur memerlukan review.',recommendation:'Bantu klasifikasi dan tinjau pengecualian.',factors:{repetitiveness:'high',rule_clarity:'medium',data_structure:'medium',human_judgment:'medium',operational_risk:'medium'},risk_level:'medium',effort_level:'low',oversight_required:true,oversight_note:'Manusia menyetujui hasil.'}));
const totals = {activities_count:60,employees_count:12,departments_count:3,total_fte:4.5,estimated_fte_saving:1.5,remaining_fte:3,levels:{high:20,medium:30,low:10},oversight_count:30,top_activities:[]};
const report = {calculation:calc,totals,activities,employees:[],departments:[],groups:[],priorities:activities.map(a=>a.activity_id),interpretation:'Estimasi kapasitas waktu dari data sintetis.'};
const summary = (id, completed=true, state='completed') => ({...totals,activities_count:id===1?60:90,total_fte:id===1?4.5:9,departments:[{department:'Operasional',total_fte:4.5,activities_count:60,employees_count:12}],calculation:calc,analysis_status:state,analysis_run_id:completed?id*10:null,estimated_fte_saving:completed?1.5:null,remaining_fte:completed?3:null,oversight_count:completed?30:null,top_opportunities:completed?activities:[],warnings:[]});
const dataset = { id:4, filename:'Dataset uji 120 aktivitas.xlsx',status:'imported',activities_count:120,employees_count:24,created_at:'2026-11-12T00:00:00Z',warnings:[] };
let mode = 'offline', failPoll = false;
const mockedRetries = [];
function currentRun() {
 const status = ['processing','stalled'].includes(mode) ? 'processing' : mode === 'failed' ? 'partial_failed' : 'queued';
 return {id:5,import_id:4,status,summary_status:'pending',model_name:'fake-only',actual_model:null,progress:{pending:120,success:status==='processing'?5:0,failed:mode==='failed'?5:0},total:120,requests_count:0,input_tokens:0,output_tokens:0,cache_hits:0,error_message:mode==='failed'?'Layanan AI sementara tidak tersedia.':null,can_retry:['stalled','failed'].includes(mode),failures:[],queue_health:{worker_status:mode==='offline'?'not_detected':'recently_seen',pending_jobs:['offline','delayed'].includes(mode)?2:0,reserved_jobs:mode==='processing'?1:0,delayed_jobs:mode==='delayed'?1:0,stalled:['offline','stalled'].includes(mode),waiting_seconds:900,can_recover:mode==='stalled'}};
}
try {
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror', error => errors.push(error.message));
 page.on('dialog', async dialog => { assert.match(dialog.message(), /saldo API/); await dialog.accept(); });
 await page.route('**/api/**', async route => {
  const request = route.request(), p = new URL(request.url()).pathname;
  if (request.method() !== 'GET') {
   if(p==='/api/analyses/5/retry') {mockedRetries.push(p);mode='processing';return route.fulfill({status:202,json:{run:{id:5,status:'queued'}}});}
   mutations.push(p);return route.abort();
  }
  let data;
  if(p==='/api/user') data={user:{id:1,name:'Reviewer',username:'reviewer'}};
  else if(p==='/api/imports') data={data:[dataset],last_page:1};
  else if(p==='/api/imports/4') data={import:dataset,summary:{...summary(4,false,currentRun().status),activities_count:120,employees_count:24,departments_count:6}};
  else if(p==='/api/imports/4/analyses') data=[{id:5,status:currentRun().status}];
  else if(p==='/api/analyses/5') {
   if(failPoll) {failPoll=false;return route.fulfill({status:503,json:{message:'Simulated status outage'}});}
   data=currentRun();
  } else if(p==='/api/imports/4/activities') data={data:[],total:0,last_page:1};
  else return route.fulfill({status:404,json:{message:'Unknown fixture'}});
  return route.fulfill({json:data});
 });
 for (const width of [1440,390,320]) {
  await page.setViewportSize({width,height:1000});
  mode='offline';
  await page.goto('http://localhost:8000/analysis?dataset=4&run=5');
  await page.getByRole('button',{name:'Menunggu antrean',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Menunggu antrean',exact:true}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'Analisis berjalan',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Coba kembali yang gagal',exact:true}).count(),0);
  assert.match(await page.locator('.analysis-queue-notice').innerText(),/10 menit/);
  assert.match(await page.locator('.analysis-queue-notice').innerText(),/Worker analisis belum terdeteksi/);
  assert.equal(await page.locator('.analysis-status .analysis-spinner').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:`${output}/offline-${width}.png`,fullPage:true});
  mode='delayed';await page.reload();
  await page.getByText('Antrean sedang menunggu jadwal berikutnya',{exact:true}).waitFor();
  checks.push(`${width}px: offline worker, delayed queue, truthful labels, retry hidden and no overflow`);
 }
 await page.setViewportSize({width:1440,height:1000});
 mode='offline';
 await page.goto('http://localhost:8000/?dataset=4');
 await page.getByText('Analisis masih dalam antrean dan belum mulai diproses.',{exact:false}).waitFor();
 checks.push('Overview also distinguishes queued from processing');
 mode='offline';await page.goto('http://localhost:8000/analysis?dataset=4&run=5');
 await page.locator('.analysis-queue-notice').waitFor();
 await page.locator('.sidebar nav').getByRole('link',{name:'Data aktivitas',exact:true}).click();
 await page.locator('.sidebar nav').getByRole('link',{name:'Analisis AI',exact:true}).click();
 await page.getByRole('button',{name:'Menunggu antrean',exact:true}).waitFor();
 await page.reload();await page.getByRole('button',{name:'Menunggu antrean',exact:true}).waitFor();
 assert.match(await page.locator('.analysis-status').innerText(),/ANALISIS 5/);
 checks.push('Navigation and refresh preserve run 5 without POST or new runs');
 failPoll=true;
 await page.getByText('Pembaruan status terputus.',{exact:false}).waitFor();
 mode='processing';
 await page.getByRole('button',{name:'Sedang diproses',exact:true}).waitFor({timeout:12000});
 assert.equal(await page.getByText('Pembaruan status terputus.',{exact:false}).count(),0);
 checks.push('Polling recovers automatically after a simulated 503');
 mode='stalled';await page.reload();
 await page.getByText('Progres belum diperbarui lebih dari 10 menit',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Pulihkan analisis',exact:true}).click();
 await page.getByRole('button',{name:'Sedang diproses',exact:true}).waitFor();
 assert.deepEqual(mockedRetries,['/api/analyses/5/retry']);
 assert.equal(new URL(page.url()).searchParams.get('run'),'5');
 checks.push('Explicitly confirmed recovery uses the same run; POST is mocked, never sent to Laravel');
 mode='failed';await page.reload();
 await page.getByRole('button',{name:'Coba kembali yang gagal',exact:true}).waitFor();
 await page.getByText('Detail kendala analisis',{exact:true}).click();
 assert.equal(await page.locator('.analysis-error').getAttribute('open'),'');
 assert.match(await page.locator('.analysis-error p').textContent(),/Layanan AI sementara tidak tersedia/);
 if (process.argv.includes('--live')) {
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  const live = await context.newPage();
  live.on('pageerror', error=>errors.push(error.message));
  await live.route('**/api/**', route=>{
   const req=route.request();
   if(req.method()!=='GET' && new URL(req.url()).pathname!=='/api/login') {mutations.push(new URL(req.url()).pathname);return route.abort();}
   return route.continue();
  });
  const env=await readFile('.env','utf8');
  const setting=key=>env.match(new RegExp(`^${key}=(.*)$`,'m'))?.[1].trim().replace(/^["']|["']$/g,'');
  await live.goto('http://localhost:8000');
  await live.getByLabel('Username',{exact:true}).fill(setting('DEMO_USERNAME'));
  await live.getByLabel('Password',{exact:true}).fill(setting('DEMO_PASSWORD'));
  const loginResponse=live.waitForResponse(response=>new URL(response.url()).pathname==='/api/login' && response.request().method()==='POST');
  await live.getByRole('button',{name:'Masuk',exact:true}).click();
  assert.equal((await loginResponse).status(),200,'Live login rejected; verify existing credentials without resetting the account');
  await live.locator('.workspace').waitFor().catch(async error=>{await live.screenshot({path:`${output}/live-login-check.png`});throw error;});
  await live.goto('http://localhost:8000/analysis?dataset=4&run=5');
  await live.getByRole('button',{name:'Menunggu antrean',exact:true}).waitFor();
  assert.match(await live.locator('.analysis-queue-notice').innerText(),/Worker analisis belum terdeteksi/);
  assert.equal(await live.getByRole('button',{name:'Pulihkan analisis',exact:true}).count(),0);
  for(const width of [1440,390]) {
   await live.setViewportSize({width,height:1000});
   assert.equal(await live.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await live.screenshot({path:`${output}/run-5-live-${width}.png`,fullPage:true});
  }
  await context.close();
  checks.push('Live Run 5: GET-only analysis page shows queued/worker warning and no retry on desktop/mobile; only login POST allowed');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);
 await writeFile(`${output}/checks.json`,JSON.stringify({checks,errors,mutations,mockedRetries},null,2));
 console.log(JSON.stringify({checks,errors,mutations,mockedRetries},null,2));
} finally {await browser.close();}

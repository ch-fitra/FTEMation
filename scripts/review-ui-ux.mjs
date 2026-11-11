import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = createRequire(path.join(tmpdir(), 'ftemation-ui-review/package.json'))('playwright');
const output = 'storage/framework/testing/ui-ux';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], errors = [], mutations = [];
const calc = {annual_capacity_minutes:115200,annual_factors:{daily:240,weekly:48,monthly:12},saving_rates:{high:.6,medium:.3,low:.1}};
const activities = [1,2,3].map((n) => ({activity_id:`ACT-${n}`,activity_name:`Peluang sintetis ${n}`,employee_name:'Karyawan Contoh',department:'Operasional',automation_level:'medium',group_name:'Klasifikasi',group_id:'classification',fte:.5,estimated_fte_saving:.15,priority_score:100-n,reason:'Proses terstruktur memerlukan review.',recommendation:'Bantu klasifikasi dan tinjau pengecualian.',factors:{repetitiveness:'high',rule_clarity:'medium',data_structure:'medium',human_judgment:'medium',operational_risk:'medium'},risk_level:'medium',effort_level:'low',oversight_required:true,oversight_note:'Manusia menyetujui hasil.'}));
const totals = {activities_count:60,employees_count:12,departments_count:3,total_fte:4.5,estimated_fte_saving:1.5,remaining_fte:3,levels:{high:20,medium:30,low:10},oversight_count:30,top_activities:[]};
const report = {calculation:calc,totals,activities,employees:[],departments:[],groups:[],priorities:activities.map(a=>a.activity_id),interpretation:'Estimasi kapasitas waktu dari data sintetis.'};
const summary = (id, completed=true, state='completed') => ({...totals,activities_count:id===1?60:90,total_fte:id===1?4.5:9,departments:[{department:'Operasional',total_fte:4.5,activities_count:60,employees_count:12}],calculation:calc,analysis_status:state,analysis_run_id:completed?id*10:null,estimated_fte_saving:completed?1.5:null,remaining_fte:completed?3:null,oversight_count:completed?30:null,top_opportunities:completed?activities:[],warnings:[]});
let mode='completed', slow=false, releases=[];
const imports=[1,2].map(id=>({id,filename:`Dataset ${id===1?60:90}.xlsx`,status:'imported',activities_count:id===1?60:90,created_at:'2026-11-11T00:00:00Z',warnings:[]}));
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const req=route.request(), url=new URL(req.url()), p=url.pathname;
  if(req.method()!=='GET'){mutations.push(p);return route.abort();}
  let data;
  if(p==='/api/user') data={user:{id:1,name:'Reviewer',username:'reviewer'}};
  else if(p==='/api/imports') data={data:mode==='empty'?[]:imports,last_page:1};
  else if(/^\/api\/imports\/\d+$/.test(p)) {
   const id=Number(p.split('/').at(-1));
   if(slow && id===1) await new Promise(resolve=>releases.push(resolve));
   data={import:imports[id-1],summary:summary(id,!['baseline','processing','failed'].includes(mode),mode==='processing'?'processing':mode==='failed'?'failed':'completed')};
  } else if(p.endsWith('/analyses')) data=mode==='baseline'?[]:[{id:Number(p.split('/')[3])*10,status:mode==='processing'?'processing':mode==='failed'?'failed':'completed'}, ...(mode==='completed'?[{id:Number(p.split('/')[3])*10-1,status:'completed'}]:[])];
  else if(/^\/api\/analyses\/\d+$/.test(p)) data={import_id:Number(p.split("/").at(-1))>=20?2:1,id:Number(p.split('/').at(-1)),status:mode==='processing'?'processing':mode==='failed'?'failed':'completed',summary_status:'completed',model_name:'fake-provider',actual_model:'fake-provider',progress:{success:mode==='processing'?20:60},total:60,requests_count:0,input_tokens:0,output_tokens:0,cache_hits:0,error_message:mode==='failed'?'Layanan sementara tidak tersedia.':null,can_retry:mode==='failed',failures:[],...(!['processing','failed'].includes(mode)?{report}: {})};
  else if(p.endsWith('/activities')) data={data:[{id:1,activity_code:'ACT-1',activity_name:'Aktivitas sintetis',description:'Deskripsi aktivitas',frequency:'daily',volume:1,duration_minutes:30,fte:.0625,employee:{name:'Contoh',employee_code:'EMP-1',department:'Operasional'}}],total:1,last_page:1};
  else return route.fulfill({status:404,json:{message:'Fixture not found'}});
  await route.fulfill({json:data});
 });
 await page.goto('http://localhost:8000');
 await page.getByRole('heading',{name:'Peluang otomatisasi terbaik',exact:true}).waitFor();
 assert.equal(await page.locator('.opportunity-grid article').count(),3); checks.push('Completed dashboard: snapshot KPIs and three backend-ranked opportunities');
 await page.getByRole('link',{name:'Lihat Detail Analisis →'}).first().click();
 await page.locator('dialog[open]').waitFor();
 assert.match(await page.locator('dialog').innerText(),/Proses terstruktur/);
 assert.match(page.url(),/dataset=1&run=10&activity=ACT-1/);
 assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Tutup detail');
 await page.screenshot({path:`${output}/detail-desktop.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('dialog').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
 await page.screenshot({path:`${output}/detail-mobile.png`,fullPage:true});
 await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});
 page.once('dialog', d=>d.dismiss());
 await page.getByRole('button',{name:'Analisis Ulang',exact:true}).click();
 checks.push('Reanalysis confirmation cancel: no API mutation or inference');
 await page.goto('http://localhost:8000/imports');
 await page.locator('input[type=file]').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});
 await page.getByRole('alert').filter({hasText:'Pilih satu file .xlsx'}).waitFor();
 await page.screenshot({path:`${output}/import-invalid.png`,fullPage:true});
 checks.push('Invalid file: accessible error feedback without submission');
 checks.push('Spotlight direct link, activity reason/factors/recommendation, modal focus and Escape');
 await page.goto('http://localhost:8000/analysis?dataset=1&run=9');
 await page.locator('.analysis-tabs').waitFor();
 await page.getByRole('button',{name:'Analisis Ulang',exact:true}).waitFor();
 assert.match(await page.locator('.analysis-technical').innerText(),/run #9/);
 await page.locator('.analysis-history-disclosure > summary').click();
 await page.locator('.analysis-history [role=combobox]').click();
 await page.locator('.select-popup.is-open').getByRole('option').first().click();
 await page.locator('.analysis-technical > summary').filter({hasText:'run #10'}).waitFor();
 checks.push('Historical completed run direct link and multi-run history selection without new inference');
 await page.goto('http://localhost:8000/analysis?dataset=1&run=20');
 await page.getByRole('alert').filter({hasText:'bukan bagian dari dataset aktif'}).waitFor();
 assert.equal(await page.locator('.analysis-results').count(),0);
 checks.push('Cross-dataset run link rejected without showing mismatched results');

 for(const width of [320,390,768,1024,1440,1920]) {
  await page.setViewportSize({width,height:1000});
  for(const route of ['/','/imports','/activities','/analysis']) {
   await page.goto(`http://localhost:8000${route}`);await page.locator('.dataset-context').getByText(/60 aktivitas/).waitFor();
   if(route==='/analysis')await page.locator('.analysis-tabs').waitFor();
   if(route==='/activities')await page.locator('tbody tr').waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${route} overflow at ${width}`);
   await page.screenshot({path:`${output}/${route.replace('/','')||'overview'}-${width}.png`,fullPage:true});
  }
  checks.push(`No page overflow and screenshots: overview/import/activities/analysis at ${width}px`);
 }
 await page.setViewportSize({width:1440,height:1000});
 slow=true;
 await page.goto('http://localhost:8000/');
 await page.waitForFunction(()=>document.querySelector('[aria-label="Dataset aktif"][role="combobox"]')!==null);
 await page.getByRole('combobox',{name:'Dataset aktif',exact:true}).click();
 await page.getByRole('option',{name:'Dataset 90.xlsx · #2'}).click();
 await page.locator('.dataset-context').getByText(/90 aktivitas/).waitFor();
 for(const release of releases)release();slow=false;
 await page.waitForLoadState('networkidle');
 assert.match(await page.locator('.dataset-context').innerText(),/90 aktivitas/);
 assert.match(page.url(),/dataset=2/);
 await page.getByRole('link',{name:'Data aktivitas',exact:true}).click();
 await page.locator('.dataset-context').getByText(/90 aktivitas/).waitFor();
 await page.reload();
 await page.locator('.dataset-context').getByText(/90 aktivitas/).waitFor();
 checks.push('Dataset race: delayed old response cannot overwrite new 90-activity context');
 for(const state of ['empty','baseline','processing','failed']) {
  mode=state;await page.goto('http://localhost:8000/');
  if(state==='empty')await page.getByRole('heading',{name:'Mulai analisis workload pertama Anda'}).waitFor();
  else if(state==='baseline') {await page.getByText('Dataset berhasil diimpor.',{exact:false}).waitFor();assert.equal(await page.locator('.spotlight').count(),0);}
  else {await page.goto('http://localhost:8000/analysis');await page.locator('.analysis-status').waitFor();assert.equal(await page.locator('.analysis-results').count(),0);if(state==='failed')await page.getByRole('button',{name:'Coba kembali yang gagal'}).waitFor();}
  await page.screenshot({path:`${output}/state-${state}.png`,fullPage:true}); checks.push(`Guided ${state} state without false final results`);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);
 await writeFile(`${output}/results.json`,JSON.stringify({checks,errors,mutations,fixture:'Synthetic API responses; no real inference or domain mutations'},null,2));
 console.log(JSON.stringify({passed:checks.length,checks,errors,mutations},null,2));
} finally {for(const release of releases)release();await browser.close();}

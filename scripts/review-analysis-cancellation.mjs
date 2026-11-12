import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = createRequire(path.join(tmpdir(), 'ftemation-ui-review/package.json'))('playwright');
const output = 'storage/framework/testing/analysis-cancellation';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], errors = [], mutations = [];
const calc = {annual_capacity_minutes:115200,annual_factors:{daily:240,weekly:48,monthly:12},saving_rates:{high:.6,medium:.3,low:.1}};
const activities = [1,2,3].map((n) => ({activity_id:`ACT-${n}`,activity_name:`Peluang sintetis ${n}`,employee_name:'Karyawan Contoh',department:'Operasional',automation_level:'medium',group_name:'Klasifikasi',group_id:'classification',fte:.5,estimated_fte_saving:.15,priority_score:100-n,reason:'Proses terstruktur memerlukan review.',recommendation:'Bantu klasifikasi dan tinjau pengecualian.',factors:{repetitiveness:'high',rule_clarity:'medium',data_structure:'medium',human_judgment:'medium',operational_risk:'medium'},risk_level:'medium',effort_level:'low',oversight_required:true,oversight_note:'Manusia menyetujui hasil.'}));
const totals = {activities_count:60,employees_count:12,departments_count:3,total_fte:4.5,estimated_fte_saving:1.5,remaining_fte:3,levels:{high:20,medium:30,low:10},oversight_count:30,top_activities:[]};
const report = {calculation:calc,totals,activities,employees:[],departments:[],groups:[],priorities:activities.map(a=>a.activity_id),interpretation:'Estimasi kapasitas waktu dari data sintetis.'};
const summary = (id, completed=true, state='completed') => ({...totals,activities_count:id===1?60:90,total_fte:id===1?4.5:9,departments:[{department:'Operasional',total_fte:4.5,activities_count:60,employees_count:12}],calculation:calc,analysis_status:state,analysis_run_id:completed?id*10:null,estimated_fte_saving:completed?1.5:null,remaining_fte:completed?3:null,oversight_count:completed?30:null,top_opportunities:completed?activities:[],warnings:[]});
// All lifecycle POSTs are browser fixtures. No request reaches a real queue/provider.
const dataset={id:4,filename:'Dataset contoh 120 aktivitas lintas departemen.xlsx',status:'imported',activities_count:120,employees_count:24,created_at:'2026-11-12T00:00:00Z',warnings:[]};
let state='processing', resumed=false, version=0, rejectResume=false;
const lifecycle=[];
function run() {return {id:5,import_id:4,status:state,model_name:'fake-provider',actual_model:'fake-provider',summary_status:'pending',progress:{success:5,pending:115},total:120,requests_count:1,input_tokens:10,output_tokens:20,cache_hits:0,can_retry:false,can_cancel:['queued','processing'].includes(state),can_resume:state==='cancelled',can_finalize_cancel:false,execution_version:version,resumed_at:resumed?'2026-11-12T05:00:00Z':null,failures:[],error_message:null,queue_health:{worker_status:'recently_seen',pending_jobs:state==='queued'?1:0,reserved_jobs:state==='processing'?1:0,delayed_jobs:0,stalled:false,waiting_seconds:0,can_recover:false},...(state==='completed'?{report}:{})};}
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('dialog',async dialog=>{errors.push('Unexpected native dialog');await dialog.dismiss();});
 await page.route('**/api/**',async route=>{
  const request=route.request(),p=new URL(request.url()).pathname;
  if(request.method()!=='GET') {
   if(['/api/analyses/5/cancel','/api/analyses/5/resume'].includes(p)) {
    const input=request.postDataJSON();assert.equal(input.execution_version,version);
    lifecycle.push({path:p,execution_version:version});
    if(p.endsWith('/cancel')) state=state==='queued'?'cancelled':'cancel_requested';
    else {
     assert.equal(state,'cancelled');
     if(rejectResume) {rejectResume=false;return route.fulfill({status:409,json:{message:'Analisis sudah diperbarui. Muat status terbaru.'}});}
     state='queued';resumed=true;version++;
    }
    return route.fulfill({status:202,json:{run:{id:5,status:state}}});
   }
   mutations.push(p);return route.abort();
  }
  let data;
  if(p==='/api/user')data={user:{id:1,name:'Reviewer',username:'reviewer'}};
  else if(p==='/api/imports')data={data:[dataset],last_page:1};
  else if(p==='/api/imports/4')data={import:dataset,summary:{...summary(4,false,state),activities_count:120,employees_count:24,departments_count:6}};
  else if(p==='/api/imports/4/analyses')data=[{id:5,status:state}];
  else if(p==='/api/analyses/5')data=run();
  else if(p==='/api/imports/4/activities')data={data:[],total:0,last_page:1};
  else return route.fulfill({status:404,json:{message:'Unknown fixture'}});
  return route.fulfill({json:data});
 });
 const confirm=page.getByRole('dialog',{name:'Batalkan analisis ini?',exact:true});
 for(const width of [1440,390,320]) {
  state='processing';resumed=false;version=0;
  await page.setViewportSize({width,height:1000});
  await page.goto('http://localhost:8000/analysis?dataset=4&run=5');
  await page.getByRole('button',{name:'Batalkan Analisis',exact:true}).click();
  await confirm.waitFor();
  assert.equal(await confirm.getByRole('button',{name:'Tetap lanjutkan',exact:true}).evaluate(el=>el===document.activeElement),true);
  assert.match(await confirm.innerText(),/Hasil aktivitas yang sudah selesai tetap tersimpan/);
  assert.match(await confirm.innerText(),/mungkin tetap dikenakan biaya/);
  assert.equal(await confirm.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
  await page.screenshot({path:`${output}/cancel-dialog-${width}.png`});
  const before=lifecycle.length;
  await page.keyboard.press('Escape');
  await confirm.waitFor({state:'hidden'});
  assert.equal(lifecycle.length,before);
  assert.equal(await page.getByRole('button',{name:'Batalkan Analisis',exact:true}).evaluate(el=>el===document.activeElement),true);
  await page.getByRole('button',{name:'Batalkan Analisis',exact:true}).click();
  await confirm.getByRole('button',{name:'Ya, batalkan analisis',exact:true}).click();
  await page.getByRole('button',{name:'Menunggu pembatalan',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Batalkan Analisis',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Lanjutkan Analisis',exact:true}).count(),0);
  await page.reload();
  await page.getByRole('button',{name:'Menunggu pembatalan',exact:true}).waitFor();
  state='cancelled';
  await page.getByRole('button',{name:'Lanjutkan Analisis',exact:true}).waitFor({timeout:10000});
  assert.match(await page.locator('.analysis-status').innerText(),/5 dari 120 aktivitas/);
  assert.match(await page.locator('.analysis-metadata').innerText(),/Token 30/);
  await page.screenshot({path:`${output}/cancelled-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Lanjutkan Analisis',exact:true}).click();
  const resume=page.getByRole('dialog',{name:'Lanjutkan analisis ini?',exact:true});
  await resume.waitFor();
  assert.match(await resume.innerText(),/pengaturan asli/);
  assert.match(await resume.innerText(),/menggunakan saldo API/);
  await page.screenshot({path:`${output}/resume-dialog-${width}.png`});
  if(width===1440) {
   rejectResume=true;
   await resume.getByRole('button',{name:'Ya, lanjutkan analisis',exact:true}).click();
   await resume.getByRole('alert').waitFor();
   assert.match(await resume.innerText(),/Analisis sudah diperbarui/);
   assert.equal(await resume.getByRole('button',{name:'Ya, lanjutkan analisis',exact:true}).isEnabled(),true);
  }
  await resume.getByRole('button',{name:'Ya, lanjutkan analisis',exact:true}).click();
  await page.getByRole('button',{name:'Dilanjutkan - menunggu antrean',exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('run'),'5');
  await page.reload();
  await page.getByRole('button',{name:'Dilanjutkan - menunggu antrean',exact:true}).waitFor();
  assert.match(await page.locator('.analysis-status').innerText(),/5 dari 120 aktivitas/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  checks.push(`${width}px: cancel confirmation, Escape/focus, awaiting cancellation, cancelled, partial progress/tokens preserved, explicit paid resume, versioned same-run request, refresh and overflow`);
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.sidebar nav').getByRole('link',{name:'Data aktivitas',exact:true}).click();
 await page.locator('.sidebar nav').getByRole('link',{name:'Analisis AI',exact:true}).click();
 await page.getByRole('button',{name:'Dilanjutkan - menunggu antrean',exact:true}).waitFor();
 // A queued cancel is acknowledged immediately and never starts a simulated AI request.
 await page.getByRole('button',{name:'Batalkan Analisis',exact:true}).click();
 await confirm.getByRole('button',{name:'Ya, batalkan analisis',exact:true}).click();
 await page.getByRole('button',{name:'Lanjutkan Analisis',exact:true}).waitFor();
 state='completed';await page.reload();
 await page.getByRole('heading',{name:'Analisis selesai',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Batalkan Analisis',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Lanjutkan Analisis',exact:true}).count(),0);
 checks.push('Queued cancellation is immediate; navigation preserves selection; completed run has no cancel/resume actions; server conflict stays inside dialog');
 assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);
 await writeFile(`${output}/checks.json`,JSON.stringify({checks,errors,mutations,mockedLifecycleRequests:lifecycle},null,2));
 console.log(JSON.stringify({checks,errors,mutations,mockedLifecycleRequests:lifecycle.length},null,2));
}finally{await browser.close();}

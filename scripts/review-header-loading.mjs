import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
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
 for (const width of [320,375,390,430,768]) {
 const page=await browser.newPage({viewport:{width,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const req=route.request(), url=new URL(req.url()), p=url.pathname;
  if(req.method()!=='GET'){mutations.push(p);return route.abort();}
  await new Promise(resolve => setTimeout(resolve, 100));
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


 const snapshot=()=>page.locator('.topbar').evaluate(el=>{
  const rect=node=>{const r=node.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(n=>Math.round(n*10)/10)};
  return {bottom: document.querySelector('.mobile-bottom-nav') ? rect(document.querySelector('.mobile-bottom-nav')) : null, header:rect(el),title:rect(el.querySelector('h1')),actions:rect(el.querySelector('.header-actions')),dataset:el.querySelector('.header-dataset')?rect(el.querySelector('.header-dataset')):null};
 });
 for(const pathname of ['/','/imports','/analysis','/results','/activities','/help']) {
  for(const kind of ['open','refresh','navigate']) {
   if(kind==='open') await page.goto(`http://localhost:8000${pathname}?dataset=1`);
   if(kind==='refresh') await page.reload();
   if(kind==='navigate') {
    await page.getByRole('link',{name:pathname==='/imports'?'Overview':'Import dataset',exact:true}).click();
    await page.waitForTimeout(50);
    const names={'/':'Overview','/imports':'Import dataset','/analysis':'Analisis AI','/results':'Hasil analisis','/activities':'Data aktivitas','/help':'Pusat Bantuan'};
    if(pathname==='/help' && width<=650) await page.getByRole('button',{name:'Menu lainnya'}).click();
    await page.getByRole('link',{name:names[pathname],exact:true}).click();
   }
   await page.locator('.topbar').waitFor();
   const before=await snapshot();
   for(let frame=0;frame<20;frame++) {
    await page.waitForTimeout(50);
    assert.deepEqual(await snapshot(),before,`${width} ${pathname} ${kind}: header shifted at sample ${frame}`);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width} ${pathname} overflow`);
  }
  checks.push(`${width}px ${pathname}: open, refresh, navigation stable`);
  await page.screenshot({path:`${output}/header-${pathname.slice(1)||"overview"}-${width}.png`});
 }
 await page.screenshot({path:`${output}/header-${width}.png`});
 await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);
 console.log(JSON.stringify({checks,errors,mutations},null,2));
} finally {await browser.close();}

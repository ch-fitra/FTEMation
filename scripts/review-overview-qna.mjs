import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = createRequire(path.join(tmpdir(), 'ftemation-ui-review/package.json'))('playwright');
const output = 'storage/framework/testing/overview-qna';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], errors = [], mutations = [];
const calc = {annual_capacity_minutes:115200,annual_factors:{daily:240,weekly:48,monthly:12},saving_rates:{high:.6,medium:.3,low:.1}};
const activities = [1,2,3].map((n) => ({activity_id:`ACT-${n}`,activity_name:`Peluang sintetis ${n}`,employee_name:'Karyawan Contoh',department:'Operasional',automation_level:'medium',group_name:'Klasifikasi',group_id:'classification',fte:.5,estimated_fte_saving:.15,priority_score:100-n,reason:'Proses terstruktur memerlukan review.',recommendation:'Bantu klasifikasi dan tinjau pengecualian.',factors:{repetitiveness:'high',rule_clarity:'medium',data_structure:'medium',human_judgment:'medium',operational_risk:'medium'},risk_level:'medium',effort_level:'low',oversight_required:true,oversight_note:'Manusia menyetujui hasil.'}));
const totals = {activities_count:60,employees_count:12,departments_count:3,total_fte:4.5,estimated_fte_saving:1.5,remaining_fte:3,levels:{high:20,medium:30,low:10},oversight_count:30,top_activities:[]};
const report = {calculation:calc,totals,activities,employees:[],departments:[],groups:[],priorities:activities.map(a=>a.activity_id),interpretation:'Estimasi kapasitas waktu dari data sintetis.'};
const summary = (id, completed=true, state='completed') => ({...totals,activities_count:id===1?60:90,total_fte:id===1?4.5:9,departments:[{department:'Operasional',total_fte:4.5,activities_count:60,employees_count:12}],calculation:calc,analysis_status:state,analysis_run_id:completed?id*10:null,estimated_fte_saving:completed?1.5:null,remaining_fte:completed?3:null,oversight_count:completed?30:null,top_opportunities:completed?activities.map((a,i)=>({...a,recommendation:missingRecommendation && i===1?'':a.recommendation})):[],warnings:[]});
let mode='completed', slow=false, releases=[]; let missingRecommendation=false;
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
 assert.equal(await page.getByText('TOP AUTOMATION OPPORTUNITY',{exact:true}).count(),0);
 assert.equal(await page.locator('.topbar a').count(),0);
 assert.equal(await page.locator('.opportunity-description').count(),3);
 const borders=await page.locator('.opportunity-grid article').evaluateAll(cards=>cards.map(c=>[getComputedStyle(c).borderTopWidth,getComputedStyle(c).borderTopColor].join('|')));
 assert.equal(new Set(borders).size,1);
 const buttonBottoms=await page.locator('.opportunity-grid article > a').evaluateAll(links=>links.map(l=>l.getBoundingClientRect().bottom));
 assert.ok(Math.max(...buttonBottoms)-Math.min(...buttonBottoms)<2);
 assert.equal(await page.getByText('Bagaimana FTE dihitung?',{exact:true}).count(),0);
 const fte=await page.locator('.department-label span').allTextContents();
 const period=page.getByRole('combobox',{name:'Periode jam kerja',exact:true});
 for(const [label,value] of [['Tahunan',8640],['Average Bulanan',720],['Average Mingguan',180],['Average Harian',36]]){
   await period.click(); await page.getByRole('option',{name:label,exact:true}).click();
   const text=await page.locator('.department-hours').first().innerText();
   const actual=Number(text.replace(/^Average /,'').split(' jam')[0].replaceAll('.','').replace(',','.'));
   assert.equal(actual,value,label);
   assert.deepEqual(await page.locator('.department-label span').allTextContents(),fte);
 }
 await page.getByRole('heading',{name:'FTE per departemen',exact:true}).click();
 await page.getByRole('listbox').waitFor({state:'hidden'});
 for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:1000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.screenshot({path:`${output}/overview-${width}.png`,fullPage:true});
 }
 await page.locator('.sidebar nav').getByRole('link',{name:'Pusat Bantuan',exact:true}).click();
 await page.getByRole('heading',{name:'Pusat Bantuan',exact:true}).waitFor();
 assert.equal(await page.getByRole('combobox',{name:'Dataset aktif',exact:true}).count(),0);
 assert.equal(await page.locator('.help-intro').count(),0);
 assert.equal(await page.locator('.help-question button[aria-expanded=false]').count(),8);
 assert.equal(await page.locator('.help-answer[inert]').count(),8);
 await page.getByRole('button',{name:'Bagaimana FTE dihitung?',exact:true}).click();
 assert.match(await page.locator('.help-page').innerText(),/115.200/);
 assert.match(await page.locator('.help-page').innerText(),/snapshot completed run #10/);
 assert.equal(await page.getByText('Bagaimana cara membaca hasil analisis?',{exact:true}).count(),1);
 assert.equal(await page.locator('.help-item').count(),8);
 const firstQuestion=page.getByRole('button',{name:'Bagaimana FTE dihitung?',exact:true});
 await firstQuestion.focus(); await page.keyboard.press('Enter');
 assert.equal(await firstQuestion.getAttribute('aria-expanded'),'false');
 await page.keyboard.press('Space');
 assert.equal(await firstQuestion.getAttribute('aria-expanded'),'true');
 await firstQuestion.click();
 for (const width of [1440,768,390,320]) {
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:`${output}/help-closed-${width}.png`,fullPage:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await firstQuestion.click();
 assert.equal(await page.locator('.help-answer').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 await page.screenshot({path:`${output}/help-expanded.png`,fullPage:true});
 await firstQuestion.click();
 await page.emulateMedia({reducedMotion:'no-preference'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.screenshot({path:`${output}/help-mobile.png`,fullPage:true});
 await page.reload(); await page.locator('.help-page').waitFor();
 assert.equal(await page.locator('.help-question button[aria-expanded=false]').count(),8);
 missingRecommendation=true;
 await page.goto('http://localhost:8000'); await page.locator('.opportunity-grid article').first().waitFor();
 assert.equal(await page.locator('.opportunity-description').count(),0);
 mode='empty';
 await page.goto('http://localhost:8000/help'); await page.locator('.help-page').waitFor();
 await page.getByRole('button',{name:'Bagaimana FTE dihitung?',exact:true}).click();
 assert.match(await page.locator('.help-page').innerText(),/Pilih atau impor dataset/);
 assert.deepEqual(errors,[]); assert.deepEqual(mutations,[]);
 console.log('PASS: uniform cards and aligned actions; all-or-none descriptions; one heading; removed header action; all four period conversions with unchanged FTE; Q&A with and without dataset, direct refresh; four responsive widths. No API mutations.');
} finally { await browser.close(); }

import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = createRequire(path.join(tmpdir(), 'ftemation-ui-review/package.json'))('playwright');
const output = `storage/framework/testing/responsive${process.argv.includes('--stress')?'-stress':''}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], errors = [], mutations = [];
const calc = {annual_capacity_minutes:115200,annual_factors:{daily:240,weekly:48,monthly:12},saving_rates:{high:.6,medium:.3,low:.1}};
const activities = [1,2,3].map((n) => ({activity_id:`ACT-${n}`,activity_name:`Peluang sintetis ${n}`,employee_name:'Karyawan Contoh',department:'Operasional',automation_level:'medium',group_name:'Klasifikasi',group_id:'classification',fte:.5,estimated_fte_saving:.15,priority_score:100-n,reason:'Proses terstruktur memerlukan review.',recommendation:'Bantu klasifikasi dan tinjau pengecualian.',factors:{repetitiveness:'high',rule_clarity:'medium',data_structure:'medium',human_judgment:'medium',operational_risk:'medium'},risk_level:'medium',effort_level:'low',oversight_required:true,oversight_note:'Manusia menyetujui hasil.'}));
const totals = {activities_count:60,employees_count:12,departments_count:3,total_fte:4.5,estimated_fte_saving:1.5,remaining_fte:3,levels:{high:20,medium:30,low:10},oversight_count:30,top_activities:[]};
const report = {calculation:calc,totals,activities,employees:[],departments:[],groups:[],priorities:activities.map(a=>a.activity_id),interpretation:'Estimasi kapasitas waktu dari data sintetis.'};
const summary = (id, completed=true, state='completed') => ({...totals,activities_count:id===1?60:90,total_fte:id===1?4.5:9,departments:[{department:'Operasional',total_fte:4.5,activities_count:60,employees_count:12}],calculation:calc,analysis_status:state,analysis_run_id:completed?id*10:null,estimated_fte_saving:completed?1.5:null,remaining_fte:completed?3:null,oversight_count:completed?30:null,top_opportunities:completed?activities:[],warnings:[]});
let mode='completed', slow=false, releases=[];
const stress = process.argv.includes('--stress');
const imports=[1,2].map(id=>({id,filename:`Dataset ${id===1?60:90}.xlsx`,status:'imported',activities_count:id===1?60:90,created_at:'2026-11-11T00:00:00Z',warnings:[]}));



if(stress) {
 imports[0].filename='FTEMation_Workload_Operasional_Pengelolaan_Dokumen_dan_Pelaporan_Tahunan_2026.xlsx';
 for(const activity of activities) {activity.activity_name='Pemeriksaan kelengkapan dokumen dan rekonsiliasi laporan operasional lintas departemen untuk persetujuan penanggung jawab';activity.department='Operasional dan Pengelolaan Dokumen Administrasi Perusahaan';activity.employee_name='Karyawan Contoh dengan Nama Panjang';}
}
report.groups=[{...totals,group_id:'classification',name:'Klasifikasi dan pengelolaan dokumen lintas departemen',departments:['Operasional','Keuangan'],members:activities.map(a=>a.activity_id)}];
const entity={...totals,department:activities[0].department,summary:'Ringkasan sintetis untuk pemeriksaan tata letak, bukan hasil inference.',opportunities:'Tinjau proses berulang dan pengecualian bersama pemilik proses.',oversight_note:'Keputusan final tetap di tangan manusia.',top_activities:activities};
report.employees=[{...entity,employee_id:'EMP-1',employee_name:activities[0].employee_name}];report.departments=[entity];

const findings=[];
const heights={320:844,375:812,390:844,430:932,768:1024,1024:768,1366:768,1920:1080,2560:1440};
try {
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 let signedIn=true;
 await page.route('**/api/**',async route=>{
  const req=route.request(), url=new URL(req.url()), p=url.pathname;
  if(req.method()!=='GET'){mutations.push(p);return route.abort();}
  await new Promise(resolve => setTimeout(resolve, 100));
  let data;
  if(p==='/api/user') {if(!signedIn) return route.fulfill({status:401,json:{message:'Unauthenticated.'}}); data={user:{id:1,name:'Reviewer',username:'reviewer'}};}
  else if(p==='/api/imports') data={data:mode==='empty'?[]:imports,last_page:2};
  else if(/^\/api\/imports\/\d+$/.test(p)) {
   const id=Number(p.split('/').at(-1));
   if(slow && id===1) await new Promise(resolve=>releases.push(resolve));
   data={import:imports[id-1],summary:summary(id,!['baseline','processing','failed'].includes(mode),mode==='processing'?'processing':mode==='failed'?'failed':'completed')};
  } else if(p.endsWith('/analyses')) data=mode==='baseline'?[]:[{id:Number(p.split('/')[3])*10,status:mode==='processing'?'processing':mode==='failed'?'failed':'completed'}, ...(mode==='completed'?[{id:Number(p.split('/')[3])*10-1,status:'completed'}]:[])];
  else if(/^\/api\/analyses\/\d+$/.test(p)) data={import_id:Number(p.split("/").at(-1))>=20?2:1,id:Number(p.split('/').at(-1)),status:mode==='processing'?'processing':mode==='failed'?'failed':'completed',summary_status:'completed',model_name:'fake-provider',actual_model:'fake-provider',progress:{success:mode==='processing'?20:60},total:60,requests_count:0,input_tokens:0,output_tokens:0,cache_hits:0,error_message:mode==='failed'?'Layanan sementara tidak tersedia.':null,can_retry:mode==='failed',failures:[],...(!['processing','failed'].includes(mode)?{report}: {})};
  else if(p.endsWith('/activities')) data={data:[{id:1,activity_code:'ACT-1',activity_name:'Aktivitas sintetis',description:'Deskripsi aktivitas',frequency:'daily',volume:1,duration_minutes:30,fte:.0625,employee:{name:'Contoh',employee_code:'EMP-1',department:'Operasional'}}],total:1,last_page:2};
  else return route.fulfill({status:404,json:{message:'Fixture not found'}});
  await route.fulfill({json:data});
 });



 for(const width of [320,375,390,430,768,1024,1366,1920,2560]) {
  console.log(`Review ${stress?"stress":"normal"}: ${width}px`);
  await page.setViewportSize({width,height:heights[width]});
  for(const pathname of ['/','/imports','/activities','/analysis','/results','/help','login']) {
   signedIn=pathname!=='login';
   await page.goto(`http://localhost:8000${signedIn?pathname:'/'}`);
   await page.locator(signedIn?'.topbar':'.login-card').waitFor();
   await page.waitForTimeout(700);
   await page.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));
   if(signedIn) {await page.getByRole("link",{name:"Lewati navigasi",exact:true}).focus();await page.keyboard.press("Enter");assert.equal(await page.evaluate(()=>document.activeElement.id),"workspace-content");await page.evaluate(()=>window.scrollTo(0,0));}
   const issues=await page.evaluate(()=>{
    const visible=el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden';
    return {overflow:document.documentElement.scrollWidth>innerWidth+1, outside:[...document.querySelectorAll('button,input,h1,h2,.metric-value strong,.panel-heading,.filters')].filter(visible).filter(el=>!el.closest('.table-scroll,.select-popup,.visually-hidden') && !el.matches('.visually-hidden')).filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth+1||r.left<0||el.scrollWidth>el.clientWidth+2}).map(el=>({tag:el.tagName,text:el.textContent.slice(0,90),width:el.clientWidth,scroll:el.scrollWidth}))};
   });
   findings.push({width,pathname,...issues});
   assert.equal(issues.overflow,false,`${width} ${pathname}: page overflow`);
   assert.deepEqual(issues.outside,[],`${width} ${pathname}: clipped content`);
   await page.screenshot({path:`${output}/${pathname.replace('/','')||'overview'}-${width}.png`,fullPage:true});

   if(signedIn && width<=650) {
    const nav=page.getByRole('navigation',{name:'Navigasi mobile'});
    assert.equal(await nav.getByRole('link').count(),5);
    assert.deepEqual(await nav.getByRole('link').allTextContents(),['Import dataset','Analisis AI','Overview','Hasil analisis','Data aktivitas']);
    const before=await nav.boundingBox();
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    assert.deepEqual(await nav.boundingBox(),before,'bottom navigation moved on scroll');
    const contentBottom=await page.locator('.content').evaluate(el=>el.lastElementChild?.getBoundingClientRect().bottom);
    assert.ok(contentBottom<=before.y,'last content hidden behind navigation');
    await page.evaluate(()=>window.scrollTo(0,0));
    const more=page.getByRole('button',{name:'Menu lainnya'});
    await more.click();await page.keyboard.press('Escape');
    assert.equal(await more.getAttribute('aria-expanded'),'false');
    assert.equal(await more.evaluate(el=>el===document.activeElement),true);
    await more.click();await page.locator('h1').click({position:{x:3,y:3}});
    assert.equal(await more.getAttribute('aria-expanded'),'false');
    await more.click();await page.screenshot({path:`${output}/mobile-more-${width}.png`});
    await page.getByRole('link',{name:'Pusat Bantuan',exact:true}).click();
    assert.equal(await more.getAttribute('aria-expanded'),'false');
    for(const target of ['/imports','/analysis','/','/results','/activities']) {
     const link=nav.locator(`a[href^="${target === '/' ? '/?' : target}"]`).first();
     await link.click();await page.waitForTimeout(180);
     assert.equal(await link.getAttribute('aria-current'),'page');
     assert.equal(new URL(page.url()).searchParams.get('dataset'),'1');
    }
    await page.reload();await nav.waitFor();assert.deepEqual(await nav.boundingBox(),before);
    await page.goto(`http://localhost:8000${pathname}?dataset=1`);await page.waitForTimeout(700);
   }
   if(pathname==='login') {
    await page.getByLabel('Username',{exact:true}).fill('reviewer');
    await page.getByLabel('Password',{exact:true}).fill('synthetic-password');
    await page.getByRole('button',{name:'Tampilkan password',exact:true}).click();
    assert.equal(await page.locator('#password').getAttribute('type'),'text');
    await page.getByRole('button',{name:'Sembunyikan password',exact:true}).click();
   }
   if(pathname==='/') {
    const select=page.getByRole('combobox',{name:'Periode jam kerja',exact:true});
    await select.scrollIntoViewIfNeeded();await select.focus();await page.waitForTimeout(120);await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    assert.match(await select.innerText(),/Bulanan/,`period keyboard at ${width}px`);
    const dataset=page.getByRole('combobox',{name:'Dataset aktif',exact:true});
    await dataset.scrollIntoViewIfNeeded();await page.waitForTimeout(150);await dataset.click();
    const rect=await page.locator('.select-popup.is-open').boundingBox();
    assert.ok(rect.x>=0 && rect.x+rect.width<=width && rect.y>=0 && rect.y+rect.height<=page.viewportSize().height,`dropdown outside ${width}`);
    await page.screenshot({path:`${output}/dropdown-${width}.png`});
    await page.keyboard.press('Escape');assert.equal(await dataset.getAttribute('aria-expanded'),'false');
   }
   if(pathname==='/imports') {
    await page.locator('input[type=file]').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});
    await page.getByRole('alert').filter({hasText:'Pilih satu file .xlsx'}).waitFor();
    await page.getByRole('button',{name:/Berikutnya/}).click();
    await page.waitForTimeout(200);
   }
   if(pathname==='/activities') {
    const select=page.getByRole('combobox',{name:'Frekuensi',exact:true});
    await select.focus();await page.keyboard.press('Enter');await page.keyboard.press('End');await page.keyboard.press('Enter');
    assert.match(await select.innerText(),/monthly/);
    const region=page.getByRole('region',{name:'Tabel aktivitas workload'});
    await region.focus();await page.keyboard.press('ArrowRight');
    await page.getByRole('button',{name:/Berikutnya/}).click();
   }
   if(pathname==='/results') {
    const tabs=page.getByRole('group',{name:'Tampilan hasil'});
    for(const name of ['Seluruh aktivitas','Kelompok aktivitas','Karyawan','Departemen','Prioritas']) {
     await tabs.getByRole('button',{name,exact:true}).click();
     assert.equal(await tabs.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
     await page.screenshot({path:`${output}/tab-${name.replaceAll(' ','-')}-${width}.png`,fullPage:true});
    }
    await page.getByRole('button',{name:/Lihat detail/}).first().click();
    const dialog=page.getByRole('dialog',{name:'Detail analisis aktivitas'});await dialog.waitFor();
    assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
    const r=await dialog.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width&&r.y>=0&&r.y+r.height<=page.viewportSize().height);
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Tutup detail');
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog')),true);
    await page.screenshot({path:`${output}/dialog-${width}.png`});
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   }
   if(pathname==='/help') {
    const question=page.locator('.help-question button').first();
    await question.focus();await page.keyboard.press('Enter');
    assert.equal(await question.getAttribute('aria-expanded'),'true');
    await page.screenshot({path:`${output}/help-expanded-${width}.png`,fullPage:true});
    await question.click();
    if(width<=650) await page.getByRole('button',{name:'Menu lainnya'}).click();
    await page.getByRole('button',{name:'Keluar',exact:true}).click();
    const session=page.getByRole('dialog');await session.waitFor();
    assert.equal(await session.evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
    await page.screenshot({path:`${output}/logout-${width}.png`});
    await page.keyboard.press('Escape');await session.waitFor({state:'hidden'});
   }
  }
 }
 for(const viewport of [{width:568,height:320},{width:844,height:390},{width:1366,height:768}]) {
  signedIn=false;await page.setViewportSize(viewport);await page.goto('http://localhost:8000/');await page.locator('.login-card').waitFor();
  for(const name of ['Username','Password']) {const input=page.getByLabel(name,{exact:true});await input.scrollIntoViewIfNeeded();await input.fill('synthetic');}
  await page.getByRole('button',{name:'Masuk',exact:true}).scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.login-form').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
  await page.screenshot({path:`${output}/login-landscape-${viewport.width}.png`});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);
 await writeFile(`${output}/audit.json`,JSON.stringify({findings,errors,mutations},null,2));
 console.log(JSON.stringify({pages:findings.length,findings:findings.filter(f=>f.overflow||f.outside.length),errors,mutations},null,2));
} finally {await browser.close();}


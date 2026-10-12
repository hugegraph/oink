const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const EVIDENCE = __dirname;
const executablePath = '/workspace/scratch/8c4592f1f41d/tooling/chrome-headless-shell-linux64/chrome-headless-shell';
const mime = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2'};
function server(root, port) {
  const app = http.createServer((req,res)=>{
    let file = path.join(root, decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if (file.endsWith('/')) file += 'index.html';
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {res.writeHead(404); res.end(); return;}
    res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve=>app.listen(port,'127.0.0.1',()=>resolve(app)));
}
async function geometry(page) {
  return page.evaluate(()=>{
    const panel=document.querySelector('.td-shell-toc__panel');
    const aside=panel.querySelector('[data-td-shell-aside]');
    const footer=document.querySelector('[data-td-shell-footer]');
    const tags=panel.querySelectorAll('[data-td-taxonomy="tags"] .td-shell-tag');
    const tag=tags[tags.length-1];
    const b=el=>{const r=el.getBoundingClientRect(); return {x:r.x,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const t=b(tag); const hit=document.elementFromPoint(t.x+t.width/2,t.top+t.height/2);
    return {viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},scrollY,docHeight:document.documentElement.scrollHeight,offset:getComputedStyle(document.documentElement).getPropertyValue('--td-shell-footer-offset'),panel:{...b(panel),position:getComputedStyle(panel).position,inset:getComputedStyle(panel).insetBlockEnd},footer:b(footer),aside:{...b(aside),scrollTop:aside.scrollTop,scrollHeight:aside.scrollHeight,clientHeight:aside.clientHeight},tag:{...t,text:tag.innerText,href:tag.getAttribute('href'),hit:hit===tag||tag.contains(hit)},groups:[...panel.querySelectorAll('[data-td-shell-tree-toggle]')].map(el=>({text:el.innerText,expanded:el.getAttribute('aria-expanded')}))};
  });
}
async function bottom(page) {
  await page.locator('main').focus();
  await page.keyboard.press('Control+End');
  await page.waitForFunction(()=>Math.abs(scrollY+innerHeight-document.documentElement.scrollHeight)<2);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
(async()=>{
  const phase=process.argv[2] || 'before';
  const port=phase==='before'?4523:4524;
  const app=await server(path.join(EVIDENCE,'native-'+phase),port);
  const browser=await chromium.launch({executablePath,args:['--no-sandbox'],headless:true});
  const metrics={phase,browser:await browser.version(),hugo:'0.165.0+extended',go:'1.27.0',theme:phase==='before'?'f8f476e660cf053a2645b7b923ae8d08d5448fce (v1.2.0)': 'fix/toc-footer-offset',cases:[]};
  try {
    for (const [name, route, mode] of [['fixed-light','/tests/rail-footer/fixed/','light'],['fixed-dark','/tests/rail-footer/fixed/','dark'],['no-sidebar','/tests/rail-footer/no-sidebar/','light'],['fixed-zh','/zh/tests/rail-footer/fixed/','light']]) {
      const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
      const page=await context.newPage();
      await page.addInitScript(mode=>{localStorage.clear();localStorage.setItem('td-color-theme',mode);localStorage.setItem('td-preset','slate');},mode);
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:'+port+route,{waitUntil:'networkidle'});
      await page.evaluate(()=>document.fonts.ready);
      await bottom(page);
      const initial=await geometry(page);
      await page.mouse.move(initial.aside.x+initial.aside.width/2,initial.aside.top+50);
      await page.mouse.wheel(0,1800);
      await page.waitForTimeout(250);
      const wheel=await geometry(page);
      await page.screenshot({path:path.join(EVIDENCE,`${phase}-${name}.png`)});
      const result={name,initial,wheel,errors};
      if(phase==='after') {
        assert.ok(wheel.panel.bottom<=wheel.footer.top,JSON.stringify(wheel));
        assert.ok(wheel.tag.hit,'last tag must receive a pointer hit');
        assert.ok(wheel.aside.scrollTop>0,'real wheel must scroll the right rail');
        await page.locator('.td-shell-toc__panel [data-td-taxonomy="tags"] .td-shell-tag').last().click();
        result.mouseDestination=new URL(page.url()).pathname;
        assert.equal(result.mouseDestination,wheel.tag.href);
        await page.goto('http://127.0.0.1:'+port+route,{waitUntil:'networkidle'});
        await bottom(page);
        await page.locator('.td-shell-toc__panel [data-td-shell-right-toggle]').focus();
        const last=page.locator('.td-shell-toc__panel [data-td-taxonomy="tags"] .td-shell-tag').last();
        for(let i=0;i<80 && !await last.evaluate(el=>el===document.activeElement);i++) await page.keyboard.press('Tab');
        result.keyboard=await geometry(page);
        assert.ok(await last.evaluate(el=>el===document.activeElement));
        assert.ok(result.keyboard.tag.hit);
        await page.keyboard.press('Enter');
        await page.waitForURL(new RegExp(wheel.tag.href+'$'));
        result.keyboardDestination=new URL(page.url()).pathname;
        assert.equal(result.keyboardDestination,wheel.tag.href);
      }
      metrics.cases.push(result);
      console.log(name,JSON.stringify({panelBottom:wheel.panel.bottom,footerTop:wheel.footer.top,tagTop:wheel.tag.top,tagBottom:wheel.tag.bottom,scrollTop:wheel.aside.scrollTop,scrollHeight:wheel.aside.scrollHeight,clientHeight:wheel.aside.clientHeight,hit:wheel.tag.hit,errors}));
      await context.close();
    }
    fs.writeFileSync(path.join(EVIDENCE,`metrics-${phase}.json`),JSON.stringify(metrics,null,2));
  } finally {await browser.close();app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

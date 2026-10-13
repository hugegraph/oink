"""Adversarial source-policy browser checks, not a Hugo/docsite build.

Reads the actual proposed SCSS screen/static blocks (CSS-compatible nesting).
The surrounding DOM, Arial font, box sizing and table styling are reduced
inputs. Browser integration and the canonical bilingual contracts remain in
the separate docsite companion. No external resources are requested.
"""
from pathlib import Path
import json
import os
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(os.environ.get('OINK_TABLE_SOURCE', ROOT / 'work/assets/scss/td/_content.scss'))
ORIGINAL = Path(os.environ.get('OINK_TABLE_BASELINE', ROOT / 'original/_content.scss'))
OUT = ROOT / 'results'
OUT.mkdir(exist_ok=True)

def block(text, marker):
    start = text.index('{', text.index(marker))
    depth = 1
    for end in range(start + 1, len(text)):
        depth += (text[end] == '{') - (text[end] == '}')
        if depth == 0:
            return text[start + 1:end]
    raise ValueError(f'Unclosed block: {marker}')

def policy(path):
    text = re.sub(r'/\*[\s\S]*?\*/|//[^\n]*', '', path.read_text())
    viewport = block(text, '.td-table-scroll {')
    screen = block(viewport, '@media screen')
    static = block(viewport, '&--static')
    return ('.td-content .td-table-scroll { @media screen {' + screen + '}}'
            + '.td-content .td-table-scroll--static {' + static + '}')

BASE = '''
* {box-sizing:border-box} body {margin:16px;font:16px/1.6 Arial}
.td-content {overflow-wrap:anywhere;max-width:100%;}
.td-content table {border-collapse:collapse;max-width:100%;}
th,td {padding:.6rem .75rem;border:1px solid;text-align:start;}
code {font: .875em monospace;word-wrap:break-word;}
.td-content .td-table-scroll {width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;}
.td-content .td-table-scroll > table {display:table;width:max-content;min-width:100%;margin-bottom:0;}
.td-content .td-table-scroll--static {max-width:none;overflow:visible;}
@media print {.td-content .td-table-scroll {max-width:none;overflow:visible;}}
'''
CURRENT = policy(ORIGINAL)
CANDIDATE = policy(SOURCE)

def wrap_table(rows, heads, wide=False, static=False, caption='', ident='target'):
    return ('<div class="td-table-scroll' + (' td-table-scroll--static' if static else '')
            + '"' + ('' if static else ' tabindex="0" role="region" aria-label="Table"')
            + '><table id="' + ident + '" class="' + ('td-table--wide' if wide else '') + '">'
            + (f'<caption>{caption}</caption>' if caption else '')
            + '<thead><tr>' + ''.join('<th>'+x+'</th>' for x in heads) + '</tr></thead><tbody>'
            + ''.join('<tr>'+''.join('<td>'+x+'</td>' for x in row)+'</tr>' for row in rows)
            + '</tbody></table></div>')

PD = [
 ['<code>HG_PD_GRPC_HOST</code>','Yes','None','<code>grpc.host</code>',
  'Advertised gRPC hostname/IP; use container hostnames within a container network.'],
 ['<code>HG_PD_INITIAL_STORE_COUNT</code>','No','<code>1</code>','<code>pd.initial-store-count</code>',
  'Minimum Store count needed for cluster availability.'],
 ['<code>HG_PD_ACTUATOR_EXPOSURE</code>','No','<code>health,metrics,prometheus</code>',
  '<code>management.endpoints.web.exposure.include</code>',
  'Public Actuator endpoint allowlist; * is forbidden.'],
]
ZH = [r.copy() for r in PD]
for row, text in zip(ZH, [
 '对外宣告的 gRPC 主机名或 IP 地址；容器网络内部应使用容器主机名。',
 '集群可用时所需的最少存储节点数量。',
 '对外开放的监控端点白名单，不允许使用通配符。']):
    row[-1] = text
HEADS = ['Variable','Required','Default','Configuration key','Description']
PROSE = [
 ['Alice handles planning and coordination','Tokyo release','Ready for review',
  'After final review and approval','A short explanation of the current delivery status.'],
 ['Bob handles design and delivery','Osaka patch','Waiting on tests',
  'Before the next release window','Another short explanation of the expected next step.'],
]
PROSE_HEADS = ['Owner','Project','State','When','Notes']
CONFIG = [
 ['rocksdb.data_path','<code>rocksdb-data/data</code>','RocksDB data storage path; must not be empty.'],
 ['rocksdb.data_disks','[]', 'Each entry selects STORE/TABLE: /path/disk for [g/vertex, g/edge_out, '
  'g/edge_in, g/vertex_label_index, g/edge_label_index, g/range_int_index, g/range_float_index, '
  'g/range_long_index, g/range_double_index, g/secondary_index, g/search_index, g/shard_index, '
  'g/unique_index, g/olap]. The disk must differ from rocksdb.data_path.'],
]
GEOMETRY = '''id => {
 const t=document.getElementById(id), row=t.tBodies[0].rows[0], wrapper=t.parentElement;
 const dims=[...row.cells].map(c=>{const r=document.createRange();r.selectNodeContents(c);
 return {width:c.getBoundingClientRect().width,lines:new Set([...r.getClientRects()].map(b=>Math.round(b.top))).size};});
 return {width:t.getBoundingClientRect().width,rowHeight:row.getBoundingClientRect().height,
 columns:dims,viewport:wrapper.clientWidth,scrollWidth:wrapper.scrollWidth,
 documentWidth:document.documentElement.scrollWidth,innerWidth,wrap:getComputedStyle(row.cells[0]).overflowWrap,
 max:getComputedStyle(row.cells[0]).maxWidth,font:getComputedStyle(row.cells[0]).fontSize};
}'''
checks = []
def record(name, passed, details=None):
    checks.append({'name':name,'passed':bool(passed),'details':details})
    if not passed:
        raise AssertionError((name, details))

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    def load(markup, css=CANDIDATE, width=772, direction='ltr'):
        page.emulate_media(media='screen')
        page.set_content(f'<html dir="{direction}"><style>{BASE}{css}</style>'
                         f'<main class="td-content" style="width:{width}px">{markup}</main></html>')
        return page.evaluate(GEOMETRY,'target')

    prose=wrap_table(PROSE,PROSE_HEADS)
    old=load(prose,CURRENT); new=load(prose)
    record('negative control: old PR creates avoidable prose scrolling', old['scrollWidth']>old['viewport']+100,old)
    record('ordinary prose fits without the wide marker', new['scrollWidth']<=new['viewport']+1,new)
    for lang,rows in [('en',PD),('zh',ZH)]:
        automatic=load(wrap_table(rows,HEADS))
        wide=load(wrap_table(rows,HEADS,wide=True))
        record(f'{lang}: auto-only is insufficient for PD (negative control)',automatic['columns'][-1]['width']<160,automatic)
        record(f'{lang}: explicit wide intent preserves the PD description',
               wide['columns'][-1]['width']>=280 and wide['rowHeight']<120,wide)

    for direction in ['ltr','rtl']:
      for viewport,width in [(1440,772),(1440,954),(768,700),(390,358)]:
        page.set_viewport_size({'width':viewport,'height':1000})
        for name,rows,heads,wide in [
          ('prose-5',PROSE,PROSE_HEADS,False),
          ('prose-3',[r[:3] for r in PROSE],PROSE_HEADS[:3],False),
          ('short',[['Japan','Tokyo','9'],['Japan','Osaka','8']],['Country','City','Count'],False),
          ('config',CONFIG,['config option','default value','description'],True),
          ('config-auto',CONFIG,['config option','default value','description'],False),
          ('pd-en',PD,HEADS,True),('pd-zh',ZH,HEADS,True),
        ]:
          metrics=load(wrap_table(rows,heads,wide=wide),width=width,direction=direction)
          good=metrics['documentWidth']<=viewport+1
          if not wide and name!='config-auto' and viewport>=768:
            good &= metrics['scrollWidth']<=metrics['viewport']+1
          if name.startswith('config'):
            good &= metrics['columns'][0]['width']>150 and metrics['columns'][0]['lines']==1
          if name.startswith('pd-'):
            good &= metrics['columns'][-1]['width']>=280 and metrics['rowHeight']<120
          record(f'{direction}/{viewport}/{width}/{name}',good,metrics)

    page.set_viewport_size({'width':1440,'height':1000})
    for width in [772,954,640,772]:
        if width==772:
            load(wrap_table(PROSE,PROSE_HEADS))
        page.locator('main').evaluate('(e,w)=>e.style.width=w+"px"',width)
        m=page.evaluate(GEOMETRY,'target')
        record(f'ordinary prose after container resize to {width}',m['scrollWidth']<=m['viewport']+1,m)
    for direction,key in [('ltr','ArrowRight'),('rtl','ArrowLeft')]:
        load(wrap_table(PD,HEADS,wide=True),width=358,direction=direction)
        wrapper=page.locator('#target').locator('..')
        wrapper.focus();wrapper.press(key)
        page.wait_for_timeout(120)
        amount=wrapper.evaluate('e=>Math.abs(e.scrollLeft)')
        record(f'{direction}: real keyboard scroll of technical viewport',amount>0,{'scrollLeftMagnitude':amount})

    for wide in [False,True]:
        m=load(wrap_table(PD,HEADS,wide=wide,static=True))
        record(f'static output ignores wide={wide}',m['wrap']=='anywhere' and m['max']=='none',m)
        load(wrap_table(PD,HEADS,wide=wide))
        page.emulate_media(media='print')
        m=page.evaluate(GEOMETRY,'target')
        record(f'print ignores screen policy wide={wide}',m['wrap']=='anywhere' and m['max']=='none',m)
    inner=wrap_table([['Nested static text','second column']],['A','B'],static=True,ident='inner')
    outer=wrap_table([[inner,'outer text']],['Outer A','Outer B'])
    load(outer,CURRENT)
    old=page.evaluate(GEOMETRY,'inner')
    load(outer)
    new=page.evaluate(GEOMETRY,'inner')
    record('negative control: old outer policy leaks into static descendant',old['wrap']=='break-word' and old['max']!='none',old)
    record('nested static cells retain independent wrap and size',new['wrap']=='anywhere' and new['max']=='none',new)

    load(wrap_table([['<code>'+'x'*128+'</code>','long token'],['<a href="#">'+'a'*128+'</a>','long URL']],['Token','Meaning'],wide=True,caption='Long identifiers'))
    fits=page.locator('#target tbody td:first-child').evaluate_all('''cells=>cells.every(cell=>{
      const b=cell.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(cell);
      return [...r.getClientRects()].every(x=>x.left>=b.left-1&&x.right<=b.right+1);
    })''')
    record('long code and links have contained text fragments',fits)
    record('caption and focusable wrapper are unchanged',page.locator('caption').inner_text()=='Long identifiers'
           and page.locator('#target').locator('..').get_attribute('tabindex')=='0')
    # Negative control reproduces the intermediate structural specificity.
    strong = (CANDIDATE.replace(':where(:not(.td-table-scroll--static))', ':not(.td-table-scroll--static)')
              .replace(':where(.td-table--wide)', '.td-table--wide')
              .replace(':where(thead, tbody, tfoot)', ':is(thead, tbody, tfoot)')
              .replace(':where(tr)', 'tr'))
    for wide in [False, True]:
        markup = wrap_table(PROSE, PROSE_HEADS, wide=wide).replace('id="target" class="', 'id="target" class="consumer ')
        override = '.td-content table.consumer {width:1200px;}'
        old = load(markup, strong + override)
        new = load(markup, CANDIDATE + override)
        record(f'negative control: stronger structural selector blocks width override ({wide})', old['width']<1190, old)
        record(f'consumer width override survives in mode wide={wide}', abs(new['width']-1200)<1, new)
    markup = wrap_table(PROSE, PROSE_HEADS).replace('id="target" class="', 'id="target" class="consumer ')
    override = '.td-content .td-table-scroll table.consumer td {max-width:18ch;overflow-wrap:normal;}'
    old = load(markup, strong + override)
    new = load(markup, CANDIDATE + override)
    record('negative control: structural types block cell override', old['wrap']=='break-word', old)
    record('consumer cell override retains precedence', new['wrap']=='normal' and float(new['max'].replace('px',''))<200, new)

    nojs=browser.new_context(java_script_enabled=False,viewport={'width':1440,'height':1000})
    np=nojs.new_page()
    np.set_content('<style>'+BASE+CANDIDATE+'</style><main class="td-content" style="width:772px">'+wrap_table(PD,HEADS,wide=True)+'</main>')
    m=np.evaluate(GEOMETRY,'target')
    record('explicit technical layout requires no page JavaScript',m['columns'][-1]['width']>=280,m)
    nojs.close()
    result={'scope':__doc__,'browser':browser.version,'checks':len(checks),'passed':sum(c['passed'] for c in checks),'results':checks}
    browser.close()
(OUT/'table-regression.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({k:result[k] for k in ['browser','checks','passed']}))

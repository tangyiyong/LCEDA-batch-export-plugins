import { t, LANGUAGES, getLanguage, setLanguage, translateStatic } from './i18n.ts';
import { browseDirectory } from './directory-view.ts';
import { defaultProfile, parseProfile, FIELDS, KINDS, LABELS, MANUAL_KINDS, EXPORT_METHODS } from './config.ts';
import type { Kind, Profile, Options } from './config.ts';
import { directoryApi, pickDirectory, hasDirectoryPicker } from './directory.ts';
import { saveJson, pickJson } from './file-dialog.ts';
import { listBoards, runExport } from './exporter.ts';
import type { Board, Report } from './exporter.ts';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const input=(id:string)=>$<HTMLInputElement>(id);
const api=typeof eda!=='undefined'?eda:undefined!;
let picked:Awaited<ReturnType<typeof pickDirectory>>|undefined;
let lastDirectory:typeof picked;let lastRoot='';
let boards:Board[]=[],projectUuid='',selected=new Set<string>(),profile=defaultProfile(),running=false,stop=false,lastReport:Report|undefined;
let projectName='';
let bomTemplates:string[]|undefined;
function renderTemplates():void {$('templates').textContent=bomTemplates===undefined?t('BOM 模板列表需激活 PCB 后刷新。'):bomTemplates.length?t('当前 PCB 可用 BOM 模板：${1}',bomTemplates.join('、')):'';}
function renderSummary():void {if(lastReport)$('summary').textContent=t('成功 ${1} · 失败 ${2} · 跳过 ${3}',...['success','failed','skipped'].map(state=>lastReport!.results.filter(r=>r.status===state).length));}
const optionNodes=new Map<string,HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>();
function status(text:string,error=false):void {$('status').textContent=text;$('status').className=error?'error':'';}
function error(e:unknown):void {status(e instanceof Error?e.message:String(e),true);}
function log(text:string):void {const node=$('log');node.textContent+=`${new Date().toLocaleTimeString()} ${text}\n`;node.scrollTop=node.scrollHeight;}
function renderBoards():void {
  const q=input('search').value.toLowerCase();$('boardList').replaceChildren();
  for(const b of boards.filter(b=>`${b.name} ${b.pcbName}`.toLowerCase().includes(q))) {
    const label=document.createElement('label');label.className='board';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=selected.has(b.pcbUuid);checkbox.disabled=running;checkbox.dataset.board=b.pcbUuid;
    checkbox.addEventListener('change',()=>{checkbox.checked?selected.add(b.pcbUuid):selected.delete(b.pcbUuid);count();});
    label.append(checkbox,document.createTextNode(b.name));const small=document.createElement('small');small.textContent=b.pcbName;label.append(small);$('boardList').append(label);
  }
  if(!boards.length) $('boardList').textContent=t('当前工程没有可导出的 PCB 子板。');count();
}
function count():void {$('boardCount').textContent=`${selected.size} / ${boards.length}`;}
function renderOptions():void {
  $('kinds').replaceChildren();optionNodes.clear();
  for(const kind of KINDS) {
    const details=document.createElement('details'),summary=document.createElement('summary'),checkbox=document.createElement('input');
    checkbox.type='checkbox';checkbox.checked=profile.selectedKinds.includes(kind);checkbox.id=`kind-${kind}`;checkbox.setAttribute('aria-label',t(LABELS[kind]));
    checkbox.addEventListener('click',e=>e.stopPropagation());
    if(MANUAL_KINDS.includes(kind)){checkbox.checked=false;checkbox.disabled=true;checkbox.dataset.unavailable='true';}
    const title=document.createElement('label');title.htmlFor=checkbox.id;title.textContent=t(LABELS[kind]);title.addEventListener('click',e=>e.stopPropagation());summary.append(checkbox,title);details.append(summary);
    const fields=document.createElement('div');fields.className='fields';
    for(const f of FIELDS[kind]) {
      const label=document.createElement('label');label.className=`field ${f.type==='json'?'wide':''}`;
      const text=document.createElement('span');text.textContent=t(f.label);label.append(text);
      let node:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
      if(f.type==='select') {const select=document.createElement('select');for(const v of f.values!) {const o=document.createElement('option');o.value=v;o.textContent=t(v);select.append(o);}node=select;}
      else if(f.type==='json') node=document.createElement('textarea');
      else {const field=document.createElement('input');field.type=f.type==='boolean'?'checkbox':f.type==='number'?'number':'text';if(f.type==='number'){field.min=String(f.min);field.max=String(f.max);}node=field;}
      node.setAttribute('aria-label',`${t(LABELS[kind])} ${t(f.label)}`);
      const v=profile.options[kind][f.key];
      if(f.type==='boolean') (node as HTMLInputElement).checked=v===true;
      else node.value=v===undefined?'':f.type==='json'?JSON.stringify(v,null,2):String(v);
      label.append(node);if(f.hint){const hint=document.createElement('small');hint.className='hint';hint.textContent=t(f.hint);label.append(hint);}fields.append(label);optionNodes.set(`${kind}.${f.key}`,node);
    }
    if(MANUAL_KINDS.includes(kind)) {
      const note=document.createElement('p');note.className='manual-note';note.textContent=t('官方 API 未提供批量文件接口；使用官方窗口按板导出。');
      const button=document.createElement('button');button.textContent=t("打开 ${1} 官方导出窗口",t(LABELS[kind]));
      button.onclick=()=>{void (async()=>{const chosen=boards.filter(b=>selected.has(b.pcbUuid));if(chosen.length!==1)throw Error(t('使用官方窗口时，请只选择一块子板'));const tab=await eda.dmt_EditorControl.openDocument(chosen[0].pcbUuid);if(!tab||!await eda.dmt_EditorControl.activateDocument(tab))throw Error(t('无法激活子板'));await eda.sys_Window.openUI(kind==='png'?'export(fileImage)':'export(disa-4001)');})().catch(error);};fields.append(note,button);
    }
    if(kind==='pdf'&&typeof eda!=='undefined'&&Number(eda.sys_Environment.getEditorCurrentVersion().split('.')[2])<68) {const note=document.createElement('p');note.className='manual-note';note.textContent=t('当前客户端 PDF 接口沿用编辑器设置；下列参数需 4.1.68 及以上才生效。');fields.prepend(note);}
    details.append(fields);$('kinds').append(details);
  }
  input('profileName').value=profile.name;
}
function readProfile():Profile {
  const options={} as Record<Kind,Options>;
  for(const kind of KINDS) {
    options[kind]={};
    for(const f of FIELDS[kind]) {
      const node=optionNodes.get(`${kind}.${f.key}`)!;
      if(f.optional&&!node.value.trim()) continue;
      try {options[kind][f.key]=f.type==='boolean'?(node as HTMLInputElement).checked:f.type==='number'?Number(node.value):f.type==='json'?JSON.parse(node.value):node.value;}
      catch{throw Error(t("${1} / ${2} 不是有效的 JSON",t(LABELS[kind]),t(f.label)));}
    }
  }
  return parseProfile({schema:'lceda-batch-export',version:1,name:input('profileName').value,selectedKinds:KINDS.filter(k=>input(`kind-${k}`).checked&&!MANUAL_KINDS.includes(k)),options});
}
function applyProfile(p:Profile):void {profile=p;renderOptions();}
function busy(value:boolean):void {
  running=value;
  document.querySelectorAll<HTMLInputElement|HTMLButtonElement|HTMLSelectElement|HTMLTextAreaElement>('input,button,select,textarea').forEach(n=>n.disabled=value||n.dataset.unavailable==='true');
  $<HTMLButtonElement>('cancel').disabled=!value;
  $<HTMLButtonElement>('retry').disabled=value||!lastReport?.results.some(r=>r.status==='failed');
  $<HTMLButtonElement>('downloadReport').disabled=value||!lastReport;
  $<HTMLButtonElement>('openDirectory').disabled=value||!lastReport;
}
async function refresh():Promise<void> {
  const data=await listBoards(api);projectUuid=data.projectUuid;boards=data.boards;
  selected=new Set(boards.map(b=>b.pcbUuid));projectName=data.projectName;$('project').textContent=projectName;renderBoards();
  status(t("已读取 ${1} 块子板。${2}",boards.length,t(hasDirectoryPicker()?'支持直接选择目录并授权写入。':'目录选择使用 EDA 客户端接口。')));
  try {bomTemplates=await eda.pcb_ManufactureData.getBomTemplates();}catch{bomTemplates=undefined;}renderTemplates();
}
async function start(retry=false):Promise<void> {
  if(running) return;
  let current:Profile;let taskKeys:Set<string>|undefined;
  try {
    current=readProfile();
    if((await eda.dmt_Project.getCurrentProjectInfo())?.uuid!==projectUuid) throw Error(t('当前工程已切换，请刷新子板列表'));
    if(retry) {
      if(!lastReport) return;
      taskKeys=new Set(lastReport.results.filter(r=>r.status==='failed').map(r=>`${r.pcbUuid}:${r.kind}`));
      current=parseProfile(lastReport.profile);
    }
    const chosen=boards.filter(b=>retry?[...taskKeys!].some(key=>key.startsWith(`${b.pcbUuid}:`)):selected.has(b.pcbUuid));
    stop=false;busy(true);$('log').textContent='';$('summary').textContent='';$<HTMLProgressElement>('progress').value=0;
    const destination=picked?directoryApi(api,picked):{api,root:input('root').value.trim()};
    const exportedDirectory=picked,exportedRoot=input('root').value.trim();
    lastReport=await runExport(destination.api,chosen,current,destination.root,{
      cancelled:()=>stop,taskKeys,directoryName:picked?.name,
      onProgress:(message,done,total,result)=>{status(message);const bar=$<HTMLProgressElement>('progress');bar.max=total;bar.value=done;if(result) log(message);},
    });
    lastDirectory=exportedDirectory;lastRoot=exportedRoot;
    const success=lastReport.results.filter(r=>r.status==='success').length,failed=lastReport.results.filter(r=>r.status==='failed').length,skipped=lastReport.results.filter(r=>r.status==='skipped').length;
    $('summary').textContent=t("成功 ${1} · 失败 ${2} · 跳过 ${3}",success,failed,skipped);
    const bar=$<HTMLProgressElement>('progress');bar.value=bar.max;
    status([t(lastReport.cancelled?'已停止':'导出完成'),lastReport.reportPath?t('报告：${1}',lastReport.reportPath):'',...lastReport.warnings].filter(Boolean).join('\n'),failed>0||lastReport.warnings.length>0);
    if(!picked) await eda.sys_Storage.setExtensionUserConfig('lastRoot',input('root').value.trim());
  } catch(e) {error(e);} finally {busy(false);}
}
function action(id:string,fn:()=>void|Promise<void>):void {$<HTMLButtonElement>(id).addEventListener('click',()=>{Promise.resolve().then(fn).catch(error);});}
action('refresh',refresh);
action('selectAll',()=>{boards.forEach(b=>selected.add(b.pcbUuid));renderBoards();});
action('selectNone',()=>{selected.clear();renderBoards();});
input('search').addEventListener('input',renderBoards);
action('saveDefault',async()=>{const p=readProfile();if(!(await eda.sys_Storage.setExtensionUserConfig('defaultProfile',p))) throw Error(t('默认值保存失败'));profile=p;status(t('已保存默认文件类型及全部导出选项。'));});
action('loadDefault',()=>{const saved=eda.sys_Storage.getExtensionUserConfig('defaultProfile');applyProfile(saved?parseProfile(saved):{...defaultProfile(),name:t('生产与测试')});status(t('已载入默认配置。'));});
action('exportProfile',async()=>{const p=readProfile();if(await saveJson(p,'batch-export-config.json'))status(t('配置文件已导出。'));});
action('importProfile',async()=>{const file=await pickJson();if(!file)return;if(file.size>1_000_000)throw Error(t('配置文件超过 1 MB'));const parsed=parseProfile(await file.text());applyProfile(parsed);status(t("已导入配置“${1}”；点击“保存为默认值”可设为下次默认。",parsed.name));});
action('chooseRoot',async()=>{
  try {
    if(hasDirectoryPicker()) {picked=await pickDirectory();input('root').value=t("所选目录：${1}",picked.name);input('root').readOnly=true;status(t('已授权所选根目录，文件将按类型写入子目录。'));return;}
    const path=await api.sys_FileSystem.openReadFolderPathDialog();if(path){picked=undefined;input('root').readOnly=false;input('root').value=path;}else status(t('客户端没有返回目录。可填写绝对路径，或升级客户端以使用目录选择。'),true);
  } catch(e) {if((e as DOMException).name==='AbortError')return;throw Error(t("目录选择失败：${1}",String(e)));}
});
action('openDirectory',async()=>{if(!lastReport)return;if(lastDirectory){await browseDirectory(lastDirectory);return;}const response=await fetch('app://api/client/openFolder',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:lastRoot})});const result=await response.json();if(result.result?.code!==1)throw Error(t('客户端未能打开目录'));});
action('run',()=>start());
action('retry',()=>start(true));
action('cancel',()=>{stop=true;$<HTMLButtonElement>('cancel').disabled=true;status(t('将在当前文件生成完成后停止，已保存的文件会保留。'));});
action('downloadReport',async()=>{if(lastReport&&await saveJson(lastReport,'export-report.json'))status(t('导出报告已保存。'));});
const languageSelect=$<HTMLSelectElement>('language');
for(const [value,label] of Object.entries(LANGUAGES)){const option=document.createElement('option');option.value=value;option.textContent=label;languageSelect.append(option);}
function applyLanguage():void {translateStatic(document.body);languageSelect.value=getLanguage();renderOptions();renderBoards();if(projectName)$('project').textContent=projectName;renderTemplates();renderSummary();if(picked)input('root').value=t('所选目录：${1}',picked.name);}
languageSelect.addEventListener('change',()=>{void (async()=>{
  if(running)return;
  try{profile=readProfile();}catch(e){languageSelect.value=getLanguage();error(e);return;}
  const open=Array.from(document.querySelectorAll<HTMLDetailsElement>('#kinds details')).map(n=>n.open);
  setLanguage(languageSelect.value);applyLanguage();
  document.querySelectorAll<HTMLDetailsElement>('#kinds details').forEach((n,i)=>n.open=open[i]);
  if(typeof eda!=='undefined')await eda.sys_Storage.setExtensionUserConfig('language',getLanguage());
  status(t('选择子板和文件，统一导出生产与测试资料。'));
})().catch(error);});
action('allKinds',()=>{for(const k of KINDS)if(!MANUAL_KINDS.includes(k))input(`kind-${k}`).checked=true;});
action('noKinds',()=>{for(const k of KINDS)input(`kind-${k}`).checked=false;});
async function init():Promise<void> {
  let language=typeof navigator!=='undefined'?navigator.language:'zh-Hans';
  if(typeof eda!=='undefined') {try{language=eda.sys_Storage.getExtensionUserConfig('language')||await eda.sys_I18n.getCurrentLanguage();}catch{}}
  setLanguage(language);translateStatic(document.body);languageSelect.value=getLanguage();profile.name=t('生产与测试');
  if(typeof eda==='undefined') {renderOptions();busy(true);languageSelect.disabled=false;status(t('此页面需通过嘉立创 EDA 专业版扩展打开，浏览器预览不提供工程接口。'),true);return;}
  try {const saved=eda.sys_Storage.getExtensionUserConfig('defaultProfile');if(saved)profile=parseProfile(saved);else profile.name=t('生产与测试');}catch(e){log(t("默认配置不可用，已恢复初始配置：${1}",String(e)));}
  renderOptions();input('root').value=eda.sys_Storage.getExtensionUserConfig('lastRoot')||'';busy(false);
  try {await refresh();}catch(e){error(e);}
}
void init();

import { t } from './i18n.ts';
import JSZip from 'jszip';
import { assertRoot, joinPath, safeName, parseProfile, LABELS, SUFFIX, MANUAL_KINDS } from './config.ts';
import type { Kind, Profile, Options } from './config.ts';
export type Api = typeof eda;
export type Board = {name:string;pcbUuid:string;pcbName:string;projectUuid:string};
export type Result = {board:string;pcbUuid:string;kind:Kind;status:'success'|'failed'|'skipped';path?:string;bytes?:number;error?:string};
export type Report = {schema:'lceda-batch-export-report';version:1;startedAt:string;finishedAt?:string;projectUuid:string;root:string;profile:Profile;results:Result[];cancelled:boolean;warnings:string[];reportPath?:string};
export async function listBoards(api:Api):Promise<{projectUuid:string;projectName:string;boards:Board[]}> {
  const project=await api.dmt_Project.getCurrentProjectInfo();
  if(!project) throw Error(t('请先打开需要导出的工程，并激活该工程的原理图或 PCB 标签页'));
  const boards=await api.dmt_Board.getAllBoardsInfo();
  const pcbs=await api.dmt_Pcb.getAllPcbsInfo();
  const found:Board[]=boards.filter(b=>b.parentProjectUuid===project.uuid && b.pcb?.uuid).map(b=>({name:b.name,pcbUuid:b.pcb.uuid,pcbName:b.pcb.name,projectUuid:project.uuid}));
  for(const pcb of pcbs) if(pcb.parentProjectUuid===project.uuid && !found.some(b=>b.pcbUuid===pcb.uuid)) found.push({name:pcb.parentBoardName||pcb.name,pcbUuid:pcb.uuid,pcbName:pcb.name,projectUuid:project.uuid});
  return {projectUuid:project.uuid,projectName:project.name,boards:found};
}
export async function generate(api:Api, kind:Kind, name:string, o:Options):Promise<File|undefined> {
  const m=api.pcb_ManufactureData;
  if(MANUAL_KINDS.includes(kind))throw Error(t('当前官方 API 未提供此格式的批量导出，请使用该项的官方窗口入口'));
  switch(kind) {
    case 'gerber': return m.getGerberFile(...([name,o.colorSilkscreen,o.unit,{integerNumber:o.integerNumber,decimalNumber:o.decimalNumber},{metallicDrillingInformation:o.metallicDrillingInformation,nonMetallicDrillingInformation:o.nonMetallicDrillingInformation,drillTable:o.drillTable,flyingProbeTestingFile:o.flyingProbeTestingFile},o.layers,o.objects] as unknown as Parameters<typeof m.getGerberFile>));
    case 'bom': return m.getBomFile(...([name,o.fileType,o.template||undefined,o.filterOptions,o.statistics,o.property,o.columns] as unknown as Parameters<typeof m.getBomFile>));
    case 'dxf': return m.getDxfFile(...([name,o.layers,o.objects] as unknown as Parameters<typeof m.getDxfFile>));
    case 'netlist': return m.getNetlistFile(...([name,o.netlistType] as unknown as Parameters<typeof m.getNetlistFile>));
    case 'pickplace': return m.getPickAndPlaceFile(...([name,o.fileType,o.unit] as unknown as Parameters<typeof m.getPickAndPlaceFile>));
    case 'odb': return m.getOpenDatabaseDoublePlusFile(...([name,o.unit,{metallizedDrilledHoles:o.metallizedDrilledHoles,nonMetallizedDrilledHoles:o.nonMetallizedDrilledHoles,drillTable:o.drillTable,flyingProbeTestFile:o.flyingProbeTestFile},o.layers,o.objects] as unknown as Parameters<typeof m.getOpenDatabaseDoublePlusFile>));
    case 'model3d': return m.get3DFile(...([name,o.fileType,o.element,o.modelMode,o.autoGenerateModels] as unknown as Parameters<typeof m.get3DFile>));
    case 'shell3d': return m.get3DShellFile(...([name,o.fileType] as unknown as Parameters<typeof m.get3DShellFile>));
    case 'pdf': return m.getPdfFile(...([name,o.outputMethod,o.contentConfig,o.watermark,o.graphPageConfig] as unknown as Parameters<typeof m.getPdfFile>));
    case 'ipc356':return m.getIpcD356AFile(name);
    case 'flyingprobe':return m.getFlyingProbeTestFile();
    case 'ibom':return m.getInteractiveBomFile(name);
    case 'pcbinfo':return m.getPcbInfoFile(name);
    case 'dsn':return m.getDsnFile(name);
    case 'altium':return m.getAltiumDesignerFile();
    case 'pads':return m.getPadsFile();
    case 'testpoint': return m.getTestPointFile(...([name,o.fileType] as unknown as Parameters<typeof m.getTestPointFile>));
  }
}
export async function selectedPcbFile(file:File,board:Board,kind:'altium'|'pads'):Promise<File> {
  const magic=new Uint8Array(await file.slice(0,2).arrayBuffer());
  if(magic[0]!==80||magic[1]!==75)return file;
  const zip=await JSZip.loadAsync(await file.arrayBuffer());
  const suffix=kind==='altium'?'.pcbdoc':'.asc';
  const entries=Object.values(zip.files).filter(e=>!e.dir&&e.name.toLowerCase().endsWith(suffix));
  let matches=entries.filter(e=>e.name.split('/').pop()!.toLowerCase()===(board.pcbName+suffix).toLowerCase());
  if(matches.length!==1)matches=entries.filter(e=>e.name.split('/').slice(0,-1).some(part=>part===board.name));
  if(matches.length!==1)throw Error(t("无法唯一识别 ${1} 的 PCB 文件，已阻止保存整工程压缩包",board.name));
  return new File([await matches[0].async('arraybuffer')],board.name+(kind==='altium'?'.PcbDoc':'.asc'));
}
async function checkProject(api:Api, uuid:string):Promise<void> {
  if((await api.dmt_Project.getCurrentProjectInfo())?.uuid!==uuid) throw Error(t('当前工程已经切换，请刷新子板列表后重新导出'));
}
async function focus(api:Api,board:Board):Promise<void> {
  await checkProject(api,board.projectUuid);
  const tab=await api.dmt_EditorControl.openDocument(board.pcbUuid);
  if(!tab || !(await api.dmt_EditorControl.activateDocument(tab))) throw Error(t('无法打开或激活 PCB'));
  // openDocument returns before the active document state has necessarily settled.
  for(let i=0;i<40;i++) {
    const doc=await api.dmt_SelectControl.getCurrentDocumentInfo();
    if(doc?.uuid===board.pcbUuid && doc.parentProjectUuid===board.projectUuid && Number(doc.documentType)===3) return;
    await new Promise(r=>setTimeout(r,250));
  }
  throw Error(t('PCB 激活超时，已阻止导出以免文件归属错误'));
}
async function ensureDir(api:Api,path:string):Promise<void> {
  if(await api.sys_FileSystem.existsPathInFileSystem(path)) return;
  if(!(await api.sys_FileSystem.createDirectoryInFileSystem(path))) throw Error(t("无法创建目录：${1}",path));
}
async function writeUnique(api:Api,dir:string,name:string,file:Blob):Promise<string> {
  const dot=name.lastIndexOf('.'), base=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';
  for(let i=0;i<10000;i++) {
    const path=joinPath(dir,`${base}${i?`_${i+1}`:''}${ext}`);
    if(await api.sys_FileSystem.existsPathInFileSystem(path)) continue;
    if(await api.sys_FileSystem.saveFileToFileSystem(path,file,undefined,false)) return path;
    if(!(await api.sys_FileSystem.existsPathInFileSystem(path))) throw Error(t("文件写入失败：${1}",path));
  }
  throw Error(t('重名文件过多，请选择新的导出目录'));
}
function errorText(e:unknown):string {return e instanceof Error?e.message:String(e);}
export async function runExport(api:Api, selection:Board[], input:Profile, root:string, controls:{cancelled:()=>boolean;taskKeys?:Set<string>;directoryName?:string;onProgress:(message:string,done:number,total:number,result?:Result)=>void}):Promise<Report> {
  assertRoot(root);
  const profile=parseProfile(input);
  if(!selection.length||!profile.selectedKinds.length) throw Error(t('请至少选择一块子板和一种导出文件'));
  const boards=selection.filter((b,i)=>selection.findIndex(x=>x.pcbUuid===b.pcbUuid)===i);
  const projectUuid=boards[0].projectUuid;
  if(boards.some(b=>b.projectUuid!==projectUuid)) throw Error(t('选中的子板必须属于同一个工程'));
  await checkProject(api,projectUuid);
  const available=await listBoards(api);
  for(const b of boards) if(!available.boards.some(x=>x.pcbUuid===b.pcbUuid)) throw Error(t("子板 ${1} 已不存在，请刷新列表",b.name));
  const displayPath=(path:string)=>controls.directoryName?path.slice(root.length+1):path;
  const report:Report={schema:'lceda-batch-export-report',version:1,startedAt:new Date().toISOString(),projectUuid,root:controls.directoryName?t("所选目录：${1}（文件路径相对此目录）",controls.directoryName):root,profile,results:[],cancelled:false,warnings:[]};
  // Permission and destination check happens before generating any manufacturing data.
  try {await ensureDir(api,root);for(const k of profile.selectedKinds) await ensureDir(api,joinPath(root,k));}
  catch(e) {throw Error(t("无法访问导出目录。请检查路径，并在扩展管理器启用本扩展的“外部交互权限”。${1}",errorText(e)));}
  const original=await api.dmt_SelectControl.getCurrentDocumentInfo();
  const names=new Set<string>(),boardNames=new Map<string,string>();
  for(const b of boards) {const base=safeName(b.name);let name=base,i=2;while(names.has(name.toLowerCase())) name=`${base}_${i++}`;names.add(name.toLowerCase());boardNames.set(b.pcbUuid,name);}
  const wanted=(b:Board,k:Kind)=>!controls.taskKeys||controls.taskKeys.has(`${b.pcbUuid}:${k}`);
  const total=boards.reduce((n,b)=>n+profile.selectedKinds.filter(k=>wanted(b,k)).length,0);
  const converted=new Map<Kind,File>();
  try {
    for(const board of boards) {
      if(controls.cancelled()) {report.cancelled=true;break;}
      try {await focus(api,board);} catch(e) {
        for(const kind of profile.selectedKinds.filter(k=>wanted(board,k))) {const result:Result={board:board.name,pcbUuid:board.pcbUuid,kind,status:'failed',error:errorText(e)};report.results.push(result);controls.onProgress(`${board.name}：${errorText(e)}`,report.results.length,total,result);}
        // Project changes invalidate the rest of the captured board list.
        if((await api.dmt_Project.getCurrentProjectInfo())?.uuid!==projectUuid) {report.warnings.push(t('工程切换，已停止剩余任务'));break;}
        continue;
      }
      for(const kind of profile.selectedKinds.filter(k=>wanted(board,k))) {
        if(controls.cancelled()) {report.cancelled=true;break;}
        controls.onProgress(t("正在导出 ${1} · ${2}",board.name,t(LABELS[kind])),report.results.length,total);
        const result:Result={board:board.name,pcbUuid:board.pcbUuid,kind,status:'failed'};
        try {
          await checkProject(api,projectUuid);
          const before=await api.dmt_SelectControl.getCurrentDocumentInfo();
          if(before?.uuid!==board.pcbUuid || before.parentProjectUuid!==projectUuid) throw Error(t('当前 PCB 已改变；请勿在导出时切换标签页'));
          let file=converted.get(kind)||await generate(api,kind,boardNames.get(board.pcbUuid)!,profile.options[kind]);
          if(file&&(kind==='altium'||kind==='pads')) {converted.set(kind,file);file=await selectedPcbFile(file,board,kind);}
          const after=await api.dmt_SelectControl.getCurrentDocumentInfo();
          if(after?.uuid!==board.pcbUuid || after.parentProjectUuid!==projectUuid) throw Error(t('生成文件时当前 PCB 被切换，文件未保存；请重新导出'));
          if(!file || file.size===0) throw Error(t('EDA 未返回有效文件（可能被取消、接口不支持或生成失败）'));
          // Some client APIs return the supplied name verbatim, without a suffix.
          // Derive known format suffixes from the request, keeping netlist's actual suffix.
          const actual=file.name?.match(/\.([a-z0-9]+)$/i)?.[1];
          let ext=(['gerber','dxf','bom','pickplace','testpoint','model3d','shell3d'].includes(kind)?String(profile.options[kind].fileType||SUFFIX[kind]):actual)||String(profile.options[kind].fileType||SUFFIX[kind]||(kind==='netlist'?'enet':'dat'));
          const magic=new Uint8Array(await file.slice(0,4).arrayBuffer());
          if(magic[0]===80&&magic[1]===75&&ext!=='xlsx')ext='zip';
          if(magic[0]===31&&magic[1]===139)ext='tgz';
          const filename=`${boardNames.get(board.pcbUuid)}.${safeName(ext)}`;
          result.path=displayPath(await writeUnique(api,joinPath(root,kind),filename,file));
          result.bytes=file.size;result.status='success';
        } catch(e) {result.error=errorText(e);}
        report.results.push(result);
        controls.onProgress(result.status==='success'?t("已保存 ${1}",result.path):t("失败 ${1} / ${2}：${3}",board.name,t(LABELS[kind]),result.error),report.results.length,total,result);
        if((await api.dmt_Project.getCurrentProjectInfo())?.uuid!==projectUuid) {report.warnings.push(t('工程切换，已停止剩余任务'));break;}
      }
      if(report.cancelled || report.warnings.length) break;
    }
  } finally {
    if(original?.tabId && (await api.dmt_Project.getCurrentProjectInfo())?.uuid===projectUuid) {
      try {if(!(await api.dmt_EditorControl.activateDocument(original.tabId))) report.warnings.push(t('未能恢复原标签页'));} catch(e) {report.warnings.push(t("恢复标签页失败：${1}",errorText(e)));}
    }
  }
  for(const b of boards) for(const k of profile.selectedKinds) if(wanted(b,k) && !report.results.some(r=>r.pcbUuid===b.pcbUuid && r.kind===k)) report.results.push({board:b.name,pcbUuid:b.pcbUuid,kind:k,status:'skipped',error:report.cancelled?t('用户停止导出'):t('任务提前终止')});
  report.finishedAt=new Date().toISOString();
  try {
    const name=`export-report_${report.startedAt.replace(/[:.]/g,'-')}.json`;
    report.reportPath=displayPath(await writeUnique(api,root,name,new Blob([JSON.stringify(report,null,2)],{type:'application/json'})));
  } catch(e) {report.warnings.push(t("导出报告写入失败：${1}；可在窗口下载报告",errorText(e)));}
  return report;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfile, parseProfile, safeName, joinPath } from '../src/config.ts';
import { runExport, generate } from '../src/exporter.ts';
import type { Api, Board } from '../src/exporter.ts';
const boards:Board[]=[{name:'MAIN',pcbUuid:'p1',pcbName:'PCB.MAIN',projectUuid:'project'},{name:'MIC',pcbUuid:'p2',pcbName:'PCB.MIC',projectUuid:'project'}];
function fixture() {
  let active='original',project='project';const written=new Map<string,Blob>(),calls:{pcb:string;kind:string;args:unknown[]}[]=[];const bad=new Set<string>();const options=new Map<string,unknown>();
  const manufacture:Record<string,unknown>={};
  for(const [method,kind,extension] of [['getGerberFile','gerber','zip'],['getBomFile','bom','xlsx'],['getDxfFile','dxf','dxf'],['getNetlistFile','netlist','enet'],['getPickAndPlaceFile','pickplace','csv'],['getTestPointFile','testpoint','csv']]) manufacture[method]=async(...args:unknown[])=>{calls.push({pcb:active,kind,args});if(bad.has(`${active}:${kind}`))return undefined;return new File([`${active}-${kind}`],`${args[0]}.${extension}`);};
  const api={
    dmt_Project:{getCurrentProjectInfo:async()=>({uuid:project,name:'project'})},
    dmt_Board:{getAllBoardsInfo:async()=>boards.map(b=>({name:b.name,parentProjectUuid:b.projectUuid,pcb:{uuid:b.pcbUuid,name:b.pcbName}}))},
    dmt_Pcb:{getAllPcbsInfo:async()=>[]},
    dmt_SelectControl:{getCurrentDocumentInfo:async()=>({uuid:active,tabId:active,parentProjectUuid:project,documentType:3})},
    dmt_EditorControl:{openDocument:async(id:string)=>id,activateDocument:async(id:string)=>{active=id;return true;}},
    pcb_ManufactureData:manufacture,
    sys_FileSystem:{existsPathInFileSystem:async(path:string)=>written.has(path),createDirectoryInFileSystem:async()=>true,saveFileToFileSystem:async(path:string,data:Blob,_name:string,force:boolean)=>{assert.equal(force,false);if(written.has(path))return false;written.set(path,data);return true;}},
    sys_Storage:{getExtensionUserConfig:(k:string)=>options.get(k),setExtensionUserConfig:async(k:string,v:unknown)=>{options.set(k,v);return true;}},
  } as unknown as Api;
  return {api,written,calls,bad,get active(){return active;},switchProject:()=>{project='other';},switchPcb:()=>{active='wrong';}};
}
const controls={cancelled:()=>false,onProgress:()=>{}};
test('配置往返、未知格式、非法选项与原型污染',()=>{
  const p=defaultProfile();assert.deepEqual(parseProfile(JSON.stringify(p)),p);
  assert.throws(()=>parseProfile({...p,version:2}));
  assert.throws(()=>parseProfile({...p,selectedKinds:['evil']}));
  p.options.gerber.layers=[{layerId:11,mirror:false}];assert.throws(()=>parseProfile(p));
  p.options.gerber.layers=[{layerId:11,isMirror:false}];assert.doesNotThrow(()=>parseProfile(p));
  p.options.bom.columns=[{property:'Designator',sort:'ascending'}];assert.throws(()=>parseProfile(p));
  assert.throws(()=>parseProfile('{"schema":"lceda-batch-export","version":1,"name":"x","selectedKinds":[],"options":{"bom":{"fileType":"csv","__proto__":{}}}}'));
});
test('路径与跨平台文件名',()=>{assert.equal(safeName('../A/B:*'),'.._A_B__');assert.equal(safeName('CON'),'_CON');assert.equal(safeName('...'),'board');assert.equal(joinPath('/tmp/out/','bom','MAIN.xlsx'),'/tmp/out/bom/MAIN.xlsx');assert.equal(joinPath('C:\\out\\','bom','MAIN.xlsx'),'C:\\out\\bom\\MAIN.xlsx');});
test('逐板导出六类文件、目录归类、记录及恢复标签页',async()=>{
  const f=fixture(),p=defaultProfile();p.selectedKinds=['gerber','bom','dxf','netlist','pickplace','testpoint'];
  const report=await runExport(f.api,boards,p,'/tmp/out',controls);
  assert.equal(report.results.length,12);assert.ok(report.results.every(r=>r.status==='success'));assert.equal(f.active,'original');
  assert.deepEqual(f.calls.map(c=>c.pcb),['p1','p1','p1','p1','p1','p1','p2','p2','p2','p2','p2','p2']);
  assert.ok(f.written.has('/tmp/out/bom/MAIN.xlsx'));assert.ok(f.written.has('/tmp/out/netlist/MIC.enet'));assert.ok(report.reportPath);
  const data=JSON.parse(await f.written.get(report.reportPath!)!.text());assert.equal(data.results.length,12);assert.equal(data.profile.options.dxf.layers[0].layerId,11);
});
test('选项映射 Gerber、BOM、DXF 与网表参数',async()=>{
  const f=fixture(),p=defaultProfile();
  p.options.bom={fileType:'csv',template:'template',filterOptions:[{property:'Add into BOM',includeValue:'yes'}],statistics:['Quantity'],property:['Designator'],columns:[{property:'Designator',title:'位号'}]};
  for(const k of p.selectedKinds)await generate(f.api,k,'MAIN',p.options[k]);
  assert.deepEqual(f.calls[0].args.slice(0,4),['MAIN',false,'mm',{integerNumber:4,decimalNumber:5}]);
  assert.equal((f.calls[0].args[4] as any).flyingProbeTestingFile,true);
  assert.deepEqual(f.calls[1].args,['MAIN','csv','template',p.options.bom.filterOptions,['Quantity'],['Designator'],p.options.bom.columns]);
  assert.deepEqual(f.calls[2].args,['MAIN',[{layerId:11,mirror:false}],undefined]);assert.deepEqual(f.calls[3].args,['MAIN','JLCEDA']);
});
test('单项失败继续后续任务；只重试指定失败项',async()=>{
  const f=fixture(),p=defaultProfile();f.bad.add('p1:bom');
  const report=await runExport(f.api,boards,p,'/tmp/out',controls);assert.equal(report.results.filter(r=>r.status==='failed').length,1);assert.equal(report.results.filter(r=>r.status==='success').length,7);
  f.bad.clear();f.calls.length=0;
  const retry=await runExport(f.api,boards,p,'/tmp/out',{...controls,taskKeys:new Set(['p1:bom'])});
  assert.equal(retry.results.length,1);assert.deepEqual(f.calls.map(c=>[c.pcb,c.kind]),[['p1','bom']]);
});
test('取消保留成功文件并记录未执行项',async()=>{
  const f=fixture();let stop=false;
  const report=await runExport(f.api,boards,defaultProfile(),'/tmp/out',{cancelled:()=>stop,onProgress:(_m,_d,_t,r)=>{if(r)stop=true;}});
  assert.equal(report.cancelled,true);assert.equal(report.results.filter(r=>r.status==='success').length,1);assert.equal(report.results.filter(r=>r.status==='skipped').length,7);assert.equal(f.active,'original');
});
test('同名文件不覆盖、同名板名清洗后不冲突',async()=>{
  const f=fixture();f.written.set('/tmp/out/bom/MAIN.xlsx',new Blob(['original']));const p=defaultProfile();p.selectedKinds=['bom'];
  const report=await runExport(f.api,boards,p,'/tmp/out',controls);assert.equal(report.results[0].path,'/tmp/out/bom/MAIN_2.xlsx');assert.equal(await f.written.get('/tmp/out/bom/MAIN.xlsx')!.text(),'original');
  const same=[{...boards[0],name:'A/B'},{...boards[1],name:'A:B'}];const second=await runExport(f.api,same,p,'/tmp/out',controls);assert.notEqual(second.results[0].path,second.results[1].path);
});
test('导出期间切换 PCB 的文件不保存',async()=>{
  const f=fixture(),p=defaultProfile();p.selectedKinds=['bom'];const m=f.api.pcb_ManufactureData;
  const original=m.getBomFile;m.getBomFile=async(...args)=>{const file=await original(...args);f.switchPcb();return file;};
  const report=await runExport(f.api,[boards[0]],p,'/tmp/out',controls);assert.equal(report.results[0].status,'failed');assert.match(report.results[0].error!,/切换/);assert.ok(!f.written.has('/tmp/out/bom/MAIN.xlsx'));
});
test('工程切换中止；目录权限失败在生成文件前报告',async()=>{
  const f=fixture();const report=await runExport(f.api,boards,defaultProfile(),'/tmp/out',{...controls,onProgress:(_m,_d,_t,r)=>{if(r)f.switchProject();}});
  assert.equal(f.calls.length,1);assert.equal(report.results.filter(r=>r.status==='skipped').length,7);
  const g=fixture();g.api.sys_FileSystem.existsPathInFileSystem=async()=>{throw Error('permission denied');};await assert.rejects(runExport(g.api,boards,defaultProfile(),'/tmp/out',controls),/外部交互权限/);assert.equal(g.calls.length,0);
});
test('客户端返回无后缀名称时补齐生产格式；目录授权报告使用相对路径',async()=>{
  const f=fixture(),p=defaultProfile();p.selectedKinds=['gerber','dxf','pickplace','testpoint'];
  for(const method of ['getGerberFile','getDxfFile','getPickAndPlaceFile','getTestPointFile'] as const) {
    const old=f.api.pcb_ManufactureData[method];
    (f.api.pcb_ManufactureData as any)[method]=async(...args:any[])=>{const file=await (old as any)(...args);return new File([file],args[0]);};
  }
  const report=await runExport(f.api,[boards[0]],p,'/selected-directory',{...controls,directoryName:'生产文件'});
  assert.deepEqual(report.results.map(r=>r.path),['gerber/MAIN.zip','dxf/MAIN.dxf','pickplace/MAIN.csv','testpoint/MAIN.csv']);
  assert.match(report.root,/生产文件/);assert.ok(!report.reportPath!.includes('/selected-directory'));
});
test('新增 11 类接口、旧配置迁移与全菜单名称覆盖',async()=>{
  const {KINDS,LABELS,MANUAL_KINDS,EXPORT_METHODS}=await import('../src/config.ts');
  assert.equal(KINDS.length,19);assert.equal(LABELS.netlist,'网表文件');assert.equal(LABELS.pickplace,'坐标文件(CPL)');
  const old=defaultProfile();delete (old.options as any).odb;assert.equal(parseProfile(old).options.odb.unit,'mm');
  const f=fixture(),p=defaultProfile();p.selectedKinds=KINDS.filter(k=>!MANUAL_KINDS.includes(k));
  for(const [kind,method] of Object.entries(EXPORT_METHODS))if(!(f.api.pcb_ManufactureData as any)[method!]) (f.api.pcb_ManufactureData as any)[method!]=async(...args:unknown[])=>{f.calls.push({pcb:f.active,kind,args});return new File([`p1-${kind}`],`${args[0]||'official'}.dat`);};
  const report=await runExport(f.api,[boards[0]],p,'/tmp/out',controls);assert.equal(report.results.length,17);assert.ok(report.results.every(r=>r.status==='success'));
  assert.deepEqual(f.calls.find(c=>c.kind==='model3d')!.args,['MAIN','step',['Component Model','Via','Silkscreen','Wire In Signal Layer'],'Outfit',false]);
  await assert.rejects(generate(f.api,'png','MAIN',{}),/官方 API/);
});

test('整工程转换包只提取所选 PCB，名称相近的板不会混入',async()=>{
  const JSZip=(await import('jszip')).default;
  const {selectedPcbFile}=await import('../src/exporter.ts');
  const zip=new JSZip();zip.file('project/MAIN/PCB.MAIN.pcbdoc','main');zip.file('project/MAIN_extra/PCB.MAIN_extra.pcbdoc','extra');zip.file('project/MIC/PCB.MIC.pcbdoc','mic');
  const file=new File([await zip.generateAsync({type:'arraybuffer'})],'project.zip');
  assert.equal(await (await selectedPcbFile(file,boards[0],'altium')).text(),'main');
  assert.equal(await (await selectedPcbFile(file,boards[1],'altium')).text(),'mic');
  await assert.rejects(selectedPcbFile(file,{...boards[0],name:'missing',pcbName:'missing'},'altium'),/唯一识别/);
});

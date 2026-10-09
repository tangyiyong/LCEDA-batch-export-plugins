// Render the actual extension UI with public sample boards for documentation screenshots.
// This fixture provides no manufacturing or filesystem APIs and cannot export production files.
import fs from 'node:fs/promises';
const names=['MAIN','LED','SENSOR','POWER'];
const fixture=`<script>
const boards=${JSON.stringify(names)}.map((name,i)=>({name,parentProjectUuid:'demo-project',pcb:{uuid:'demo-'+i,name:'PCB.'+name}}));
const settings={};
window.eda={
 dmt_Project:{getCurrentProjectInfo:async()=>({uuid:'demo-project',name:'批量导出演示工程'})},
 dmt_Board:{getAllBoardsInfo:async()=>boards},dmt_Pcb:{getAllPcbsInfo:async()=>[]},
 sys_Storage:{getExtensionUserConfig:key=>settings[key],setExtensionUserConfig:async(key,value)=>{settings[key]=value;return true}},
 sys_I18n:{getCurrentLanguage:async()=>'zh-Hans'},
 sys_Environment:{getEditorCurrentVersion:()=> '4.1.60'},
 pcb_ManufactureData:{getBomTemplates:async()=>['示例 BOM 模板.xlsx']}
};
</script>`;
let html=await fs.readFile('iframe/index.html','utf8');
html=html.replace('<script>',fixture+'<script>');
html=html.replace('<header>','<div style="padding:8px 28px;background:#fff8e9;color:#895a16;font-size:12px">功能界面演示 · 使用公开示例子板，不含真实工程数据</div><header>');
await fs.mkdir('build/demo',{recursive:true});await fs.writeFile('build/demo/index.html',html);
console.log('Demo UI: build/demo/index.html');

import { t } from './i18n.ts';
// Browser dialogs avoid the client 4.1.60 native file API returning false/undefined.
export async function saveJson(data:unknown,name:string):Promise<boolean> {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const picker=(window as unknown as {showSaveFilePicker?: (options:unknown)=>Promise<{createWritable:()=>Promise<{write:(b:Blob)=>Promise<void>;close:()=>Promise<void>;abort:()=>Promise<void>}>}>}).showSaveFilePicker;
  if(picker) {
    try {
      const handle=await picker({suggestedName:name,types:[{description:t('JSON 配置或报告'),accept:{'application/json':['.json']}}]});
      const stream=await handle.createWritable();
      try {await stream.write(blob);await stream.close();}catch(e){await stream.abort();throw e;}
      return true;
    }catch(e){if((e as DOMException).name==='AbortError')return false;throw e;}
  }
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return true;
}
export function pickJson():Promise<File|undefined> {
  return new Promise(resolve=>{
    const field=document.createElement('input');field.type='file';field.accept='.json,application/json';field.hidden=true;
    const done=(file?:File)=>{field.remove();resolve(file);};
    field.addEventListener('change',()=>done(field.files?.[0]),{once:true});
    field.addEventListener('cancel',()=>done(),{once:true});document.body.append(field);field.click();
  });
}

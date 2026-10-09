import { t } from './i18n.ts';
import type { Api } from './exporter.ts';
// Minimal standard File System Access types; DOM libs do not yet include directory pickers.
export type Directory={kind?:'directory';values?:()=>AsyncIterableIterator<{kind:'file';name:string;getFile:()=>Promise<File>}|Directory>;name:string;getDirectoryHandle:(name:string,options?:{create?:boolean})=>Promise<Directory>;getFileHandle:(name:string,options?:{create?:boolean})=>Promise<{createWritable:()=>Promise<{write:(data:Blob)=>Promise<void>;close:()=>Promise<void>;abort:()=>Promise<void>}>}>};
const VIRTUAL_ROOT='/selected-directory';
export function hasDirectoryPicker():boolean {return typeof (window as unknown as {showDirectoryPicker?:unknown}).showDirectoryPicker==='function';}
export async function pickDirectory():Promise<Directory> {
  return (window as unknown as {showDirectoryPicker:(options:{mode:string})=>Promise<Directory>}).showDirectoryPicker({mode:'readwrite'});
}
export function directoryApi(api:Api,handle:Directory):{api:Api;root:string} {
  function parts(path:string):string[] {if(path!==VIRTUAL_ROOT&&!path.startsWith(VIRTUAL_ROOT+'/'))throw Error(t('路径超出授权目录'));const p=path.slice(VIRTUAL_ROOT.length).split('/').filter(Boolean);if(p.some(s=>s==='.'||s==='..'||s.includes('\\')))throw Error(t('非法路径'));return p;}
  async function dir(path:string,create:boolean):Promise<Directory> {let current=handle;for(const p of parts(path))current=await current.getDirectoryHandle(p,{create});return current;}
  const fs=new Proxy(api.sys_FileSystem,{get(target,key){
    if(key==='createDirectoryInFileSystem') return async(path:string)=>{await dir(path,true);return true;};
    if(key==='existsPathInFileSystem') return async(path:string)=>{
      const p=parts(path);if(!p.length)return true;const name=p.pop()!;
      try {const parent=await dir(VIRTUAL_ROOT+'/'+p.join('/'),false);try{await parent.getFileHandle(name);return true;}catch(e){if((e as DOMException).name!=='TypeMismatchError'&&(e as DOMException).name!=='NotFoundError')throw e;await parent.getDirectoryHandle(name);return true;}}
      catch(e){if((e as DOMException).name==='NotFoundError')return false;throw e;}
    };
    if(key==='saveFileToFileSystem') return async(path:string,data:Blob,_name?:string,force=false)=>{
      const p=parts(path),name=p.pop()!;const parent=await dir(VIRTUAL_ROOT+'/'+p.join('/'),true);
      if(!force){try{await parent.getFileHandle(name);return false;}catch(e){if((e as DOMException).name!=='NotFoundError')throw e;}}
      const file=await parent.getFileHandle(name,{create:true}),stream=await file.createWritable();
      try{await stream.write(data);await stream.close();return true;}catch(e){await stream.abort();throw e;}
    };
    return Reflect.get(target,key);
  }});
  return {api:new Proxy(api,{get(target,key){return key==='sys_FileSystem'?fs:Reflect.get(target,key);}}),root:VIRTUAL_ROOT};
}

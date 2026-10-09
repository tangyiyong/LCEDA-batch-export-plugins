import { t } from './i18n.ts';
import JSZip from 'jszip';
import type { Directory } from './directory.ts';
type Entry={kind:'file';name:string;getFile:()=>Promise<File>}|Directory;
export async function browseDirectory(handle:Directory):Promise<void> {
  const modal=document.createElement('dialog');modal.className='directory-view';
  const heading=document.createElement('h2');heading.textContent=t("导出目录：${1}",handle.name);
  const close=document.createElement('button');close.textContent=t('关闭');close.onclick=()=>modal.close();
  const native=document.createElement('button');native.textContent=t('在访达/资源管理器打开…');
  const notice=document.createElement('p');notice.textContent=t('点击文件查看内容；系统目录授权不提供绝对路径，首次在系统中打开时请选择同一目录。');
  native.onclick=async()=>{try {
    const response=await fetch('app://api/client/openDir',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({})});
    const choice=await response.json();if(choice.result?.code!==1)return;
    const result=await (await fetch('app://api/client/openFolder',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:choice.result.path})})).json();
    if(result.result?.code!==1)throw Error(result.result?.message||t('客户端未能打开目录'));
  }catch(e){notice.textContent=t("系统打开失败：${1}。仍可在这里查看导出内容。",String(e));}};
  const list=document.createElement('div'),preview=document.createElement('div');preview.className='file-preview';
  const layout=document.createElement('div');layout.className='directory-layout';layout.append(list,preview);modal.append(heading,close,native,notice,layout);document.body.append(modal);
  let currentUrl:string|undefined;
  modal.addEventListener('close',()=>{if(currentUrl)URL.revokeObjectURL(currentUrl);modal.remove();});modal.showModal();
  async function show(file:File) {
    preview.replaceChildren();if(currentUrl)URL.revokeObjectURL(currentUrl);
    const title=document.createElement('h3');title.textContent=t("${1} · ${2} 字节",file.name,file.size.toLocaleString());preview.append(title);
    const suffix=file.name.split('.').pop()?.toLowerCase();
    if(suffix==='zip'||suffix==='xlsx') {
      const zip=await JSZip.loadAsync(await file.arrayBuffer());
      const pre=document.createElement('pre');preview.append(pre);
      if(suffix==='xlsx') {
        const parser=new DOMParser(),shared=zip.file('xl/sharedStrings.xml');
        const strings=shared?Array.from(parser.parseFromString(await shared.async('string'),'application/xml').getElementsByTagName('si')).map(n=>n.textContent||''):[];
        const sheet=zip.file('xl/worksheets/sheet1.xml');if(!sheet)throw Error(t('工作簿没有首表'));
        const xml=parser.parseFromString(await sheet.async('string'),'application/xml');
        pre.textContent=Array.from(xml.getElementsByTagName('row')).slice(0,501).map(row=>Array.from(row.getElementsByTagName('c')).map(c=>{const value=c.getElementsByTagName('v')[0]?.textContent||c.getElementsByTagName('t')[0]?.textContent||'';return c.getAttribute('t')==='s'?strings[Number(value)]:value;}).join('\t')).join('\n');
      }else {
        pre.textContent=t('压缩包内容（点击条目查看）：');
        for(const entry of Object.values(zip.files).filter(x=>!x.dir)) {
          const button=document.createElement('button');button.textContent=entry.name;button.onclick=async()=>{const text=await entry.async('string');pre.textContent=text.slice(0,300000);};preview.append(button);
        }
      }
      return;
    }
    if(['png','pdf','html'].includes(suffix||'')) {
      currentUrl=URL.createObjectURL(new Blob([file],{type:suffix==='pdf'?'application/pdf':suffix==='png'?'image/png':'text/html'}));
      const frame=document.createElement('iframe');frame.src=currentUrl;frame.title=file.name;frame.setAttribute('sandbox','allow-scripts');preview.append(frame);return;
    }
    const bytes=await file.slice(0,300000).arrayBuffer();const prefix=new Uint8Array(bytes);
    const pre=document.createElement('pre');pre.textContent=new TextDecoder(prefix[0]===255&&prefix[1]===254?'utf-16le':'utf-8').decode(bytes);preview.append(pre);
    if(file.size>300000){const note=document.createElement('p');note.textContent=t('文本预览仅显示前 300 KB；完整文件保存在导出目录。');preview.append(note);}
  }
  async function walk(dir:Directory,path='') {
    const entries:Entry[]=[];for await(const entry of dir.values!())entries.push(entry);
    entries.sort((a,b)=>a.name.localeCompare(b.name));
    for(const entry of entries) {
      if(entry.kind!=='file')await walk(entry,path+entry.name+'/');
      else {const file=await entry.getFile(),button=document.createElement('button');button.textContent=`${path}${entry.name} (${file.size.toLocaleString()} B)`;button.onclick=()=>{void show(file).catch(e=>{preview.textContent=String(e);});};list.append(button);}
    }
  }
  try{await walk(handle);}catch(e){list.textContent=t("读取目录失败：${1}",String(e));}
}

import fs from 'node:fs/promises';import OpenCC from 'opencc-js';
const convert=OpenCC.Converter({from:'cn',to:'tw'});
const data=Object.fromEntries(['zh-Hans','zh-Hant','en','fr','ja','ko'].map(k=>[k,{}]));
for(const row of (await fs.readFile('scripts/translations.tsv','utf8')).trim().split('\n')){
 const [key,en,fr,ja,ko]=row.split('\t');if(!key||[en,fr,ja,ko].some(x=>!x))throw Error('Incomplete translation: '+key);
 for(const [lang,value] of Object.entries({'zh-Hans':key,'zh-Hant':convert(key),en,fr,ja,ko}))data[lang][key]=value;
}
data['zh-Hans'].Outfit='装配体';data['zh-Hant'].Outfit='組裝體';data['zh-Hans'].Parts='独立零件';data['zh-Hant'].Parts='獨立零件';data['zh-Hans']['A Multi Page PDF']='多页 PDF';data['zh-Hant']['A Multi Page PDF']='多頁 PDF';data['zh-Hans']['A Single Page PDF']='单页 PDF';data['zh-Hant']['A Single Page PDF']='單頁 PDF';
const manifest=JSON.parse(await fs.readFile('extension.json','utf8'));
for(const [lang,values] of Object.entries(data)){
 await fs.writeFile(`locales/${lang}.json`,JSON.stringify(values,null,2)+'\n');
 const fields=[manifest.displayName,manifest.description,'批量导出','多子板一键导出…'];const mapped={};for(const key of fields)mapped[key]=key.endsWith('…')?values[key.slice(0,-1)]+'…':values[key]||key;
 await fs.writeFile(`locales/extensionJson/${lang}.json`,JSON.stringify(mapped,null,2)+'\n');
}
await fs.writeFile('src/locale-data.ts','// Generated from scripts/translations.tsv by npm run locales.\nexport const dictionaries:Record<string,Record<string,string>>='+JSON.stringify(data)+';\n');
console.log(Object.keys(data.en).length+' messages × 6 languages');

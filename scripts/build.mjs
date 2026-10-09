import { build } from 'esbuild';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
const manifest = JSON.parse(await fs.readFile('extension.json', 'utf8'));
await fs.mkdir('dist', { recursive: true });
await fs.mkdir('build/dist', { recursive: true });
await build({ entryPoints: ['src/index.ts'], bundle: true, format: 'iife', globalName: 'edaEsbuildExportName', outfile: 'dist/index.js', target: 'es2020' });
const ui = await build({entryPoints:['src/ui.ts'], bundle:true, format:'iife', write:false, target:'es2020'});
const html = (await fs.readFile('src/ui.html','utf8')).replace('/* BUNDLED_CSS */',await fs.readFile('src/ui.css','utf8')).replace('/* BUNDLED_APP */', ui.outputFiles[0].text.replaceAll('</script', '<\\/script'));
await fs.writeFile('iframe/index.html', html);
const zip = new JSZip();
for (const name of ['extension.json','dist/index.js','iframe/index.html','images/logo.png','LICENSE','NOTICE','README.md','CHANGELOG.md','THIRD_PARTY_NOTICES.md','PUBLISHING.md','examples/production-config.json']) zip.file(name, await fs.readFile(name));
for(const lang of ['zh-Hans','zh-Hant','en','fr','ja','ko'])for(const part of ['', 'extensionJson/']){const name=`locales/${part}${lang}.json`;zip.file(name,await fs.readFile(name));}
for (const name of ['overview.jpg','export-options.jpg']) {
  const path = `images/demo/${name}`;
  zip.file(path, await fs.readFile(path));
}
const output = `build/dist/${manifest.name}_v${manifest.version}.eext`;
await fs.writeFile(output, await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log(`安装包：${output}`);

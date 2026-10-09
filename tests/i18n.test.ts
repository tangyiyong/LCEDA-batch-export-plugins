import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
import {LANGUAGES,setLanguage,getLanguage,resolveLanguage,t} from '../src/i18n.ts';
import {dictionaries} from '../src/locale-data.ts';
import {FIELDS,LABELS,assertRoot,safeName,joinPath} from '../src/config.ts';
test('六语言完整覆盖界面、字段、提示和错误；占位符保持一致',()=>{
 const required=new Set<string>();
 for(const file of ['ui.ts','exporter.ts','config.ts','directory.ts','directory-view.ts','file-dialog.ts']){
  const source=fs.readFileSync('src/'+file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  const visit=(n:ts.Node)=>{if(ts.isCallExpression(n)&&n.expression.getText(ast)==='t'&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0]))required.add(n.arguments[0].text);ts.forEachChild(n,visit);};visit(ast);
 }
 for(const v of Object.values(LABELS))if(/[\u4e00-\u9fff]/.test(v))required.add(v);
 for(const fields of Object.values(FIELDS))for(const f of fields){required.add(f.label);if(f.hint)required.add(f.hint);}
 const html=fs.readFileSync('src/ui.html','utf8');for(const match of html.matchAll(/data-i18n(?:-placeholder|-label)?="([^"]+)"/g))required.add(match[1].replaceAll('&quot;','"'));
 for(const key of required)for(const lang of Object.keys(LANGUAGES)){assert.ok(dictionaries[lang][key],`${lang} missing: ${key}`);assert.deepEqual(dictionaries[lang][key].match(/\$\{\d+\}/g)?.sort()||[],key.match(/\$\{\d+\}/g)?.sort()||[],`${lang} placeholders: ${key}`);}
});
test('语言识别、回退及参数只替换一次，工程名称不会被翻译',()=>{
 assert.equal(resolveLanguage('zh-TW'),'zh-Hant');assert.equal(resolveLanguage('zh-CN'),'zh-Hans');assert.equal(resolveLanguage('fr-FR'),'fr');assert.equal(resolveLanguage('ko-KR'),'ko');assert.equal(resolveLanguage('de-DE'),'en');
 setLanguage('en');assert.equal(t('网表文件'),'Netlist file');assert.equal(t('已保存 ${1}','关闭${2}'),'Saved 关闭${2}');
 setLanguage('ja');assert.equal(t('网表文件'),'ネットリスト');setLanguage('zh-Hans');assert.equal(getLanguage(),'zh-Hans');
});
test('Windows 盘符、UNC、macOS 路径及非 ASCII 文件名',()=>{
 for(const root of ['C:\\生产资料','D:/PCB output','\\\\server\\share\\输出','/Users/test/生产资料'])assert.doesNotThrow(()=>assertRoot(root));
 for(const root of ['C:relative','relative/folder','\\single',''])assert.throws(()=>assertRoot(root));
 assert.equal(joinPath('\\\\server\\share\\输出\\','bom','日本語.xlsx'),'\\\\server\\share\\输出\\bom\\日本語.xlsx');
 assert.equal(safeName('NUL.txt'),'_NUL.txt');assert.equal(safeName('COM9'),'_COM9');assert.equal(safeName('한국어 / 日本語'),'한국어 _ 日本語');
});

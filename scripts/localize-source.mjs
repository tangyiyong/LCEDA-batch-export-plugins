import ts from 'typescript';import fs from 'node:fs';
for(const file of ['ui.ts','exporter.ts','directory-view.ts','directory.ts','file-dialog.ts','config.ts']) {
 const path='src/'+file;let source=fs.readFileSync(path,'utf8');const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);const changes=[];
 const visit=n=>{
  if((ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))&&/[\u4e00-\u9fff]/.test(n.text)) {
   // Configuration labels/default values remain stable data. Translate at presentation sites.
   if(file==='config.ts'&&!hasErrorParent(n))return;
   if(ts.isPropertyAssignment(n.parent)&&n.parent.name?.getText(ast)==='title'&&file==='ui.ts')return;
   changes.push([n.getStart(ast),n.end,`t(${n.getText(ast)})`]);return;
  }
  if(ts.isTemplateExpression(n)&&/[\u4e00-\u9fff]/.test(n.getText(ast))) {
   if(file==='config.ts'&&!hasErrorParent(n))return;
   let key=n.head.text;const args=[];for(const [i,span] of n.templateSpans.entries()){key+='${'+(i+1)+'}'+span.literal.text;args.push(span.expression.getText(ast));}
   changes.push([n.getStart(ast),n.end,`t(${JSON.stringify(key)},${args.join(',')})`]);return;
  }
  ts.forEachChild(n,visit);
 };
 function hasErrorParent(n){let p=n.parent;while(p){if(ts.isCallExpression(p)&&p.expression.getText(ast)==='Error')return true;p=p.parent;}return false;}
 visit(ast);for(const [start,end,replacement] of changes.sort((a,b)=>b[0]-a[0]))source=source.slice(0,start)+replacement+source.slice(end);
 fs.writeFileSync(path,"import { t } from './i18n.ts';\n"+source);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { directoryApi } from '../src/directory.ts';
import type { Api } from '../src/exporter.ts';
function folder(name:string) {
  const children=new Map<string,ReturnType<typeof folder>>(),files=new Map<string,Blob>();
  const handle={name,children,files,
    async getDirectoryHandle(n:string,o?:{create?:boolean}):Promise<typeof handle> {if(files.has(n))throw new DOMException('file','TypeMismatchError');if(!children.has(n)){if(!o?.create)throw new DOMException('missing','NotFoundError');children.set(n,folder(n));}return children.get(n)!;},
    async getFileHandle(n:string,o?:{create?:boolean}) {if(children.has(n))throw new DOMException('folder','TypeMismatchError');if(!files.has(n)){if(!o?.create)throw new DOMException('missing','NotFoundError');files.set(n,new Blob());}return {async createWritable(){let data:Blob;return {async write(b:Blob){data=b;},async close(){files.set(n,data);},async abort(){}};}};},
  };return handle;
}
test('目录授权适配器创建分类目录、写入文件且不覆盖，并阻止目录逃逸',async()=>{
  const dir=folder('output'),{api,root}=directoryApi({sys_FileSystem:{}} as Api,dir),fs=api.sys_FileSystem;
  assert.equal(await fs.existsPathInFileSystem(root),true);
  assert.equal(await fs.existsPathInFileSystem(root+'/bom'),false);
  assert.equal(await fs.createDirectoryInFileSystem(root+'/bom'),true);
  assert.equal(await fs.existsPathInFileSystem(root+'/bom'),true);
  assert.equal(await fs.saveFileToFileSystem(root+'/bom/MAIN.xlsx',new Blob(['original']),undefined,false),true);
  assert.equal(await fs.saveFileToFileSystem(root+'/bom/MAIN.xlsx',new Blob(['replacement']),undefined,false),false);
  assert.equal(await dir.children.get('bom')!.files.get('MAIN.xlsx')!.text(),'original');
  await assert.rejects(fs.createDirectoryInFileSystem(root+'/../outside'),/非法路径/);
  await assert.rejects(fs.existsPathInFileSystem('/elsewhere'),/超出授权/);
});
test('目录适配器传播写入权限错误',async()=>{
  const dir=folder('output');dir.getDirectoryHandle=async()=>{throw new DOMException('denied','NotAllowedError');};
  const {api,root}=directoryApi({sys_FileSystem:{}} as Api,dir);
  await assert.rejects(api.sys_FileSystem.createDirectoryInFileSystem(root+'/bom'),{name:'NotAllowedError'});
});

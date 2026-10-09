import { t } from './i18n.ts';
export const KINDS = ['gerber','pickplace','bom','odb','ipc356','flyingprobe','model3d','shell3d','dxf','pdf','png','ibom','testpoint','pcbinfo','netlist','dsn','altium','pads','disa'] as const;
export type Kind = typeof KINDS[number];
export const LABELS: Record<Kind,string>={gerber:'PCB制板文件(Gerber)',pickplace:'坐标文件(CPL)',bom:'物料清单(BOM)',odb:'ODB++',ipc356:'IPC-D-356A',flyingprobe:'飞针测试文件',model3d:'3D文件',shell3d:'3D外壳文件',dxf:'DXF',pdf:'PDF',png:'PNG',ibom:'交互式BOM',testpoint:'测试点报告',pcbinfo:'PCB 信息',netlist:'网表文件',dsn:'自动布线(DSN)',altium:'Altium Designer',pads:'PADS',disa:'T/DISA 4001'};
export const MANUAL_KINDS:Kind[]=['png','disa'];
export const EXPORT_METHODS:Partial<Record<Kind,string>>={gerber:'getGerberFile',bom:'getBomFile',pickplace:'getPickAndPlaceFile',odb:'getOpenDatabaseDoublePlusFile',ipc356:'getIpcD356AFile',flyingprobe:'getFlyingProbeTestFile',model3d:'get3DFile',shell3d:'get3DShellFile',dxf:'getDxfFile',pdf:'getPdfFile',ibom:'getInteractiveBomFile',testpoint:'getTestPointFile',pcbinfo:'getPcbInfoFile',netlist:'getNetlistFile',dsn:'getDsnFile',altium:'getAltiumDesignerFile',pads:'getPadsFile'};
export const SUFFIX:Partial<Record<Kind,string>>={gerber:'zip',odb:'zip',ipc356:'356a',flyingprobe:'zip',dxf:'dxf',pdf:'pdf',png:'png',ibom:'html',pcbinfo:'txt',dsn:'dsn',altium:'PcbDoc',pads:'asc',disa:'zip'};
export type Field = { key: string; label: string; type: 'boolean' | 'select' | 'number' | 'text' | 'json'; values?: string[]; hint?: string; optional?: boolean; min?: number; max?: number; schema?: Schema };
type Schema = 'string' | 'boolean' | 'number' | 'stringOrBoolean' | { enum: readonly unknown[] } | { array: Schema } | { object: Record<string, Schema>; optional?: string[] };
const strList: Schema = {array:'string'};
export const GERBER_OBJECTS = ['Pad','Via','Track','Text','Image','Dimension','BoardOutline','BoardCutout','CopperFilled','SolidRegion','FPCStiffener','Line','PlaneZone','ComponentProperty','ComponentSilkscreen','TearDrop'];
export const LAYERS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,...Array.from({length:30},(_,i)=>15+i),47,48,49,50,51,52,53,54,55,56,57,58,59,101,...Array.from({length:30},(_,i)=>71+i)];
const layerSchema = (mirror: string): Schema => ({array:{object:{layerId:{enum:LAYERS},[mirror]:'boolean'}}});
export const FIELDS: Record<Kind, Field[]> = {
  gerber: [
    {key:'colorSilkscreen', label:'彩色丝印制造文件',type:'boolean'},
    {key:'unit',label:'单位',type:'select',values:['mm','inch']},
    {key:'integerNumber',label:'整数位数',type:'number',min:1,max:6},
    {key:'decimalNumber',label:'小数位数',type:'number',min:1,max:6},
    ...[['metallicDrillingInformation','金属化钻孔'],['nonMetallicDrillingInformation','非金属化钻孔'],['drillTable','钻孔表'],['flyingProbeTestingFile','飞针测试文件']].map(([key,label])=>({key,label,type:'boolean' as const})),
    {key:'layers',label:'自定义图层 JSON',type:'json',optional:true,schema:layerSchema('isMirror'),hint:'留空使用每块板的实际生产图层；示例 [{"layerId":1,"isMirror":false},{"layerId":11,"isMirror":false}]。自定义时请包含所需铜层、阻焊、丝印及钻孔层(56)。'},
    {key:'objects',label:'导出对象 JSON',type:'json',optional:true,schema:{array:{enum:GERBER_OBJECTS}},hint:'留空使用官方生产对象；示例 ["Pad","Via","Track","BoardOutline"]'},
  ],
  bom: [
    {key:'fileType',label:'文件格式',type:'select',values:['xlsx','csv']},
    {key:'template',label:'BOM 模板名称',type:'text',optional:true,hint:'留空使用编辑器默认模板；模板须在目标客户端存在。'},
    {key:'filterOptions',label:'过滤规则 JSON',type:'json',optional:true,schema:{array:{object:{property:'string',includeValue:'stringOrBoolean'}}},hint:'例如 [{"property":"Add into BOM","includeValue":"yes"}]；留空沿用编辑器默认。'},
    {key:'statistics',label:'统计项 JSON',type:'json',optional:true,schema:strList,hint:'例如 ["No.","Quantity"]'},
    {key:'property',label:'属性列 JSON',type:'json',optional:true,schema:strList,hint:'例如 ["Designator","Footprint","Value","Supplier Part"]'},
    {key:'columns',label:'列标题、排序与分组 JSON',type:'json',optional:true,schema:{array:{object:{property:'string',title:'string',sort:{enum:[null,'asc','desc']},group:{enum:[null,'Yes','No']},orderWeight:'number'},optional:['title','sort','group','orderWeight']}},hint:'例如 [{"property":"Designator","title":"位号","sort":"asc","group":"No","orderWeight":10}]'},
  ],
  dxf: [
    {key:'layers',label:'导出图层 JSON',type:'json',optional:true,schema:layerSchema('mirror'),hint:'默认仅板框(11)；留空沿用编辑器默认。例如 [{"layerId":11,"mirror":false},{"layerId":14,"mirror":false}]'},
    {key:'objects',label:'导出对象 JSON',type:'json',optional:true,schema:strList,hint:'留空使用编辑器默认对象；对象名称遵循 EDA DXF 接口。'},
  ],
  netlist: [{key:'netlistType',label:'网表格式',type:'select',values:['JLCEDA','EasyEDA','Protel2','PADS','Allegro','DISA','DSNET']}],
  pickplace: [{key:'fileType',label:'文件格式',type:'select',values:['xlsx','csv']},{key:'unit',label:'坐标单位',type:'select',values:['mm','mil']}],
  testpoint: [{key:'fileType',label:'文件格式',type:'select',values:['xlsx','csv']}],
  odb:[{key:'unit',label:'单位',type:'select',values:['mm','inch']},...['metallizedDrilledHoles','nonMetallizedDrilledHoles','drillTable','flyingProbeTestFile'].map((key,i)=>({key,label:['金属化钻孔','非金属化钻孔','钻孔表','飞针测试文件'][i],type:'boolean' as const})),{key:'layers',label:'图层 JSON',type:'json',optional:true,schema:layerSchema('mirror')},{key:'objects',label:'对象 JSON',type:'json',optional:true,schema:{array:{object:{objectName:'string'}}}}],
  model3d:[{key:'fileType',label:'文件格式',type:'select',values:['step','obj']},{key:'element',label:'导出元素 JSON',type:'json',schema:{array:{enum:['Component Model','Via','Silkscreen','Wire In Signal Layer']}}},{key:'modelMode',label:'模型方式',type:'select',values:['Outfit','Parts']},{key:'autoGenerateModels',label:'自动生成缺失模型',type:'boolean'}],
  shell3d:[{key:'fileType',label:'文件格式',type:'select',values:['stl','step','obj']}],
  pdf:[{key:'outputMethod',label:'输出方式',type:'select',values:['A Multi Page PDF','A Single Page PDF']},{key:'contentConfig',label:'内容配置 JSON',type:'json',schema:{object:{displayAttributesAsMenu:'boolean',showOutlineOnly:'boolean'}}},{key:'watermark',label:'水印配置 JSON',type:'json',optional:true,schema:{object:{show:'boolean',content:'string',styleConfig:{object:{color:'string',transparency:{enum:['Opaque','75%','50%','25%']},font:'string',fontSize:{object:{unit:{enum:['inch','mil','mm']},value:'number'}},style:{object:{bold:'boolean',italic:'boolean',underline:'boolean'}},slope:{enum:[0,45,90]},denseness:{enum:['Single','Sparse','Std','Dense']}}}},optional:['show','content','styleConfig']}},{key:'graphPageConfig',label:'图页配置 JSON',type:'json',optional:true,schema:{array:{object:{checked:'boolean',name:'string'}}}}],
  ipc356:[],flyingprobe:[],png:[],ibom:[],pcbinfo:[],dsn:[],altium:[],pads:[],disa:[],
};
export type Options = Record<string, unknown>;
export type Profile = {schema:'lceda-batch-export';version:1;name:string;selectedKinds:Kind[];options:Record<Kind,Options>};
export function defaultProfile(): Profile {
  return {schema:'lceda-batch-export',version:1,name:'生产与测试',selectedKinds:['gerber','bom','dxf','netlist'],options:{
    gerber:{colorSilkscreen:false,unit:'mm',integerNumber:4,decimalNumber:5,metallicDrillingInformation:true,nonMetallicDrillingInformation:true,drillTable:true,flyingProbeTestingFile:true},
    odb:{unit:'mm',metallizedDrilledHoles:true,nonMetallizedDrilledHoles:true,drillTable:true,flyingProbeTestFile:true},model3d:{fileType:'step',element:['Component Model','Via','Silkscreen','Wire In Signal Layer'],modelMode:'Outfit',autoGenerateModels:false},shell3d:{fileType:'step'},pdf:{outputMethod:'A Multi Page PDF',contentConfig:{displayAttributesAsMenu:true,showOutlineOnly:false}},ipc356:{},flyingprobe:{},png:{},ibom:{},pcbinfo:{},dsn:{},altium:{},pads:{},disa:{},bom:{fileType:'xlsx'},dxf:{layers:[{layerId:11,mirror:false}]},netlist:{netlistType:'JLCEDA'},pickplace:{fileType:'csv',unit:'mm'},testpoint:{fileType:'csv'},
  }};
}
function record(v:unknown): v is Record<string,unknown> { return v!==null && typeof v==='object' && !Array.isArray(v); }
function validateSchema(v:unknown,s:Schema,path:string):void {
  if(s==='stringOrBoolean') {if(typeof v!=='string'&&typeof v!=='boolean') throw Error(t("${1} 类型应为 string 或 boolean",path));return;}
  if(typeof s==='string') {if(typeof v!==s || (s==='number' && !Number.isFinite(v))) throw Error(t("${1} 类型应为 ${2}",path,s));return;}
  if('enum' in s) {if(!s.enum.includes(v)) throw Error(t("${1} 的值不受支持",path));return;}
  if('array' in s) {if(!Array.isArray(v) || v.length>256) throw Error(t("${1} 必须是最多 256 项的数组",path));v.forEach((x,i)=>validateSchema(x,s.array,`${path}[${i}]`));return;}
  if(!record(v)) throw Error(t("${1} 必须是对象",path));
  for(const k of Object.keys(v)) if(!(k in s.object) || ['__proto__','constructor','prototype'].includes(k)) throw Error(t("${1}.${2} 是未知字段",path,k));
  for(const [k,t] of Object.entries(s.object)) {if(v[k]===undefined && s.optional?.includes(k)) continue;validateSchema(v[k],t,`${path}.${k}`);}
}
export function validateOptions(kind:Kind,v:unknown): Options {
  if(!record(v)) throw Error(t("${1} 配置必须是对象",t(LABELS[kind])));
  const out:Options={};
  for(const k of Object.keys(v)) if(!FIELDS[kind].some(f=>f.key===k)) throw Error(t("${1}.${2} 是未知选项",kind,k));
  for(const f of FIELDS[kind]) {
    const value=v[f.key]; if(value===undefined && f.optional) continue;
    const path=`${t(LABELS[kind])} / ${t(f.label)}`;
    if(f.type==='json') validateSchema(value,f.schema!,path);
    else if(f.type==='select') {if(!f.values?.includes(value as string)) throw Error(t("${1} 的值不受支持",path));}
    else if(f.type==='number') {if(typeof value!=='number'||!Number.isInteger(value)||value<f.min!||value>f.max!) throw Error(t("${1} 必须是 ${2}–${3} 的整数",path,f.min,f.max));}
    else if(typeof value!== (f.type==='text'?'string':'boolean')) throw Error(t("${1} 类型错误",path));
    if(typeof value==='string' && value.length>256) throw Error(t("${1} 过长",path));
    out[f.key]=value;
  }
  return out;
}
export function parseProfile(v:unknown):Profile {
  if(typeof v==='string') {if(v.length>1_000_000) throw Error(t('配置文件超过 1 MB'));v=JSON.parse(v);}
  if(!record(v)||v.schema!=='lceda-batch-export'||v.version!==1) throw Error(t('不是兼容的批量导出配置（需要 schema=lceda-batch-export、version=1）'));
  if(typeof v.name!=='string'||v.name.length>100) throw Error(t('配置名称必须是 100 字以内的文本'));
  if(!Array.isArray(v.selectedKinds)||v.selectedKinds.some(k=>!KINDS.includes(k))) throw Error(t('包含未知的导出文件类型'));
  if(!record(v.options)) throw Error(t('缺少 options 配置'));
  const options={} as Record<Kind,Options>;
  for(const k of KINDS) options[k]=validateOptions(k,v.options[k]??defaultProfile().options[k]);
  for(const k of Object.keys(v.options)) if(!KINDS.includes(k as Kind)) throw Error(t("未知的文件类型 ${1}",k));
  return {schema:'lceda-batch-export',version:1,name:v.name,selectedKinds:[...new Set(v.selectedKinds)] as Kind[],options};
}
export function safeName(name:string):string {
  let result=name.normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/[. ]+$/g,'').trim().slice(0,100);
  if(!result||result==='.'||result==='..') result='board';
  if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(result)) result=`_${result}`;
  return result;
}
export function joinPath(root:string,...parts:string[]):string {
  const separator=root.includes('\\')?'\\':'/';
  return root.replace(/[\\/]+$/,'')+separator+parts.join(separator);
}
export function assertRoot(root:string):void {
  if(!root || !(/^(\/|[a-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/i.test(root)) || /[\u0000-\u001f]/.test(root)) throw Error(t('请选择或填写绝对路径作为导出根目录'));
}

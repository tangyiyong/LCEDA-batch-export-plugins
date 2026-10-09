"""Read back actual outputs without modifying manufacturing data. Standard library only."""
from pathlib import Path
import json, zipfile, hashlib, xml.etree.ElementTree as ET, sys
root=Path(sys.argv[1] if len(sys.argv)>1 else 'validation-output/full-run')
boards=['LED_FPC','LED','MAIN','MIC','TOF','PATROL']
ns={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
checks=[]
for board in boards:
    row={'board':board,'files':{}}
    for kind,ext in [('gerber','zip'),('bom','xlsx'),('dxf','dxf'),('netlist','enet'),('pickplace','csv'),('testpoint','csv')]:
        p=root/kind/(board+'.'+ext); data=p.read_bytes();assert data, p
        entry={'path':str(p.relative_to(root)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
        if kind=='gerber':
            with zipfile.ZipFile(p) as z:
                assert z.testzip() is None
                names=z.namelist();assert 'Gerber_TopLayer.GTL' in names and 'Gerber_BoardOutlineLayer.GKO' in names
                entry['entries']=names
        elif kind=='bom':
            with zipfile.ZipFile(p) as z:
                assert z.testzip() is None
                sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
                entry['rows']=len(sheet.findall('.//x:sheetData/x:row',ns));assert entry['rows']>1
        elif kind=='dxf':
            text=data.decode('utf8');assert 'ENTITIES' in text and text.rstrip().endswith('EOF')
            entry['polylines']=text.count('AcDbPolyline');assert entry['polylines']>0
        elif kind=='netlist':
            net=json.loads(data);entry['components']=len(net['components']);entry['keys']=list(net)
        elif kind=='pickplace':
            text=data.decode('utf-16') if data.startswith(b'\xff\xfe') else data.decode('utf8')
            assert text.startswith('Designator');entry['rows']=len(text.splitlines())-1;assert entry['rows']>0
        else:
            text=data.decode('utf8');assert text.startswith('Number,Net,Center X,Center Y,Layer,Hole Size')
            entry['rows']=max(0,len(text.splitlines())-1)
        row['files'][kind]=entry
    checks.append(row)
for kind in ['gerber','bom','dxf','netlist','pickplace']:
    assert len({c['files'][kind]['sha256'] for c in checks})==len(boards),f'{kind}: identical board outputs'
reports=list(root.glob('export-report_*.json'));assert reports
report=json.loads(max(reports,key=lambda p:p.stat().st_mtime).read_text())
assert len(report['results'])==36 and all(r['status']=='success' for r in report['results'])
assert not report['warnings']
byboard={r['board']:r['pcbUuid'] for r in report['results']}
for c in checks:
    assert c['files']['netlist']['components']==c['files']['pickplace']['rows']
    net=json.loads((root/'netlist'/(c['board']+'.enet')).read_text())
    refs={v['props']['Designator'] for v in net['components'].values()}
    text=(root/'pickplace'/(c['board']+'.csv')).read_text(encoding='utf-16')
    placement={line.split('\t')[0].strip('\"') for line in text.splitlines()[1:] if line}
    assert refs==placement,f"{c['board']}: netlist and placement references disagree"
config=json.loads((root/'batch-export-config.json').read_text());assert len(config['selectedKinds'])==6
output={'boards':checks,'successfulFiles':36,'report':str(reports[-1].relative_to(root)),'warnings':report['warnings']}
(root.parent/'content-verification.json').write_text(json.dumps(output,ensure_ascii=False,indent=2))
print(json.dumps({'successfulFiles':36,'boards':boards,'bomRows':{c['board']:c['files']['bom']['rows'] for c in checks},'testPoints':{c['board']:c['files']['testpoint']['rows'] for c in checks}},ensure_ascii=False))

import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {parse3mfFile,parseGrabCADXlsxFile} from '../src/zipImport.js';
function zip(files,compressed=false){
 const locals=[],central=[];let offset=0;
 for(const [name,value] of Object.entries(files)){
  const n=Buffer.from(name),raw=Buffer.from(value,'utf8'),data=compressed?deflateRawSync(raw):raw;
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);
  local.writeUInt16LE(compressed?8:0,8);local.writeUInt32LE(data.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(n.length,26);
  locals.push(local,n,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(compressed?8:0,10);
  c.writeUInt32LE(data.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);
  central.push(c,n);offset+=local.length+n.length+data.length;
 }
 const middle=Buffer.concat(central),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(Object.keys(files).length,8);end.writeUInt16LE(Object.keys(files).length,10);
 end.writeUInt32LE(middle.length,12);end.writeUInt32LE(offset,16);
 return new Blob([...locals,middle,end]);
}
test('3MF fatiado: soma somente pesos da primeira bandeja sem multiplicar massa',async()=>{
 const xml='<root><plate><filament id="1" used_g="12.5"/><filament id="2" used_g="7.5"/></plate><plate><filament used_g="55.0"/></plate></root>';
 const archive=zip({'Metadata/slice_info.config':xml});
 const r=await parse3mfFile(archive);
 assert.equal(r.grams,20);assert.ok(r.warnings.some(w=>w.includes('múltiplas')));
});
test('3MF de geometria pura não inventa custo ou tempo',async()=>{
 const r=await parse3mfFile(zip({'3D/3dmodel.model':'<model/>'}));
 assert.equal(r.grams,null);assert.equal(r.seconds,null);
});
test('XLSX GrabCAD: cabeçalhos compartilhados, massa e tempo',async()=>{
 const strs=['Part','Model Material (g)','Support Material (g)','Build Time'];
 const shared='<sst>'+strs.map(s=>'<si><t>'+s+'</t></si>').join('')+'</sst>';
 const tags=['A','B','C','D'].map((c,i)=>'<c r="'+c+'1" t="s"><v>'+i+'</v></c>').join('');
 const second='<c r="A2" t="inlineStr"><is><t>Peça A</t></is></c><c r="B2"><v>29.5</v></c><c r="C2"><v>9.5</v></c><c r="D2" t="inlineStr"><is><t>2h 15m</t></is></c>';
 const sheet='<worksheet><sheetData><row r="1">'+tags+'</row><row r="2">'+second+'</row></sheetData></worksheet>';
 const xlsx=zip({'xl/sharedStrings.xml':shared,'xl/worksheets/sheet1.xml':sheet},true);
 const r=await parseGrabCADXlsxFile(xlsx);
 assert.equal(r.modelGrams,29.5);assert.equal(r.supportGrams,9.5);assert.equal(r.seconds,8100);
});

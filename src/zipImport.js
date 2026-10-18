import {parseGcode,parseGrabCADReport,asClock,parseDuration,parseNumber} from './slicerAdapters.js';
const td=new TextDecoder('utf-8');
const little=(view,pos,n)=>n===2?view.getUint16(pos,true):view.getUint32(pos,true);
const validName = name=>!name.includes('..')&&!name.startsWith('/')&&!name.includes('\\');
export async function openZip(file){
 if(file.size>70*1024*1024)throw Error('Arquivo compactado acima de 70 MB; exporte o G-code ou um relatório mais compacto.');
 const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let end=-1;
 for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65558);p--){
  if(little(view,p,4)===0x06054b50){end=p;break}
 }
 if(end<0)throw Error('ZIP/3MF/XLSX inválido (diretório central não encontrado).');
 const count=little(view,end+10,2),size=little(view,end+12,4),offset=little(view,end+16,4);
 if(count>1000||size>bytes.length||offset+size>bytes.length)throw Error('Arquivo compactado inválido ou muito complexo.');
 const entries=new Map();let at=offset;
 for(let i=0;i<count;i++){
  if(at+46>bytes.length||little(view,at,4)!==0x02014b50)throw Error('Diretório central ZIP inválido.');
  const method=little(view,at+10,2),flags=little(view,at+8,2);
  const compressed=little(view,at+20,4),uncompressed=little(view,at+24,4);
  const nameLen=little(view,at+28,2),extraLen=little(view,at+30,2),commentLen=little(view,at+32,2);
  const localOffset=little(view,at+42,4);
  const name=td.decode(bytes.subarray(at+46,at+46+nameLen));
  if(validName(name))entries.set(name,{method,flags,compressed,uncompressed,localOffset});
  at+=46+nameLen+extraLen+commentLen;
 }
 return {
  names:[...entries.keys()],
  async getText(name){
   const meta=entries.get(name);if(!meta)return null;
   if(meta.flags&1)throw Error('Arquivo ZIP protegido por senha não é compatível.');
   if(meta.uncompressed>12*1024*1024)throw Error('Metadados maiores que 12 MB. Exporte um relatório CSV ou G-code.');
   if(meta.method!==8&&meta.method!==0)throw Error('Algoritmo de compactação ZIP não suportado.');
   const p=meta.localOffset;
   if(p+30>bytes.length||little(view,p,4)!==0x04034b50)throw Error('Cabeçalho ZIP inválido.');
   const start=p+30+little(view,p+26,2)+little(view,p+28,2);
   if(start+meta.compressed>bytes.length)throw Error('Conteúdo ZIP truncado.');
   const src=bytes.subarray(start,start+meta.compressed);
   let out;
   if(meta.method===0)out=src;
   else if(typeof DecompressionStream!=='undefined'){
    const stream=new Blob([src]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    out=new Uint8Array(await new Response(stream).arrayBuffer());
   }else throw Error('Seu navegador não permite ler este ZIP compactado. Exporte CSV ou G-code.');
   if(out.length>12*1024*1024)throw Error('Conteúdo descompactado acima do limite.');
   return td.decode(out);
  }
 };
}
function unescapeXml(str){return String(str??'').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');}
function xmlAttr(tag,name){const m=tag.match(new RegExp('\\b'+name+'="([^"]*)"','i'));return m?.[1]??null;}
export async function parse3mfFile(file){
 const archive=await openZip(file);
 const gcodeFiles=archive.names.filter(n=>/\.gcode$/i.test(n)&&/(?:metadata\/|plate|slice)/i.test(n));
 const candidates=gcodeFiles.length?gcodeFiles:archive.names.filter(n=>/\.gcode$/i.test(n));
 const warnings=[];
 let gcode=null;
 if(candidates.length){
  gcode=await archive.getText(candidates[0]);
  if(candidates.length>1)warnings.push('Este 3MF possui várias bandejas; apenas '+candidates[0]+' foi analisada. Verifique as demais no fatiador.');
 }
 let result=gcode?parseGcode(gcode):null;
 const sliceInfo=archive.names.find(n=>/slice_info\.config$/i.test(n));
 if(sliceInfo){
  const xml=await archive.getText(sliceInfo);
  const weightTags=[...xml.matchAll(/<filament\b[^>]*\/?>/gi)];
  const weights=weightTags.map(m=>parseNumber(xmlAttr(m[0],'used_g'))).filter(v=>v!==null);
  // used_g applies to a filament on a plate; avoid summing multiple plates.
  const plateBlocks=[...xml.matchAll(/<plate\b[^>]*>[\s\S]*?<\/plate>/gi)];
  const weightsForFirstPlate=plateBlocks.length?
   [...plateBlocks[0][0].matchAll(/<filament\b[^>]*\/?>/gi)].map(m=>parseNumber(xmlAttr(m[0],'used_g'))).filter(v=>v!==null):weights;
  const grams=weightsForFirstPlate.length?weightsForFirstPlate.reduce((a,b)=>a+b,0):null;
  if(!result)result={...asClock(null),kind:'3mf',slicer:'Bambu Studio / OrcaSlicer / PrusaSlicer',grams:null,seconds:null,modelGrams:null,supportGrams:null,totalGrams:null,quantity:null,fields:[],warnings:[],confidence:'parcial',sourceName:'3MF'};
  if((result.grams===null||result.grams===0)&&grams!==null&&grams>0){result.grams=grams;result.fields.push('grams')}
  if(result.seconds===null){
   const plate=plateBlocks[0]?.[0]||xml;
   const estimate=(plate.match(/\b(?:prediction|print_time|estimated_time)="([^"]+)"/i)||[])[1];
   const sec=estimate?parseDuration(estimate):null;
   if(sec!==null){result.seconds=sec;Object.assign(result,asClock(sec));result.fields.push('seconds')}
  }
  if(plateBlocks.length>1)warnings.push('Há múltiplas bandejas no 3MF; foi considerada somente a primeira estimativa.');
 }
 if(!result)result={kind:'3mf',slicer:'3MF não fatiado',grams:null,modelGrams:null,supportGrams:null,totalGrams:null,seconds:null,...asClock(null),quantity:null,fields:[],warnings:[],confidence:'parcial',sourceName:'3MF'};
 if(result.grams===null)warnings.push('Este 3MF não contém massa pós-fatiamento reconhecida. Um modelo 3D, sozinho, não informa consumo de material.');
 if(result.seconds===null)warnings.push('Não encontrei tempo de impressão pós-fatiamento neste 3MF.');
 result.kind='3mf';result.warnings=[...(result.warnings||[]),...warnings];return result;
}
export async function parseGrabCADXlsxFile(file){
 const archive=await openZip(file);
 const sheet=archive.names.find(n=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(n));
 if(!sheet)throw Error('Nenhuma planilha encontrada no XLSX.');
 const xml=await archive.getText(sheet),strings=await archive.getText('xl/sharedStrings.xml');
 const shared=[];
 if(strings){for(const item of strings.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)){
  shared.push(unescapeXml([...item[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map(m=>m[1]).join('')));
 }}
 const rows=[];
 for(const match of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)){
  const row=[];
  for(const c of match[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gi)){
   const ref=xmlAttr(c[1],'r'),column=ref?.match(/^[A-Z]+/i)?.[0].toUpperCase()||'';
   let idx=0;for(const letter of column)idx=idx*26+letter.charCodeAt(0)-64;idx=Math.max(0,idx-1);
   if(idx>150)continue;
   const content=c[2]||'',type=xmlAttr(c[1],'t');
   let value=(content.match(/<v>([\s\S]*?)<\/v>/i)||[])[1];
   if(type==='s')value=shared[Number(value)]||'';
   else if(type==='inlineStr')value=[...content.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gi)].map(m=>m[1]).join('');
   else if(value===undefined)value='';
   row[idx]=unescapeXml(value);
  }
  if(row.some(v=>v!==''&&v!==undefined))rows.push(row);
  if(rows.length>5000)throw Error('Relatório com mais de 5.000 linhas; exporte apenas o resumo como CSV.');
 }
 if(!rows.length)throw Error('Planilha XLSX vazia ou com formato não reconhecido.');
 // TSV escaping retains embedded tabs, newlines and quotations.
 const tsv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join('\t')).join('\n');
 return parseGrabCADReport(tsv);
}

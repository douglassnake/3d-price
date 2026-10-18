// Importadores locais e conservadores. Nenhum arquivo ou conteúdo é enviado à rede.
const clean = s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const positive = n=>Number.isFinite(n)&&n>0;
export function parseNumber(value){
 let s=String(value??'').trim().replace(/\s/g,'');
 if(!s||!/^[+-]?[\d.,]+$/.test(s))return null;
 const c=s.lastIndexOf(','),d=s.lastIndexOf('.');
 if(c>=0&&d>=0)s=c>d?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 else if(c>=0)s=s.replace(',','.');
 const result=Number(s);
 return Number.isFinite(result)&&result>=0?result:null;
}
export function parseDuration(value,{allowBareMinutes=false,twoPart='reject'}={}){
 const source=String(value??'').trim();
 if(!source)return null;
 let m=source.match(/^\s*(\d{1,3}):([0-5]\d)(?::([0-5]\d(?:[.,]\d+)?))?\s*$/);
 if(m){if(!m[3]&&twoPart==='reject')return null;return Number(m[1])*(m[3]||twoPart==='h:mm'?3600:60)+Number(m[2])*(m[3]||twoPart==='h:mm'?60:1)+(m[3]?Number(m[3].replace(',','.')):0)}
 const suffix=/(\d+(?:[.,]\d+)?)\s*(days?|dias?|d|hours?|horas?|hrs?|h|minutes?|mins?|minutos?|min|m|seconds?|segundos?|secs?|sec|s)\b/gi;
 let total=0,last=0,found=false;
 while((m=suffix.exec(source))){const n=parseNumber(m[1]);if(n===null)return null;const unit=m[2].toLowerCase();const mult=/^(?:d|day|dia)/.test(unit)?86400:/^(?:h|hour|hora|hr)/.test(unit)?3600:/^(?:m|min)/.test(unit)?60:1;total+=n*mult;last=suffix.lastIndex;found=true;}
 if(found&&source.slice(last).trim()===''&&total>=0)return total;
 if(allowBareMinutes&&/^\d+(?:[.,]\d+)?$/.test(source))return Number(source.replace(',','.'))*60;
 return null;
}
export function asClock(seconds){
 if(!Number.isFinite(seconds)||seconds<0)return {hours:null,minutes:null};
 const rounded=Math.round(seconds/60);
 return {hours:Math.floor(rounded/60),minutes:rounded%60};
}
export function identifySlicer(text){
 const s=String(text||'').slice(0,200000).toLowerCase();
 if(/\bgrabcad(?:\s+print)?\b|stratasys|tray summary|build report/.test(s))return 'GrabCAD Print';
 if(/\borca(?:slicer)?\b/.test(s))return 'OrcaSlicer';
 if(/\bbambu(?:\s+studio|slicer)\b/.test(s))return 'Bambu Studio';
 if(/\bprusa(?:slicer)?\b/.test(s))return 'PrusaSlicer';
 if(/\bcura(?:_steamengine|engine)?\b/.test(s))return 'Ultimaker Cura';
 return 'Não identificado';
}
export function parseGcode(text){
 const lines=String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(l=>l.startsWith(';'));
 const warnings=[],fields=[];
 let totalWeight=null,otherWeight=null,modelWeight=null,supportWeight=null,seconds=null,fromTotal=false;
 for(const line of lines.slice(0,10000)){
  const m=line.match(/^;\s*([^:=]+?)\s*[:=]\s*(.+)$/);
  if(!m)continue;
  const key=clean(m[1]), val=m[2].trim();
  if(/(?:^|\s)(?:filament|material)(?:\s|$)/.test(key)&&/\b(?:used|weight|mass)\b/.test(key)&&/\b(?:g|gram|grams)\b/.test(key)){
   const weight=parseNumber((val.match(/^[\d.,]+/)||[])[0]);
   if(weight!==null&&weight>0){
    if(/support/.test(key)){supportWeight=weight;fields.push('supportGrams')}
    else if(/\bmodel\b/.test(key)){modelWeight=weight;fields.push('modelGrams')}
    else if(/\btotal\b/.test(key)){totalWeight=weight;fromTotal=true;fields.push('totalGrams')}
    else {otherWeight=weight;fields.push('grams')}
   }
  }
  if(seconds===null||/normal/.test(key)){
   if(key==='time'&&/^\d+(?:\.\d+)?$/.test(val)){seconds=Number(val);fields.push('seconds')}
   else if(/(?:estimated|printing|print)\s*time/.test(key)){
    const duration=parseDuration(val);
    if(duration!==null){seconds=duration;fields.push('seconds')}
   }
  }
 }
 const grams=totalWeight??otherWeight??(modelWeight!==null&&supportWeight!==null?modelWeight+supportWeight:modelWeight);
 if(grams===null)warnings.push('Peso não identificado em gramas. Dados em metros ou cm³ não são convertidos automaticamente.');
 if(seconds===null)warnings.push('Tempo de impressão não encontrado em formato reconhecido.');
 if(supportWeight!==null&&grams!==null)warnings.push('Material de suporte informado. Verifique se já está incluído no peso total para evitar dupla contagem.');
 const clock=asClock(seconds);
 return {kind:'gcode',slicer:identifySlicer(text),grams,modelGrams:modelWeight,supportGrams:supportWeight,totalGrams:totalWeight,seconds,...clock,quantities:null,fields:[...new Set(fields)],warnings,confidence:(grams!==null&&seconds!==null?'alta':'parcial'),sourceName:'G-code',fromTotal};
}
function parseRows(source,delim){
 const rows=[],out=[];let quoted=false,cell='';
 for(let i=0;i<source.length;i++){
  const ch=source[i];
  if(ch==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(ch===delim&&!quoted){out.push(cell.trim());cell='';}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&source[i+1]==='\n')i++;out.push(cell.trim());if(out.some(v=>v!==''))rows.push(out.slice());out.length=0;cell='';}
  else cell+=ch;
 }
 out.push(cell.trim());if(out.some(v=>v!==''))rows.push(out);
 return rows;
}
export function parseCSV(source){
 const text=String(source||'').replace(/^\uFEFF/,'');
 const first=text.split(/\r?\n/).find(l=>l.trim())||'';
 const delimiter=['\t',';',','].map(d=>({d,count:(first.match(new RegExp(d==='\t'?'\\t':d===';'?';':',','g'))||[]).length})).sort((a,b)=>b.count-a.count)[0];
 return parseRows(text,delimiter?.count?delimiter.d:',');
}
const colType=label=>{
 const c=clean(label);
 if(/\b(?:model|part|peca|modelo|build)\b/.test(c)&&/\b(?:material|mass|weight|peso|filament)\b/.test(c)&&/\b(?:g|gram|grams)\b/.test(c))return 'modelGrams';
 if(/\b(?:support|suporte|sr 30|sr 35)\b/.test(c)&&/\b(?:g|gram|grams)\b/.test(c))return 'supportGrams';
 if(/\b(?:total)\b/.test(c)&&/\b(?:g|gram|grams)\b/.test(c))return 'totalGrams';
 if(/\b(?:material|mass|weight|peso|filament)\b/.test(c)&&/\b(?:g|gram|grams)\b/.test(c))return 'grams';
 if(/\b(?:build time|printing time|print time|tempo de impressao|tempo de construcao|duracao)\b/.test(c))return 'duration';
 if(/\b(?:quantity|quantidade|qty|copies|pecas)\b/.test(c))return 'quantity';
 if(/\b(?:cm3|cc|in3)\b/.test(c)&&/\b(?:volume|material|support|model)\b/.test(c))return 'volume';
 return null;
};
function makeResult({modelGrams=null,supportGrams=null,totalGrams=null,grams=null,seconds=null,quantity=null,fields=[],warnings=[],volumes=[]}){
 const weight=totalGrams??grams??(modelGrams!==null&&supportGrams!==null?modelGrams+supportGrams:modelGrams);
 if(weight===null)warnings.push('Não há massa em gramas confirmada. Para volumes, informe a densidade do material ou digite o peso.');
 if(seconds===null)warnings.push('Tempo do trabalho não encontrado. Preencha a duração manualmente.');
 if(supportGrams!==null&&(totalGrams!==null||grams!==null))warnings.push('O suporte pode estar incluído no total de material. Confira os campos antes da aplicação.');
 return {kind:'grabcad',slicer:'GrabCAD Print',sourceName:'Relatório de estimativa',grams:weight,modelGrams,supportGrams,totalGrams,seconds,...asClock(seconds),quantity,volumes,fields:[...new Set(fields)],warnings,confidence:weight!==null&&seconds!==null?'alta':'parcial'};
}
export function parseGrabCADReport(source){
 const text=String(source||'').slice(0,1024*1024), rows=parseCSV(text);
 let headerIndex=rows.findIndex(r=>r.filter(h=>colType(h)&&colType(h)!=='quantity').length>=2);
 const warnings=[],fields=[],volumes=[];
 if(headerIndex>=0&&rows.length>headerIndex+1){
  const types=rows[headerIndex].map(colType);
  const candidates=rows.slice(headerIndex+1).filter(r=>r.some(c=>c.trim())&&r.some((v,i)=>['grams','modelGrams','supportGrams','totalGrams'].includes(types[i])&&parseNumber(v)!==null));
  const totals=candidates.filter(r=>r.some(c=>/^(?:total|tray total|grand total|summary|resumo|soma)$/i.test(c.trim())));
  const selected=totals.length?totals.slice(-1):candidates;
  let result={grams:null,modelGrams:null,supportGrams:null,totalGrams:null,seconds:null,quantity:null};
  for(const row of selected){
   for(let i=0;i<types.length;i++){
    const type=types[i],raw=row[i]??'';
    if(!type)continue;
    if(type==='duration'){
     const value=parseDuration(raw,{allowBareMinutes:/minutes|minutos/.test(clean(rows[headerIndex][i])),twoPart:/hh\s*mm|hora|hour/.test(clean(rows[headerIndex][i]))?'h:mm':'reject'});
     if(value!==null){if(selected.length===1)result.seconds=value;else warnings.push('Tempo por peça/lote não foi somado: imprima simultaneamente? Informe o tempo total estimado da bandeja.')}
    }else if(type==='volume')volumes.push({column:rows[headerIndex][i],value:raw});
    else if(type==='quantity'){const count=parseNumber(raw);if(selected.length===1&&count!==null)result.quantity=count;}
    else {const value=parseNumber(raw);if(value!==null){result[type]=(result[type]??0)+value;fields.push(type)}}
   }
  }
  if(!totals.length&&selected.length>1)warnings.push('Massas de várias linhas somadas apenas quando não havia linha TOTAL. Confira se os registros não representam materiais repetidos.');
  if(selected.length)return makeResult({...result,fields,warnings,volumes});
 }
 // Copiar e colar do painel Estimate do GrabCAD ou relatório em linhas chave/valor.
 const result={grams:null,modelGrams:null,supportGrams:null,totalGrams:null,seconds:null,quantity:null};
 for(const line of text.split(/\r?\n/).slice(0,5000)){
  const m=line.trim().match(/^(.*?)\s*[:=\t]\s*(.+)$/);
  if(!m)continue;
  const key=clean(m[1]),val=m[2].trim();let type=colType(m[1]);
  if(!type&&/\b(?:material|filament|filamento|support|suporte)\b/.test(key)&&/\d\s*g\b/i.test(val))type=/support|suporte/.test(key)?'supportGrams':/model|modelo/.test(key)?'modelGrams':'grams';
  if(!type&&/\b(?:material|volume|support|suporte)\b/.test(key)&&/\d\s*(?:cm[³3]|cc|in[³3])\b/i.test(val))type='volume';
  if(type==='duration'){const sec=parseDuration(val,{allowBareMinutes:/minutes|minutos/.test(key),twoPart:/hh\s*mm|hora|hour/.test(key)?'h:mm':'reject'});if(sec!==null){result.seconds=sec;fields.push('seconds')}}
  else if(type==='volume')volumes.push({column:m[1],value:val});
  else if(type==='quantity'){const n=parseNumber(val);if(n!==null){result.quantity=n;fields.push('quantity')}}
  else if(type){const value=parseNumber((val.match(/[\d.,]+/)||[])[0]);if(value!==null){result[type]=value;fields.push(type)}}
 }
 return makeResult({...result,fields,warnings,volumes});
}
export function parseSlicerImport(text,{format='auto',fileName=''}={}){
 const name=String(fileName).toLowerCase();
 const grabcad=format==='grabcad'||(format==='auto'&&(/grabcad|stratasys|build report|tray summary/i.test(String(text).slice(0,250000))||/\.(csv|tsv)$/.test(name)));
 return grabcad?parseGrabCADReport(text):parseGcode(text);
}

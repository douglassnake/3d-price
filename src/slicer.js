// Interpretação conservadora dos metadados textuais de arquivos G-code.
// Nada é executado. Tempos e massas sem unidade verificável são ignorados.
export function parseSlicerMetadata(text){
 const source=String(text||'').slice(0,1024*1024);
 const lines=source.split(/\r?\n/).filter(l=>/^\s*;/.test(l)).slice(0,3000);
 let grams=null,seconds=null,sourceName=null;
 const num=s=>Number(String(s).replace(',','.'));
 for(const line of lines){
  let m=line.match(/;\s*(?:filament used \[g\]|filament_used_g|filament weight|filament used \(g\)|total filament weight)\s*[:=]\s*([\d.,]+)\s*(?:g)?\b/i);
  if(m&&grams===null&&num(m[1])>=0&&Number.isFinite(num(m[1]))){grams=num(m[1]);sourceName='G-code';}
  m=line.match(/;\s*TIME\s*:\s*(\d+(?:\.\d+)?)/i);
  if(m&&seconds===null&&Number.isFinite(num(m[1])))seconds=num(m[1]);
  m=line.match(/;\s*(?:estimated printing time \(normal mode\)|estimated printing time|printing time)\s*[:=]\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i);
  if(m&&seconds===null&&m[0].match(/[dhms]/i)){const [d,h,min,sec]=m.slice(1).map(x=>Number(x||0));const value=d*86400+h*3600+min*60+sec;if(value>0)seconds=value;}
 }
 const out={grams,seconds,hours:seconds===null?null:Math.floor(seconds/3600),minutes:seconds===null?null:Math.round(seconds%3600/60),sourceName};
 if(out.minutes===60){out.hours+=1;out.minutes=0}
 return out;
}

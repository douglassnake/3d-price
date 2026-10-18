import {parseSlicerImport} from './slicerAdapters.js';
import {escapeHTML} from './quotations.js';
const fmt=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(n);
const summary = r=>{
 const rows=[];
 rows.push(['Fatiador identificado',r.slicer]);
 if(r.grams!==null)rows.push(['Material total estimado',fmt(r.grams)+' g']);
 if(r.modelGrams!==null)rows.push(['Material de modelo',fmt(r.modelGrams)+' g']);
 if(r.supportGrams!==null)rows.push(['Material de suporte',fmt(r.supportGrams)+' g']);
 if(r.seconds!==null)rows.push(['Tempo de produção',r.hours+'h '+r.minutes+'min']);
 if(r.quantity!==null)rows.push(['Quantidade informada pelo relatório',String(r.quantity)]);
 for(const v of r.volumes||[])rows.push([v.column,'Volume: '+v.value+' (sem conversão para peso)']);
 return rows.map(([k,v])=>'<div class="slicer-data-row"><span>'+escapeHTML(k)+'</span><strong>'+escapeHTML(v)+'</strong></div>').join('');
};
/**
 * Fluxo local: arquivo de fatiador / CSV GrabCAD / texto de Estimate.
 * O importador nunca envia arquivo ou seu conteúdo para um servidor.
 */
export function initSlicerImport({el,getStore,persist,paintFields,update}){
 const q=id=>el(id);
 let pending=null;
 const title=q('slicerPreviewTitle'),preview=q('slicerPreview'),parts=q('slicerPieces'),message=q('slicerMessage');
 const setMessage=v=>{message.textContent=v};
 const close=()=>{pending=null;preview.hidden=true;q('slicerPreviewData').replaceChildren();q('slicerWarnings').replaceChildren()};
 const analyze=(text,{fileName='',format='auto'}={})=>{
  close();
  const result=parseSlicerImport(text,{fileName,format});
  if(result.grams===null&&result.seconds===null&&!(result.volumes?.length)){
   setMessage('Nenhum peso em gramas ou tempo reconhecido. Verifique o formato ou copie o resumo do fatiador.');
   return;
  }
  pending={result,fileName};
  preview.hidden=false;
  title.textContent='Prévia • '+result.slicer+(fileName?' • '+fileName:'');
  q('slicerPreviewData').innerHTML=summary(result);
  const notes=[...result.warnings];
  if(result.modelGrams!==null&&result.supportGrams!==null&&result.totalGrams===null&&result.grams!==null)
   notes.push('Modelo e suporte serão custeados separadamente. Informe o preço do suporte (R$/kg) antes de salvar.');
  notes.push('O tempo é do trabalho/lote; o peso importado será dividido pela quantidade informada abaixo.');
  q('slicerWarnings').replaceChildren(...notes.map(txt=>{const p=document.createElement('p');p.textContent='⚠ '+txt;return p}));
  parts.value=String(Number.isInteger(result.quantity)&&result.quantity>0?result.quantity:(Number(getStore().draft.quantity)||1));
  q('slicerApply').disabled=result.grams===null&&result.seconds===null;
  setMessage('Confira o resultado e ajuste a quantidade antes de aplicar. Nenhum dado foi alterado ainda.');
  preview.scrollIntoView({behavior:'smooth',block:'nearest'});
 };
 q('slicerButton').addEventListener('click',()=>q('slicerFile').click());
 q('slicerFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
   const format=q('slicerFormat').value;
   const ext=file.name.toLowerCase().split('.').at(-1);
   if(!['gcode','gco','txt','csv','tsv'].includes(ext))throw Error('Formato não aceito. Use G-code, CSV/TSV ou texto. Para XLSX do GrabCAD, exporte ou salve como CSV.');
   if(file.size>200*1024*1024)throw Error('Arquivo acima do limite de 200 MB. Exporte um relatório menor.');
   const text=ext==='gcode'||ext==='gco'
    ?await file.slice(0,400*1024).text()+'\n'+await file.slice(Math.max(0,file.size-1400*1024)).text()
    :await file.slice(0,4*1024*1024).text();
   const resolvedFormat=format==='auto'&&['csv','tsv'].includes(ext)?'grabcad':format;
   analyze(text,{fileName:file.name,format:resolvedFormat});
  }catch(error){close();setMessage('Erro: '+error.message)}
  finally{event.target.value=''}
 });
 q('slicerParsePaste').addEventListener('click',()=>{
  const text=q('slicerPasteText').value.trim();
  if(!text){setMessage('Cole primeiro o resumo copiado do GrabCAD Print.');return}
  analyze(text,{fileName:'Texto colado',format:'grabcad'});
 });
 q('slicerApply').addEventListener('click',()=>{
  if(!pending)return;
  const count=Number(parts.value);
  if(!Number.isSafeInteger(count)||count<1||count>100000){setMessage('Informe uma quantidade inteira entre 1 e 100.000 peças.');return}
  const {result:r,fileName}=pending;
  const draft=getStore().draft;
  if(r.grams!==null){
   // Somente a massa explicitamente identificada como modelo entra no filamento principal
   // quando existe separação distinta e comprovada para o material de suporte.
   const split=r.modelGrams!==null&&r.supportGrams!==null&&r.totalGrams===null;
   const materialMass=split?r.modelGrams:r.grams;
   draft.grams=Number((materialMass/count).toFixed(5));
   draft.quantity=count;
   draft.supportGrams=split?r.supportGrams:0;
  }
  if(r.seconds!==null){draft.hours=r.hours;draft.minutes=r.minutes}
  draft.slicerSource={slicer:r.slicer,fileName,importedAt:new Date().toISOString(),fields:r.fields,confidence:r.confidence};
  if(draft.supportGrams>0&&!(Number(draft.supportPriceKg)>0)){
   getStore().uiMode='advanced';
   window.dispatchEvent(new Event('3dprice:import'));
  }
  paintFields();persist();update();
  const fields=[];
  if(r.grams!==null)fields.push('peso '+fmt(draft.grams)+' g/peça × '+count);
  if(r.seconds!==null)fields.push('tempo '+r.hours+'h '+r.minutes+'min');
  if(draft.supportGrams>0)fields.push('suporte '+fmt(draft.supportGrams)+' g');
  close();
  setMessage('Aplicado: '+fields.join(' • ')+'. '+(draft.supportGrams>0&&!(Number(draft.supportPriceKg)>0)?'ATENÇÃO: defina o preço do suporte em Custos operacionais para liberar a precificação.':'Revise o preço dos materiais antes da venda.'));
 });
 q('slicerCancel').addEventListener('click',()=>{close();setMessage('Importação cancelada. Cálculo preservado.')});
}

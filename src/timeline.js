/**
 * Workflow visual de seis etapas. Move nós existentes; não recria controles,
 * listeners, mecanismos de precificação ou dados persistentes.
 */
export const STEPS=[
 ['Iniciar projeto','Identifique a peça','✦'],
 ['Anexar arquivo','Importe do fatiador','⇧'],
 ['Configurar impressão','Máquina e parâmetros','▣'],
 ['Calcular custos','Insumos e trabalho','⚙'],
 ['Definir preço','Margem e comparação','◈'],
 ['Finalizar','Orçamento e pedido','✓']
];
const make=(tag,klass,html='')=>{
 const e=document.createElement(tag);e.className=klass;e.innerHTML=html;return e;
};
function required(id){const el=document.getElementById(id);if(!el)throw Error('Controle ausente: '+id);return el}
function moveInput(id,to){const el=required(id);to.append(el.closest('label')||el)}
function card(title,desc,icon){
 const p=make('section','panel timeline-main-panel');
 p.innerHTML='<div class="panel-title"><span class="step">'+icon+'</span><div><h2>'+title+'</h2><p>'+desc+'</p></div></div>';
 return p;
}
export function initTimeline({getStore,persist,getCurrent}){
 const root=required('calculator'),columns=root.querySelector('.columns');
 const form=columns.querySelector('.form-stack'),results=columns.querySelector('.result-stack');
 const inputPanels=[...form.children];
 if(inputPanels.length!==3)throw Error('Estrutura antiga da calculadora não reconhecida');
 const store=getStore();
 store.wizard=store.wizard&&typeof store.wizard==='object'?store.wizard:{step:0};
 if(!Number.isInteger(store.wizard.step)||store.wizard.step<0||store.wizard.step>=6)store.wizard.step=0;

 const host=make('div','timeline-layout');host.id='timelineLayout';
 const header=make('div','timeline-heading','<div><div class="eyebrow">SEU PROJETO, PASSO A PASSO</div><h2>Linha do tempo do projeto</h2><p>Avance por cada etapa e volte quando precisar. Seus valores são preservados.</p></div><strong id="timelineCount" class="timeline-progress-count">Etapa 1 de 6</strong>');
 const timeline=make('nav','project-timeline');timeline.setAttribute('aria-label','Etapas do projeto');
 const deck=make('div','timeline-content');
 const areas=[];
 STEPS.forEach((item,i)=>{
  const b=make('button','timeline-node');
  b.type='button';b.dataset.timelineStep=String(i);b.setAttribute('aria-controls','timeline-stage-'+i);
  b.innerHTML='<span class="timeline-symbol" aria-hidden="true">'+item[2]+'</span><span class="timeline-copy"><strong>'+String(i+1).padStart(2,'0')+'. '+item[0]+'</strong><small>'+item[1]+'</small></span>';
  timeline.append(b);
  const stage=make('section','timeline-stage');
  stage.id='timeline-stage-'+i;
  stage.setAttribute('aria-labelledby','timeline-title-'+i);
  stage.innerHTML='<header class="timeline-stage-header"><span class="timeline-stage-icon" aria-hidden="true">'+item[2]+'</span><div><div class="eyebrow">ETAPA '+String(i+1).padStart(2,'0')+' / 06</div><h2 id="timeline-title-'+i+'" tabindex="-1">'+item[0]+'</h2><p>'+item[1]+'</p></div></header>';
  const content=make('div','timeline-stage-body');
  const footer=make('div','timeline-stage-controls');
  const back=make('button','subtle timeline-back','← Voltar');back.type='button';back.dataset.timelineBack='';back.hidden=i===0;
  const tip=make('span','timeline-autosave','◈ Seu progresso é salvo neste navegador');
  const next=make('button',i===5?'secondary':'primary',i===5?'↺ Voltar ao início':i===1?'Continuar sem arquivo →':'Continuar →');
  next.type='button';next.dataset.timelineGo=i===5?'0':String(i+1);
  footer.append(back,tip,next);stage.append(content,footer);deck.append(stage);
  areas.push(content);
 });
 host.append(header,timeline,deck);
 columns.replaceWith(host);

 // 1. Criação do projeto.
 const intro=card('Qual peça vamos produzir?','Nomeie o projeto e informe o cliente, se já existir.','✦');
 const identity=make('div','fields');moveInput('name',identity);moveInput('quoteClient',identity);intro.append(identity);
 intro.append(make('p','timeline-tip','O cliente pode ser informado mais tarde, antes de emitir a proposta.'));
 areas[0].append(intro);

 // 2. Anexar arquivo opcional; preserva análise G-code, 3MF e GrabCAD.
 const importCard=card('Anexar dados do fatiador','Importe ou cole a estimativa; é possível continuar sem arquivo.','⇧');
 const zone=make('button','timeline-dropzone','<span aria-hidden="true">⇧</span><strong>Solte o arquivo aqui</strong><small>ou toque para escolher no dispositivo</small>');
 zone.type='button';zone.id='timelineDropzone';importCard.append(zone);
 importCard.append(required('slicerTitle').closest('.slicer-integration'));
 importCard.append(make('p','timeline-tip','Não tem arquivo? Preencha peso e tempo manualmente na próxima etapa.'));
 areas[1].append(importCard);

 // 3. Máquina, material e tempo: os mesmos campos e eventos originais.
 const conf=card('Configurar impressão','Selecione a impressora, o filamento e os parâmetros reais do lote.','▣');
 const cf=make('div','fields');
 for(const id of ['printer','material','grams','quantity','hours','minutes'])moveInput(id,cf);
 cf.append(required('printerExampleNotice'));conf.append(cf);
 areas[2].append(conf);inputPanels[0].remove();

 // 4. Insumos, depreciação, perdas e mão de obra.
 areas[3].append(inputPanels[1]);
 const labor=card('Seu trabalho também tem custo','Preparação, modelagem, frete e despesas adicionais.','⚙');
 const lf=make('div','fields');
 for(const id of ['laborHours','laborRate','modelingHours','other','shipping'])moveInput(id,lf);
 labor.append(lf);areas[3].append(labor);

 // 5. Margens, taxas, cartões financeiros e memórias.
 const price=card('Definir condições comerciais','Ajuste taxas, impostos, desconto e margem.','◈');
 const pf=make('div','fields');
 for(const id of ['margin','marketplace','payment','taxes','discount'])moveInput(id,pf);
 price.append(pf);areas[4].append(price);inputPanels[2].remove();
 const hero=results.querySelector('.hero');
 const finishActions=hero.querySelector('.hero-actions'),orderControls=hero.querySelector('.order-controls');
 const blocks=[hero,results.querySelector('.breakdown'),required('channelsPanel'),required('lotPanel')];
 for(const block of blocks)areas[4].append(block);
 for(const extra of [...results.children])if(extra!==required('quotePanel'))areas[4].append(extra);

 // 6. Orçamento comercial e pedido: mantidos todos os botões e handlers.
 const recap=make('section','panel timeline-final-summary',
 '<div class="eyebrow">REVISÃO FINAL DO PROJETO</div><h2 id="timelineFinalName">Peça sem nome</h2>'+
 '<div class="timeline-final-stats"><div><span>Quantidade</span><strong id="timelineFinalQty">—</strong></div>'+
 '<div><span>Custo estimado</span><strong id="timelineFinalCost">—</strong></div>'+
 '<div><span>Preço sugerido</span><strong id="timelineFinalPrice">—</strong></div></div>'+
 '<p id="timelineFinalWarning" class="error" role="status"></p>');
 areas[5].append(recap,required('quotePanel'));
 const finish=card('Salvar e compartilhar','Gere a proposta para o cliente ou registre um pedido.','✓');
 finish.append(finishActions,orderControls);areas[5].append(finish);
 const bottom=root.querySelector('.bottom-grid');if(bottom)areas[5].append(bottom);
 areas[5].append(make('p','timeline-privacy','Os anexos são analisados localmente. Seus dados permanecem no navegador deste dispositivo.'));

 const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
 function sync(){
  const draft=store.draft||{},calc=getCurrent();
  required('timelineFinalName').textContent=String(draft.name||'').trim()||'Peça sem nome';
  required('timelineFinalQty').textContent=String(draft.quantity??1)+' peça(s)';
  required('timelineFinalCost').textContent=calc?money(calc.cost):'—';
  required('timelineFinalPrice').textContent=calc?money(calc.suggested):'—';
  required('timelineFinalWarning').textContent=calc?'':'Há campos inválidos. Revise os custos antes de salvar ou exportar.';
 }
 function go(index,{focus=false,save=true}={}){
  if(!Number.isInteger(index)||index<0||index>=STEPS.length)return;
  store.wizard.step=index;
  for(let i=0;i<6;i++){
   const active=i===index;
   deck.children[i].hidden=!active;
   timeline.children[i].classList.toggle('active',active);
   timeline.children[i].classList.toggle('visited',i<index);
   if(active)timeline.children[i].setAttribute('aria-current','step');
   else timeline.children[i].removeAttribute('aria-current');
  }
  required('timelineCount').textContent='Etapa '+String(index+1)+' de 6';
  sync();if(save)persist();
  if(focus){required('timeline-title-'+index).focus({preventScroll:true});host.scrollIntoView({behavior:'smooth',block:'start'})}
 }
 timeline.addEventListener('click',event=>{
  const button=event.target.closest('[data-timeline-step]');
  if(button)go(Number(button.dataset.timelineStep),{focus:true});
 });
 deck.addEventListener('click',event=>{
  if(event.target.closest('[data-timeline-back]'))go(store.wizard.step-1,{focus:true});
  const button=event.target.closest('[data-timeline-go]');
  if(button)go(Number(button.dataset.timelineGo),{focus:true});
 });
 zone.addEventListener('click',()=>required('slicerFile').click());
 zone.addEventListener('dragover',event=>{event.preventDefault();zone.classList.add('drag-over')});
 zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
 zone.addEventListener('drop',event=>{
  event.preventDefault();zone.classList.remove('drag-over');
  const file=event.dataTransfer?.files?.[0];if(!file)return;
  if(!/\.(gcode|gco|txt|csv|tsv|3mf|xlsx)$/i.test(file.name)){
   required('slicerMessage').textContent='Formato não suportado. Use G-code, 3MF fatiado, CSV, TSV, XLSX ou TXT.';return;
  }
  const input=required('slicerFile');input.files=event.dataTransfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 window.addEventListener('3dprice:calculate',sync);
 window.addEventListener('3dprice:import',()=>go(Number(store.wizard?.step)||0,{save:false}));
 window.addEventListener('3dprice:restore-calculation',()=>go(4));
 window.addEventListener('3dprice:new-project',()=>go(0));
 go(store.wizard.step,{save:false});
 return {go,steps:STEPS};
}

import {calculate,compareChannels,money} from './calculator.js';
import {CHANNEL_PRESETS,ORDER_STATUSES,PAYMENT_STATUSES,makeOrder,orderStats,isValidOrder} from './commerce.js';
import {initSlicerImport} from './slicerImportUI.js';
import {compareLots} from './lotPlanner.js';
import {quoteHTML,escapeHTML} from './quotations.js';

export function initV2(api){
 const {el,getStore,getCurrent,persist,update,nav,paintFields,renderSelectors,renderProfiles,uid}=api;
 const store=()=>getStore();
 const q=id=>el(id);
 let modeNote=document.createElement('p');
 modeNote.className='mode-note';
 modeNote.setAttribute('role','note');
 document.querySelector('.heading .row-actions')?.append(modeNote);
 function applyMode(){
  const basic=store().uiMode==='basic';
  document.body.classList.toggle('basic-mode',basic);
  document.querySelectorAll('[data-mode]').forEach(button=>{
   const selected=button.dataset.mode===(basic?'basic':'advanced');
   button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  });
  modeNote.textContent=basic?'Modo básico: custos avançados continuam no cálculo com seus valores cadastrados. Mude para Avançado para revisá-los.':'Modo avançado: configure todos os custos, taxas e despesas fixas.';
 }
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{store().uiMode=b.dataset.mode;persist();applyMode()}));

 function renderChannels(){
  const root=q('channelComparison');if(!root)return;
  const s=store();
  if(!Array.isArray(s.channels))s.channels=CHANNEL_PRESETS.map(x=>({...x}));
  const rows=compareChannels(s.draft,s.channels);
  root.innerHTML=`<div class="channels-head"><span>Canal</span><span>Taxa (%)</span><span>Preço sugerido</span></div>`+
   rows.map((row,i)=>`<div class="channel-row">
   <strong>${escapeHTML(row.name)}</strong><label class="channel-fee"><span class="sr-only">Taxa de ${escapeHTML(row.name)} (%)</span><input type="number" min="0" max="99" step=".1" data-channel-fee="${i}" value="${row.fee}"></label>
   <strong class="${row.valid?'':'invalid'}">${row.valid?money(row.suggested):'Taxa inválida'}</strong></div>`).join('');
  if(!rows.every(r=>r.valid)){const note=document.createElement('p');note.className='hint';note.textContent='A taxa total e a margem devem somar menos de 100%.';root.append(note)}
 }
 q('channelComparison')?.addEventListener('change',event=>{
  const target=event.target.closest('[data-channel-fee]');if(!target)return;
  const idx=Number(target.dataset.channelFee),v=Number(target.value);
  if(Number.isFinite(idx)&&store().channels[idx]&&Number.isFinite(v)&&v>=0&&v<100){store().channels[idx].fee=v;persist()}
  renderChannels();
 });

 function renderLots(){
  const root=q('lotComparison');if(!root)return;
  try {
   const rows=compareLots(store().draft);
   root.innerHTML='<div class="lot-head"><span>Peças</span><span>Lote</span><span>Preço por peça</span></div>'+
     rows.map(item=>`<div class="lot-row"><strong>${item.quantity} un.</strong><strong>${money(item.suggested)}</strong><span>${money(item.perUnit)}</span></div>`).join('');
  }catch(error){root.textContent='Verifique os dados do cálculo para simular lotes.';}
 }
 function quoteData(){return {
  seller:q('quoteSeller').value,
  client:q('quoteClient').value,
  lead:q('quoteLead').value,
  validity:q('quoteValidity').value,
  notes:q('quoteNotes').value
 }}
 const quoteMap={quoteSeller:'seller',quoteClient:'client',quoteLead:'lead',quoteValidity:'validity',quoteNotes:'notes'};
 function applyQuote(){
  for(const [id,key] of Object.entries(quoteMap)){q(id).value=String(store().quote?.[key]??'')}
 }
 for(const [id,key] of Object.entries(quoteMap)){
  q(id)?.addEventListener('input',e=>{store().quote={...store().quote,[key]:e.target.value};persist()});
 }
 function printPage(html){
  const w=window.open('','_blank');
  if(!w){alert('Permita pop-ups para gerar o PDF.');return}
  w.document.open();w.document.write(html);w.document.close();
 }
 q('commercialPdf')?.addEventListener('click',()=>{
  const r=getCurrent();
  if(!r){alert('Corrija os campos do cálculo antes de gerar a proposta.');return}
  printPage(quoteHTML(store().draft,r,quoteData()));
 });
 // Keep the legacy internal report button; the client-facing PDF intentionally hides cost and margin.
 initSlicerImport({el,getStore,persist,paintFields,update});

 function renderOrders(){
  const target=q('ordersList');if(!target)return;
  const list=Array.isArray(store().orders)?store().orders.filter(isValidOrder):[];
  if(!list.length){target.innerHTML='<div class="empty-illustration"><span aria-hidden="true">▤</span><h2>Nenhum pedido ainda</h2><p>Calcule uma peça e selecione “Criar pedido a partir deste cálculo”.</p></div>';return}
  const statusOptions=Object.entries(ORDER_STATUSES),paymentOptions=Object.entries(PAYMENT_STATUSES);
  target.innerHTML=`<div class="orders-summary">${list.length} pedido(s) • Dados locais, sem sincronização automática</div>`+
   `<div class="orders-scroll"><table class="orders-table"><thead><tr><th>Pedido / cliente</th><th>Valor</th><th>Produção</th><th>Pagamento</th><th>Ações</th></tr></thead><tbody>`+
   list.slice().sort((a,b)=>b.created.localeCompare(a.created)).map(o=>{
    const statuses=statusOptions.map(([v,label])=>`<option value="${v}" ${o.status===v?'selected':''}>${label}</option>`).join('');
    const payments=paymentOptions.map(([v,label])=>`<option value="${v}" ${o.paymentStatus===v?'selected':''}>${label}</option>`).join('');
    return `<tr><td><strong>${escapeHTML(o.name)}</strong><small>${escapeHTML(o.client||'Sem cliente')} • ${new Date(o.created).toLocaleDateString('pt-BR')}</small></td>
    <td>${money(o.price)}</td>
    <td><select aria-label="Status do pedido" data-order-status="${escapeHTML(o.id)}">${statuses}</select></td>
    <td><select aria-label="Pagamento" data-order-payment="${escapeHTML(o.id)}">${payments}</select></td>
    <td><button class="secondary" data-order-open="${escapeHTML(o.id)}">Abrir cálculo</button></td></tr>`;
   }).join('')+'</tbody></table></div>';
 }
 function renderDashboard(){
  const stats=orderStats(store().orders);
  q('dashOrders').textContent=String(stats.totalOrders);
  q('dashDelivered').textContent=String(stats.deliveredCount);
  q('dashRevenue').textContent=money(stats.received);
  q('dashProfit').textContent=money(stats.paidEstimatedProfit);
  q('dashboardDetails').innerHTML=`
   <div class="metric-line"><span>Aguardando pagamento ou execução</span><strong>${stats.pendingOrders}</strong></div>
   <div class="metric-line"><span>Pedidos registrados como pagos</span><strong>${stats.paidOrders}</strong></div>
   <div class="metric-line"><span>Valor em propostas</span><strong>${money(stats.proposed)}</strong></div>
   <div class="metric-line"><span>Receita recebida de pedidos entregues</span><strong>${money(stats.deliveredReceived)}</strong></div>`;
  q('dashboardChannels').innerHTML=stats.byChannel.length?stats.byChannel.map(c=>{
   const name=store().channels?.find(x=>x.id===c.channel)?.name||CHANNEL_PRESETS.find(x=>x.id===c.channel)?.name||c.channel;
   return `<div class="metric-line"><span>${escapeHTML(name)} • ${c.orders} pedido(s)</span><strong>${money(c.value)}</strong></div>`;
  }).join(''):'<p>Nenhum pedido cadastrado.</p>';
 }
 q('createOrder')?.addEventListener('click',()=>{
  const r=getCurrent();if(!r){alert('Não é possível criar pedido com cálculo inválido.');return}
  const customer=prompt('Nome do cliente (opcional):',store().quote?.client||'');
  if(customer===null)return;
  const saleChannel=q('orderChannel').value;
  const channel=(store().channels||CHANNEL_PRESETS).find(c=>c.id===saleChannel);
  if(!channel){alert('Canal de venda não encontrado.');return}
  let orderResult;
  try{orderResult=calculate({...store().draft,marketplace:channel.fee})}
  catch(error){alert('Não foi possível precificar este canal: '+error.message);return}
  const order=makeOrder({...store().draft,marketplace:channel.fee},orderResult,{client:customer.trim().slice(0,100),channel:saleChannel},uid());
  store().orders.push(order);persist();renderDashboard();renderOrders();nav('orders');
 });
 q('ordersList')?.addEventListener('change',event=>{
  const input=event.target, id=input.dataset.orderStatus||input.dataset.orderPayment;
  if(!id)return;
  const order=store().orders.find(o=>o.id===id);if(!order)return;
  if(input.dataset.orderStatus){if(!(input.value in ORDER_STATUSES))return;order.status=input.value;}
  else{if(!(input.value in PAYMENT_STATUSES))return;order.paymentStatus=input.value;}
  persist();renderDashboard();
 });
 q('ordersList')?.addEventListener('click',event=>{
  const button=event.target.closest('[data-order-open]');if(!button)return;
  const order=store().orders.find(o=>o.id===button.dataset.orderOpen);
  if(!order?.calculation?.draft)return;
  if(!confirm('Abrir os dados deste pedido na calculadora? O rascunho atual será substituído, mas o pedido salvo não será alterado.'))return;
  Object.assign(store().draft,order.calculation.draft);
  renderSelectors();paintFields();update();persist();nav('calculator');
 });

 function editProfile(type,id){
  const data=store()[type==='printer'?'printers':'materials'].find(x=>x.id===id);
  if(!data)return;
  const form=q(type+'Form');
  form.dataset.editId=id;
  form.elements.namedItem('name').value=data.name;
  if(type==='printer'){
   form.elements.namedItem('price').value=data.price;
   form.elements.namedItem('life').value=data.life;
   form.elements.namedItem('watts').value=data.watts;
   form.elements.namedItem('maintenance').value=data.maintenance;
  }else{form.elements.namedItem('price').value=data.price;form.elements.namedItem('grams').value=data.grams;}
  q(type==='printer'?'savePrinterProfile':'saveMaterialProfile').textContent='Salvar alterações';
  q(type==='printer'?'cancelPrinterEdit':'cancelMaterialEdit').hidden=false;
  form.scrollIntoView({behavior:'smooth',block:'center'});
  form.elements.namedItem('name').focus();
 }
 function resetProfileForm(type){
  const form=q(type+'Form');form.dataset.editId='';form.reset();
  q(type==='printer'?'savePrinterProfile':'saveMaterialProfile').textContent=type==='printer'?'Adicionar impressora':'Adicionar material';
  q(type==='printer'?'cancelPrinterEdit':'cancelMaterialEdit').hidden=true;
 }
 document.addEventListener('click',event=>{
  const b=event.target.closest('[data-edit]');if(!b)return;
  editProfile(b.dataset.type==='printers'?'printer':'material',b.dataset.edit);
 });
 for(const type of ['printer','material']){
  q(type+'Form').addEventListener('submit',()=>{if(!q(type+'Form').dataset.editId)resetProfileForm(type)});
  q(type==='printer'?'cancelPrinterEdit':'cancelMaterialEdit').addEventListener('click',()=>resetProfileForm(type));
 }
 function sync(){applyQuote();applyMode();renderChannels();renderLots();renderOrders();renderDashboard()}
 window.addEventListener('3dprice:navigate',event=>{if(event.detail.view==='orders')renderOrders();if(event.detail.view==='dashboard')renderDashboard()});
 window.addEventListener('3dprice:calculate',()=>{renderChannels();renderLots()});
 window.addEventListener('3dprice:import',sync);
 sync();
}

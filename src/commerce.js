export const ORDER_STATUSES={QUOTE:'Proposta',APPROVED:'Aprovado',PRODUCING:'Produção',DELIVERED:'Entregue',CANCELLED:'Cancelado'};
export const PAYMENT_STATUSES={PENDING:'Pendente',PAID:'Pago'};
export const CHANNEL_PRESETS=[
 {id:'direct',name:'Venda direta',fee:0},
 {id:'whatsapp',name:'WhatsApp',fee:0},
 {id:'marketplace',name:'Marketplace',fee:15},
 {id:'store',name:'Loja própria',fee:3}
];
export const isValidOrder=o=>!!o&&typeof o.id==='string'&&typeof o.created==='string'&&Number.isFinite(Number(o.price))&&Number.isFinite(Number(o.cost))&&o.price>=0&&o.cost>=0&&typeof o.name==='string';
export function makeOrder(draft,result,{client='',channel='direct'}={},id){
 if(!result||!Number.isFinite(result.suggested)||!id)throw Error('Orçamento inválido');
 return {
  id,created:new Date().toISOString(),
  name:String(draft.name||'Peça impressa'),client:String(client),
  quantity:Number(draft.quantity),channel,
  status:'QUOTE',paymentStatus:'PENDING',
  price:result.suggested*(1-result.discount),cost:result.cost,
  profit:result.profit,fees:result.fees,notes:'',
  calculation:{draft:{...draft},result:JSON.parse(JSON.stringify(result))}
 };
}
export function orderStats(orders){
 const valid=Array.isArray(orders)?orders.filter(isValidOrder):[];
 const active=valid.filter(o=>o.status!=='CANCELLED');
 const paid=active.filter(o=>o.paymentStatus==='PAID');
 const delivered=paid.filter(o=>o.status==='DELIVERED');
 const total=arr=>arr.reduce((s,o)=>s+Number(o.price),0);
 const profit=arr=>arr.reduce((s,o)=>s+Number(o.profit||0),0);
 return {totalOrders:active.length,pendingOrders:active.filter(o=>o.status!=='DELIVERED').length,
 paidOrders:paid.length,received:total(paid),paidEstimatedProfit:profit(paid),
 deliveredReceived:total(delivered),deliveredEstimatedProfit:profit(delivered),
 proposed:total(active.filter(o=>o.status==='QUOTE')),deliveredCount:active.filter(o=>o.status==='DELIVERED').length,
 byChannel:Object.entries(Object.groupBy?Object.groupBy(active,o=>o.channel||'direct'):active.reduce((g,o)=>{(g[o.channel||'direct']||=[]).push(o);return g},{})).map(([channel,rows])=>({channel,orders:rows.length,value:total(rows)}))
 };
}

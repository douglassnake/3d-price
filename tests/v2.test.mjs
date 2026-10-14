import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,compareChannels} from '../src/calculator.js';
import {parseSlicerMetadata} from '../src/slicer.js';
import {compareLots} from '../src/lotPlanner.js';
import {quoteHTML,escapeHTML} from '../src/quotations.js';
import {makeOrder,orderStats,CHANNEL_PRESETS} from '../src/commerce.js';

const base={name:'Peça A',grams:100,quantity:2,hours:4,minutes:30,spoolPrice:100,spoolGrams:1000,watts:200,kwh:1,machinePrice:2000,lifeHours:2000,maintenance:.5,consumables:2,packaging:1,failure:10,laborHours:1,laborRate:20,other:3,margin:20,marketplace:10,payment:3,taxes:2,discount:0,shipping:5};
const almost=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} vs ${b}`);
test('v2 conserva resultados prévios quando custos fixos e modelagem não informados',()=>{
 const a=calculate(base),b=calculate({...base,fixedMonthly:0,productiveHours:160,modelingHours:0});
 almost(a.cost,b.cost);almost(a.suggested,b.suggested);
});
test('provisão de falhas aparece separada e mantém custos brutos',()=>{
 const r=calculate(base);
 const raw=20+.9+4.5+2.25+2;
 almost(r.failureReserve,raw*(1/.9-1));
 almost(r.items.find(i=>i.key==='filament').value,20);
 almost(r.items.find(i=>i.key==='failureReserve').value,r.failureReserve);
 assert.ok(!r.items.some(i=>i.label.includes('(com falhas)')));
});
test('rateio mensal e modelagem utilizam valores informados',()=>{
 const a=calculate(base),b=calculate({...base,fixedMonthly:1000,productiveHours:100,modelingHours:2});
 almost(b.cost-a.cost,45+40);
 almost(b.fixedAllocated,45);
});
test('rejeita denominadores inválidos para rateio',()=>assert.throws(()=>calculate({...base,productiveHours:0}),/horas produtivas/i));
test('margem após desconto e taxas é exata',()=>almost(calculate({...base,discount:15}).actualMargin,20));
test('canais com taxa distinta alteram preço sem alterar insumos',()=>{
 const r=compareChannels(base,[{id:'a',name:'Direto',fee:0},{id:'b',name:'Market',fee:18}]);
 assert.equal(r.length,2);assert.ok(r[1].suggested>r[0].suggested);almost(r[1].cost,r[0].cost);
});
test('G-code Cura: tempo em segundos sem peso inferido de metros',()=>{
 const r=parseSlicerMetadata(';TIME:7200\n;Filament used: 3.4m\nG1 X200');
 assert.equal(r.seconds,7200);assert.equal(r.grams,null);assert.equal(r.hours,2);
});
test('G-code Prusa: massa em g e hora formatada',()=>{
 const r=parseSlicerMetadata('; filament used [g] = 23.8\n; estimated printing time (normal mode) = 1h 25m 30s');
 assert.equal(r.grams,23.8);assert.equal(r.hours,1);assert.equal(r.minutes,26);
});
test('arquivo de fatiador sem unidades reconhecidas não inventa dados',()=>{
 const r=parseSlicerMetadata('G1 X1 Y2\n; unrelated: 99');
 assert.equal(r.grams,null);assert.equal(r.seconds,null);
});
test('PDF público omite custos/margens e escapa textos externos',()=>{
 const r=calculate(base);
 const pdf=quoteHTML(base,r,{seller:'Loja <script>alert(1)</script>',client:'Cliente & Companhia'});
 assert.ok(pdf.includes('Proposta comercial'));assert.ok(!pdf.includes('Memória de cálculo'));
 assert.ok(!pdf.includes('Lucro estimado'));assert.ok(!pdf.includes('Depreciação'));
 assert.ok(pdf.includes('&lt;script&gt;'));assert.ok(pdf.includes('Cliente &amp; Companhia'));
});
test('PDF interno contém custos detalhados',()=>{
 const pdf=quoteHTML(base,calculate(base),{}, {internal:true});
 assert.ok(pdf.includes('Memória de cálculo'));assert.ok(pdf.includes('Provisão para falhas'));
});
test('pedidos acompanham somente valores pagos como recebidos',()=>{
 const a=makeOrder(base,calculate(base),{client:'X'},'a');
 const b=makeOrder({...base,name:'B'},calculate(base),{client:'Y'},'b');
 b.paymentStatus='PAID';b.status='DELIVERED';const stats=orderStats([a,b]);
 assert.equal(stats.totalOrders,2);assert.equal(stats.paidOrders,1);
 almost(stats.received,b.price);
 assert.equal(stats.deliveredCount,1);
});
test('pedidos cancelados não contam em vendas nem faturamento',()=>{
 const a=makeOrder(base,calculate(base),{},'a');a.paymentStatus='PAID';a.status='CANCELLED';
 assert.equal(orderStats([a]).received,0);assert.equal(orderStats([a]).totalOrders,0);
});
test('presets de canais são explícitos e editáveis',()=>assert.equal(CHANNEL_PRESETS.length,4));
test('escapes HTML de texto do cliente',()=>assert.equal(escapeHTML('<"&>'), '&lt;&quot;&amp;&gt;'));

test('lotes têm tempo proporcional e custo por unidade transparente',()=>{const list=compareLots(base,[1,10,50,100]);assert.equal(list.length,4);almost(list[1].hours, (base.hours+base.minutes/60)*10/base.quantity);assert.equal(list[3].quantity,100);assert.ok(list[3].suggested>list[0].suggested)});

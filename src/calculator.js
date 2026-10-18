export const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
export const money = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const optional = (data,key,fallback=0) => data[key]===undefined||data[key]===null||data[key]===''?fallback:Number(data[key]);

/**
 * Calcula um lote completo, sem arredondar componentes intermediários.
 * margin é margem sobre a receita efetivamente recebida (após desconto),
 * não markup sobre custo. Taxas percentuais incidem na receita recebida.
 * Valores padrão dos novos campos são zero para preservar cálculos V1.
 */
export function calculate(x) {
 const n=k=>Number(x[k]);
 const nonnegative=['grams','hours','minutes','spoolPrice','watts','kwh','machinePrice','maintenance','consumables','packaging','laborHours','laborRate','other','shipping','margin','marketplace','payment','taxes','discount','failure'];
 if(nonnegative.some(k=>!Number.isFinite(n(k))||n(k)<0)||
 !Number.isInteger(n('quantity'))||n('quantity')<1||
 !Number.isFinite(n('spoolGrams'))||n('spoolGrams')<=0||
 !Number.isFinite(n('lifeHours'))||n('lifeHours')<=0||n('minutes')>=60)
 throw Error('Verifique quantidades, horas e valores: não podem ser negativos ou inválidos.');
 const supportGrams=optional(x,'supportGrams',0);
 const supportPriceKg=optional(x,'supportPriceKg',0);
 if(!Number.isFinite(supportGrams)||supportGrams<0||!Number.isFinite(supportPriceKg)||supportPriceKg<0)throw Error('Peso e preço do material de suporte devem ser válidos.');
 if(supportGrams>0&&supportPriceKg===0)throw Error('Informe o preço do material de suporte em R$/kg antes de calcular.');
 const fixedMonthly=optional(x,'fixedMonthly',0);
 const productiveHours=optional(x,'productiveHours',160);
 const modelingHours=optional(x,'modelingHours',0);
 if(!Number.isFinite(fixedMonthly)||fixedMonthly<0||
 !Number.isFinite(productiveHours)||productiveHours<=0||
 !Number.isFinite(modelingHours)||modelingHours<0)
 throw Error('Custos fixos e horas devem ser válidos; horas produtivas precisam ser maiores que zero.');
 const f=n('failure')/100, d=n('discount')/100, fees=(n('marketplace')+n('payment')+n('taxes'))/100, margin=n('margin')/100;
 if(f>=1||d>=1||fees>=1||margin+fees>=1)
 throw Error('Falhas e descontos devem ser menores que 100%; margem + taxas + tributos precisam somar menos de 100%.');
 const hours=n('hours')+n('minutes')/60, quantity=n('quantity');
 const raw={
  filament:n('grams')*quantity/n('spoolGrams')*n('spoolPrice'),
  energy:n('watts')/1000*hours*n('kwh'),
  depreciation:n('machinePrice')/n('lifeHours')*hours,
  maintenance:n('maintenance')*hours,
  consumables:n('consumables'),
  support:supportGrams/1000*supportPriceKg
 };
 const production=Object.values(raw).reduce((a,b)=>a+b,0);
 const retry=1/(1-f), reserve=production*(retry-1);
 const fixedAllocated=fixedMonthly/productiveHours*hours;
 const items=[
  {key:'filament',label:'Filamento',value:raw.filament},
  {key:'energy',label:'Energia',value:raw.energy},
  {key:'depreciation',label:'Depreciação da impressora',value:raw.depreciation},
  {key:'maintenance',label:'Manutenção',value:raw.maintenance},
  {key:'consumables',label:'Consumíveis de impressão',value:raw.consumables},
  {key:'support',label:'Material de suporte',value:raw.support},
  {key:'failureReserve',label:'Provisão para falhas',value:reserve},
  {key:'labor',label:'Mão de obra',value:n('laborHours')*n('laborRate')},
  {key:'modeling',label:'Modelagem 3D',value:modelingHours*n('laborRate')},
  {key:'overhead',label:'Custos fixos rateados',value:fixedAllocated},
  {key:'packaging',label:'Embalagem',value:n('packaging')*quantity},
  {key:'other',label:'Outros custos',value:n('other')},
  {key:'shipping',label:'Frete assumido',value:n('shipping')}
 ];
 const cost=items.reduce((a,i)=>a+i.value,0);
 const minimum=cost/((1-d)*(1-fees));
 const suggested=cost/((1-d)*(1-fees-margin));
 const received=suggested*(1-d), profit=received*(1-fees)-cost;
 return {items,cost,minimum,suggested,perUnit:suggested/quantity,profit,actualMargin:received>0?profit/received*100:0,quantity,hours,fees,discount:d,expectedAttempts:retry,productionCost:production,failureReserve:reserve,supportCost:raw.support,fixedAllocated,netRevenue:received*(1-fees),revenueAfterDiscount:received};
}

export function compareChannels(input, channels) {
 return channels.map(c=>{
  const rate=Number(c.fee);
  if(!Number.isFinite(rate)||rate<0)throw Error('Taxa do canal inválida.');
  try {
   return {id:c.id,name:c.name,fee:rate,valid:true,...calculate({...input,marketplace:rate})};
  }catch(error){return {id:c.id,name:c.name,fee:rate,valid:false,error:error.message};}
 });
}

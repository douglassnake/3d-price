export const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
export const money = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export function calculate(x) {
 const n=k=>Number(x[k]);
 const nonnegative=['grams','hours','minutes','spoolPrice','watts','kwh','machinePrice','maintenance','consumables','packaging','laborHours','laborRate','other','shipping','margin','marketplace','payment','taxes','discount','failure'];
 if(nonnegative.some(k=>!Number.isFinite(n(k))||n(k)<0)||!Number.isInteger(n('quantity'))||n('quantity')<1||!Number.isFinite(n('spoolGrams'))||n('spoolGrams')<=0||!Number.isFinite(n('lifeHours'))||n('lifeHours')<=0||n('minutes')>=60) throw Error('Verifique quantidades, horas e valores: não podem ser negativos ou inválidos.');
 const f=n('failure')/100, d=n('discount')/100, fees=(n('marketplace')+n('payment')+n('taxes'))/100, margin=n('margin')/100;
 if(f>=1||d>=1||fees>=1||margin+fees>=1) throw Error('Falhas e descontos devem ser menores que 100%; margem + taxas + tributos precisam somar menos de 100%.');
 const hours=n('hours')+n('minutes')/60, quantity=n('quantity');
 const raw={
  filament:n('grams')*quantity/n('spoolGrams')*n('spoolPrice'),
  energy:n('watts')/1000*hours*n('kwh'),
  depreciation:n('machinePrice')/n('lifeHours')*hours,
  maintenance:n('maintenance')*hours,
  consumables:n('consumables')
 };
 const retry=1/(1-f);
 const items=[
  {key:'filament',label:'Filamento (com falhas)',value:raw.filament*retry},
  {key:'energy',label:'Energia (com falhas)',value:raw.energy*retry},
  {key:'depreciation',label:'Depreciação (com falhas)',value:raw.depreciation*retry},
  {key:'maintenance',label:'Manutenção (com falhas)',value:raw.maintenance*retry},
  {key:'consumables',label:'Consumíveis de impressão (com falhas)',value:raw.consumables*retry},
  {key:'labor',label:'Mão de obra',value:n('laborHours')*n('laborRate')},
  {key:'packaging',label:'Embalagem',value:n('packaging')*quantity},
  {key:'other',label:'Outros custos',value:n('other')},
  {key:'shipping',label:'Frete assumido',value:n('shipping')}
 ];
 const cost=items.reduce((s,i)=>s+i.value,0);
 const minimum=cost/((1-d)*(1-fees));
 const suggested=cost/((1-d)*(1-fees-margin));
 const received=suggested*(1-d), profit=received*(1-fees)-cost;
 return {items,cost,minimum,suggested,perUnit:suggested/quantity,profit,actualMargin:received>0?profit/received*100:0,quantity,hours,fees,discount:d,expectedAttempts:retry};
}
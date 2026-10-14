import {calculate} from './calculator.js';
/**
 * Cenários de lotes: tempo da máquina cresce proporcionalmente ao número
 * de peças (sem alegar produtividade/speedup na mesa).
 * Trabalho e consumíveis por lote são fixos em cada simulação.
 * O usuário deve revisar o tempo no fatiador para lotes reais.
 */
export function compareLots(input,quantities=[1,10,50,100]){
 const baseQuantity=Number(input.quantity);
 const baseHours=Number(input.hours)+Number(input.minutes)/60;
 if(!Number.isInteger(baseQuantity)||baseQuantity<1||!Number.isFinite(baseHours)||baseHours<0)throw Error('Lote base inválido');
 return quantities.map(quantity=>{
  if(!Number.isInteger(quantity)||quantity<1)throw Error('Quantidade inválida');
  const hours=baseHours*quantity/baseQuantity;
  const result=calculate({...input,quantity,hours,minutes:0});
  return {quantity,hours,...result};
 });
}

// Seleção editorial de modelos FDM conhecidos no mercado brasileiro e internacional (2026).
// Nomes verificados; custos abaixo são EXEMPLOS GENÉRICOS, não especificações oficiais.
// O usuário deve substituir preço de aquisição, potência, vida útil e manutenção pelos dados reais.
export const CATALOG_VERSION = 1;
export const PRINTER_MODELS = Object.freeze([
  ['bambu-a1','Bambu Lab A1'],
  ['bambu-a1-mini','Bambu Lab A1 Mini'],
  ['bambu-p1s','Bambu Lab P1S'],
  ['bambu-p2s','Bambu Lab P2S'],
  ['creality-ender3-v3-se','Creality Ender-3 V3 SE'],
  ['creality-ender3-v3-ke','Creality Ender-3 V3 KE'],
  ['creality-k1c','Creality K1C'],
  ['anycubic-kobra3','Anycubic Kobra 3'],
  ['elegoo-neptune4-pro','Elegoo Neptune 4 Pro'],
  ['flashforge-adventurer5m','Flashforge Adventurer 5M']
].map(([id,name])=>Object.freeze({id:'catalog-'+id,name,price:2500,life:4000,watts:120,maintenance:0.35,example:true})));
export function mergePrinterCatalog(existing,version=0){
  const result=Array.isArray(existing)?[...existing]:[];
  if(Number(version)>=CATALOG_VERSION)return result;
  const used=new Set(result.map(p=>p?.id).filter(Boolean));
  const names=new Set(result.map(p=>String(p?.name||'').trim().toLocaleLowerCase('pt-BR')));
  for(const printer of PRINTER_MODELS){
    if(!used.has(printer.id)&&!names.has(printer.name.toLocaleLowerCase('pt-BR'))){result.push({...printer});used.add(printer.id);}
  }
  return result;
}

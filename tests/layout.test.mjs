import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),theme=read('styles/treasure.css'),app=read('src/app.js'),worker=read('sw.js');

test('IDs de cálculo, ações e navegação continuam únicos e presentes',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['name','printer','material','grams','quantity','hours','minutes','spoolPrice','spoolGrams','watts','kwh','machinePrice','lifeHours','maintenance','consumables','packaging','failure','laborHours','laborRate','other','margin','marketplace','payment','taxes','discount','shipping','suggested','cost','minimum','profit','actualMargin','breakdown','save','print','reset','printerForm','materialForm','exportJson','importJson','jsonFile','themeBtn','installApp','bannerPrice','profileCount'])assert.ok(ids.includes(id),'Elemento obrigatório ausente: '+id);
});
test('tema carrega após estilos originais e possui responsividade',()=>{
 assert.ok(html.includes('styles/treasure.css?v=20261009-1'));
 assert.ok(html.indexOf('styles.css')<html.indexOf('styles/treasure.css'));
 for(const name of ['treasure-banner','side-brand','summary-grid','cost-title','bottom-grid'])assert.ok(html.includes(name));
 assert.match(theme,/@media\(max-width:700px\)/);
 assert.match(theme,/@media\(max-width:430px\)/);
 assert.match(theme,/@media print/);
});
test('valores visuais usam motor de cálculo, sem montantes de demonstração',()=>{
 assert.match(app,/el\('bannerPrice'\)\.textContent=money\(r\.suggested\)/);
 assert.match(app,/el\('suggested'\)\.textContent=money\(r\.suggested\)/);
 assert.ok(!html.includes('R$ 89,90'));
 assert.match(app,/costDisplayFormat==='percent'/);
 assert.match(app,/\[data-open-view\]/);
});
test('PWA guarda o novo tema no cache offline',()=>{
 assert.ok(worker.includes('styles/treasure.css?v=20261009-1'));
 assert.match(worker,/3d-price-pwa-v3-tesouro/);
});

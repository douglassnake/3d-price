import test from 'node:test';import assert from 'node:assert/strict';import {PRINTER_MODELS,mergePrinterCatalog,CATALOG_VERSION} from '../src/printerCatalog.js';
test('catálogo contém 10 modelos distintos',()=>{assert.equal(PRINTER_MODELS.length,10);assert.equal(new Set(PRINTER_MODELS.map(x=>x.id)).size,10)});
test('migração preserva impressoras já cadastradas',()=>{const mine={id:'myprinter',name:'Minha máquina',price:999,watts:88,life:1200,maintenance:0};const out=mergePrinterCatalog([mine],0);assert.deepEqual(out[0],mine);assert.equal(out.length,11)});
test('não duplicar ao reaplicar migração',()=>{const once=mergePrinterCatalog([{id:'p1',name:'Padrão'}],0);assert.equal(mergePrinterCatalog(once,0).length,once.length);assert.equal(mergePrinterCatalog(once,CATALOG_VERSION).length,once.length)});
test('não duplicar nomes personalizados existentes',()=>{const existing={id:'custom',name:'Bambu Lab A1',price:4500};const out=mergePrinterCatalog([existing],0);assert.equal(out.filter(x=>x.name==='Bambu Lab A1').length,1);assert.deepEqual(out[0],existing)});
test('dados dos presets identificados como ilustrativos',()=>assert.ok(PRINTER_MODELS.every(p=>p.example===true)));

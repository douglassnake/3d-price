import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {existsSync} from 'node:fs';
const m=JSON.parse(readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
test('PWA instalável e com escopo relativo',()=>{assert.equal(m.display,'standalone');assert.equal(m.start_url,'./');assert.equal(m.scope,'./');assert.ok(m.icons.length>0)});
test('arquivos de uso offline existem',()=>{for(const p of ['index.html','styles.css','src/app.js','src/calculator.js','src/printerCatalog.js','manifest.webmanifest','icons/icon.svg'])assert.equal(existsSync(new URL('../'+p,import.meta.url)),true,p)});
test('service worker contém todos os arquivos críticos',()=>{const s=readFileSync(new URL('../sw.js',import.meta.url),'utf8');for(const p of ['src/app.js','src/calculator.js','src/printerCatalog.js','styles.css'])assert.ok(s.includes(p))});

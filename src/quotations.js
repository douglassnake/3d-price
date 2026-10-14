import {money} from './calculator.js';
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const style=`<style>
@page{size:A4;margin:17mm}
*{box-sizing:border-box}body{font:13px/1.55 Arial,sans-serif;color:#182f40;margin:0;max-width:850px;padding:12px 0}
.header{border-bottom:3px solid #d6a348;padding-bottom:15px;display:flex;justify-content:space-between;align-items:flex-end}
h1{font-size:28px;margin:0;color:#0d3244}h2{font-size:15px;color:#0e3448;margin-top:20px}
.muted{color:#5e6e78}.meta{margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tag{color:#98651c;font-size:11px;letter-spacing:1px;font-weight:bold}
table{width:100%;border-collapse:collapse;margin:16px 0}td,th{text-align:left;padding:11px;border-bottom:1px solid #ddd}th{background:#f7f3e9}
.price{background:#092e43;color:#ffe1a2;border-radius:9px;padding:19px;font-size:24px;font-weight:bold;margin-top:20px}
.small{font-size:11px;color:#606d77}.note{white-space:pre-wrap;overflow-wrap:anywhere}
@media print{body{padding:0}.noprint{display:none!important}}
</style>`;
export function quoteHTML(draft,result,meta={},options={}){
 const internal=!!options.internal;
 const pieces=Number(draft.quantity)||1;
 const name=escapeHTML(draft.name||'Peça impressa em 3D');
 const rows=internal
 ?result.items.map(i=>`<tr><td>${escapeHTML(i.label)}</td><td>${money(i.value)}</td></tr>`).join('')
 :`<tr><td>${name}</td><td>${pieces}</td><td>${money(result.perUnit)}</td><td>${money(result.suggested)}</td></tr>`;
 const client=escapeHTML(meta.client||'Não informado');
 const seller=escapeHTML(meta.seller||'Fornecedor');
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${internal?'Memória de cálculo':'Proposta comercial'} — 3D Price</title>${style}</head>
 <body><div class="header"><div><div class="tag">3D PRICE</div><h1>${internal?'Memória de cálculo':'Proposta comercial'}</h1><span class="muted">${seller}</span></div><div class="muted">Emitido em ${new Date().toLocaleDateString('pt-BR')}</div></div>
 <div class="meta"><div><strong>Cliente</strong><div>${client}</div></div><div><strong>Produto</strong><div>${name}</div></div></div>
 <h2>${internal?'Custos detalhados':'Itens da proposta'}</h2><table><thead><tr>${internal?'<th>Componente</th><th>Valor do lote</th>':'<th>Descrição</th><th>Qtd.</th><th>Preço un.</th><th>Total</th>'}</tr></thead><tbody>${rows}</tbody></table>
 ${internal?`<p><strong>Custo total:</strong> ${money(result.cost)}<br><strong>Preço de equilíbrio:</strong> ${money(result.minimum)}<br><strong>Lucro estimado:</strong> ${money(result.profit)}<br><strong>Margem estimada:</strong> ${result.actualMargin.toFixed(1)}%</p>`:''}
 <div class="price">Valor do lote: ${money(result.suggested)}</div>
 <p><strong>Quantidade:</strong> ${pieces} unidade(s) &nbsp; <strong>Preço unitário:</strong> ${money(result.perUnit)}</p>
 ${meta.lead?'<p><strong>Prazo:</strong> '+escapeHTML(meta.lead)+'</p>':''}
 ${meta.validity?'<p><strong>Validade:</strong> '+escapeHTML(meta.validity)+'</p>':''}
 ${meta.notes?'<h2>Observações</h2><p class="note">'+escapeHTML(meta.notes)+'</p>':''}
 <p class="small">Estimativa calculada com os dados fornecidos. Valores e condições sujeitos à confirmação do fornecedor.</p>
 <script>window.addEventListener('load',()=>window.print())<\/script></body></html>`;
}

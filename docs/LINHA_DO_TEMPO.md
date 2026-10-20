# 3D Price — Fluxo de projeto em linha do tempo

A calculadora principal agora conduz o usuário por uma **linha do tempo de seis etapas**, sem substituir o motor de preços e preservando os dados locais existentes:

1. **Iniciar projeto** — informar o nome da peça e, se conhecido, o cliente.
2. **Anexar arquivo** — importar G-code, 3MF fatiado, relatórios de GrabCAD Print CSV/XLSX ou copiar a estimativa. A importação é **opcional** e feita localmente.
3. **Configurar impressão** — selecionar impressora e material e conferir massa por peça, quantidade e tempo total.
4. **Calcular custos** — definir filamento, energia, depreciação, manutenção, perdas, mão de obra, modelagem, suporte e custos adicionais.
5. **Definir preço** — especificar margem, taxas e descontos e ver custos, preço, lucro, comparação de canais e lotes.
6. **Finalizar** — conferir o resumo, gerar **proposta comercial em PDF**, salvar memória interna ou criar pedido.

## Como navegar
- A linha de etapas no topo permite retornar ou ir diretamente a qualquer etapa.
- Botões **Continuar** e **Voltar** são alternativas à navegação direta.
- Em dispositivos móveis, os marcadores podem ser percorridos horizontalmente.
- A última etapa não altera o status do pedido automaticamente: um pedido só é criado ao pressionar seu botão. Salvar no histórico também é uma ação explícita.
- O passo atual e os valores digitados são salvos localmente. Isso **não sincroniza** com outros dispositivos.

## Compatibilidade
- Permanecem ativos os importadores **Cura, PrusaSlicer, OrcaSlicer, Bambu Studio e GrabCAD Print** e a opção de informar massa/tempo manualmente.
- Todos os campos originais, IDs, listeners e ações são reaproveitados e apenas reorganizados visualmente.
- O botão **Novo cálculo** volta ao passo inicial após confirmação; abrir um orçamento antigo posiciona no passo de preços.
- Backup JSON, histórico de cálculos, perfis e pedidos permanecem disponíveis nas respectivas abas.

## Segurança financeira
A interface da linha do tempo não altera a regra de cálculo. Os valores são estimativos. O PDF **comercial** não mostra os custos internos, enquanto a memória interna pode conter margens e composição dos custos.

## Testes
- Suíte Node com regressão de cálculos e importadores.
- Teste Playwright desktop e mobile, avançar/voltar, importação GrabCAD, suporte, resultado de preços, salvar, criar pedidos, atualizar status, histórico e persistência entre recarregamentos.
- GitHub Pages após validação dos testes.

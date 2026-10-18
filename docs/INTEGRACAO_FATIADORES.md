# Integração com fatiadores — 3D Price

A importação é **local, sem envio de arquivos** e sem contato com contas dos fabricantes. Os dados são pré-visualizados antes de preencher o cálculo.

## Matriz de compatibilidade

| Software | Caminho de integração no 3D Price | Dados possíveis | Limitação |
|---|---|---|---|
| Ultimaker Cura | Abrir G-code exportado | Tempo estimado (`;TIME:`) | Cura pode informar filamento em **metros**, não em gramas; não se converte sem diâmetro e densidade |
| PrusaSlicer | Abrir G-code ou 3MF já fatiado | Peso [g], tempo | Arquivos apenas geométricos não contêm estimativa |
| OrcaSlicer | Abrir G-code ou 3MF fatiado | Peso total [g], tempo, às vezes suporte | Estatísticas por modelo/suporte/purga variam conforme a versão |
| Bambu Studio | Abrir G-code ou 3MF fatiado | Peso total [g], tempo, eventualmente extrusores | Algumas exportações não incluem estatísticas completas |
| **GrabCAD Print** | Copiar texto do diálogo **Estimate** e colar no 3D Price | Massa e/ou tempo, se explicitamente informados | Dependente dos rótulos e unidades disponíveis na tecnologia/impressora |
| **GrabCAD Print Pro** | No **Estimate / Build Report / Tray Summary**, exportar CSV ou XLSX e importar no 3D Price | Quantidade, massa modelo, suporte, tempo quando reportados | Formatos podem variar por tecnologia/modelo/versão |

**Documentação Stratasys:** [Estimate no GrabCAD Print](https://support.stratasys.com/en/software/grabcad-print/getting-started/start-printing) · [Exportação de relatórios no GrabCAD Print Pro](https://support.stratasys.com/en/Software/GrabCAD-Print/About/GrabCAD-Print-Pro)

## Como usar

1. Abra **Calcular preço → Integração com fatiadores**.
2. Escolha **Identificar automaticamente** ou indique **GrabCAD Print**.
3. Selecione o G-code, 3MF fatiado, CSV ou XLSX. Para GrabCAD Print Standard, abra **Ou colar relatório**, copie o texto da estimativa e cole.
4. Confira **origem, peso, suporte, tempo e mensagens** na prévia.
5. Informe quantas peças correspondem ao **peso total importado** (a massa será dividida pela quantidade para preencher g/peça).
6. Clique **Aplicar ao cálculo**. Nada é alterado antes da confirmação.
7. Se o GrabCAD informar **modelo e suporte separadamente**, preencha o **Preço do suporte (R$/kg)**. O cálculo ficará bloqueado enquanto a massa do suporte for positiva e seu custo estiver zerado.

## Conversões deliberadamente não feitas

- **STL / OBJ / STEP / 3MF não fatiado**: geometria não permite deduzir diretamente tempo ou peso. Primeiro fatie o projeto.
- **cm³, cm3, in³, metros lineares de filamento**: não são transformados em gramas sem informações adicionais de densidade/diâmetro. O aplicativo avisa e aguarda o peso correto.
- **GrabCAD .CMB, .print e formatos proprietários**: não são decodificados nem associados a uma API privada. Exporte/copie a estimativa usando as funções do GrabCAD.
- **Tempo em HH:MM ambíguo**: sem indicação de unidade, não é convertido para evitar interpretar horas como minutos. HH:MM:SS e `2h 30m` são aceitos.
- **Diversas bandejas num mesmo 3MF**: o aplicativo usa apenas o primeiro conjunto de metadados encontrado e alerta sobre a existência de outras.
- **Relatórios com múltiplas linhas**: massas podem ser agregadas apenas quando não há total explícito; tempo de linhas distintas nunca é somado como se fosse um trabalho sequencial (pode haver fabricação simultânea).

## Segurança e privacidade

- Upload e análise são **exclusivamente no navegador**. O GitHub Pages serve apenas os arquivos estáticos do aplicativo.
- São armazenados no cálculo o nome do arquivo, origem do software, campos aplicados e data da importação; não se guardam os arquivos completos.
- ZIP/3MF/XLSX têm limites de tamanho, quantidade de entradas e tamanho extraído; arquivos criptografados e compactações não reconhecidas não são aceitos.
- Dados copiados de relatórios são escapados antes de inserção na interface.
- Não há acesso à fila das impressoras nem controle remoto; essa funcionalidade exigiria implementação específica e autorização.

## Limitações conhecidas

As versões dos fatiadores mudam seus metadados. Uma exportação pode trazer somente o tempo, somente o peso ou nenhum deles. O 3D Price **não inventa valores**; nesses casos o usuário preenche manualmente. Antes de cobrar um cliente, confira material de suporte, purga, peso real do lote e tempo no software de origem.

### Fontes de referência
- [GrabCAD Print Pro: Build Report e exportações CSV/XLSX](https://support.stratasys.com/en/Software/GrabCAD-Print/About/GrabCAD-Print-Pro)
- [GrabCAD Print: Estimate](https://support.stratasys.com/en/software/grabcad-print/getting-started/start-printing)
- [Metadados G-code do OrcaSlicer](https://github.com/OrcaSlicer/OrcaSlicer/issues/2446)
- [Metadados G-code do Bambu Studio](https://github.com/bambulab/BambuStudio/issues/872)

# 3D Price
Calculadora gratuita de custos e preços de venda para impressão 3D doméstica e pequenos negócios.

## Aplicativo
Após ativar **Settings → Pages → Build and deployment → Source: GitHub Actions**, o endereço previsto é https://douglassnake.github.io/3d-price/ .

## Funcionalidades
- Cálculo de material por peso, tempo do lote, energia, depreciação e manutenção.
- Provisão de falhas aplicável à impressão (não à mão de obra ou embalagem).
- Mão de obra, embalagem, frete e custos adicionais.
- Margem sobre receita, taxas, impostos e desconto.
- Preço mínimo de equilíbrio, preço sugerido do lote, valor unitário, lucro e margem.
- Perfis de máquinas e filamentos, histórico local e backup JSON.
- Impressão de relatório para PDF via navegador.
- Interface responsiva com tema escuro.

## Cálculo
Para custo total `C`, desconto `d`, taxas+tributos `t` e margem `m`:
`preco_tabela = C / ((1-d) * (1-t-m))`.

Para filamento, energia, depreciação, manutenção e consumíveis: custos esperados são divididos por `1 - p`, sendo `p` a probabilidade estimada de falha. A estimativa presume tentativas independentes de custo semelhante.

**Importante:** os perfis são exemplos, não valores oficiais. Ajuste conforme seu uso. A ferramenta não é aconselhamento fiscal ou contábil.

## Desenvolvimento
Aplicação estática (HTML/CSS/JavaScript ES Modules). Não requer backend nem credenciais. Para abrir localmente, rode `python -m http.server 8080` e acesse http://127.0.0.1:8080.

Para testes: `node --test tests/*.test.mjs`.

## Dados e privacidade
Dados persistidos no `localStorage` do navegador. Dispositivos diferentes **não compartilham histórico**. Exporte um backup JSON para preservar ou transferir perfis e cálculos. Não registre dados sensíveis no histórico.

## Instalar como aplicativo (PWA)
O 3D Price é instalável no celular e computador, sem precisar de uma loja de aplicativos.
- **Android/Chrome:** acesse o site e use **Instalar app** (se disponível) ou menu ⋮ → **Adicionar à tela inicial / Instalar aplicativo**.
- **iPhone/Safari:** acesse o site no Safari, toque em **Compartilhar** → **Adicionar à Tela de Início**.
- **Desktop/Chrome/Edge:** utilize o ícone **Instalar** na barra de endereços ou no menu do navegador.
- **Offline:** após o primeiro carregamento online, o aplicativo pode calcular sem conexão usando os arquivos armazenados. Os dados permanecem no armazenamento local do dispositivo.
- **Atualizações:** quando online, o navegador atualiza os arquivos; feche e abra o app se necessário.

PWA não é um APK/IPA nativo. Publicação na Google Play/App Store exige etapas separadas.

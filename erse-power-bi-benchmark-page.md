# ERSE Competitive — Benchmark Page (Power BI)

Step-by-step build of the **Benchmark** page — equivalent to the existing competitive PDFs (per-power-tier comparison with TP, TE, Descontos, Fatura €/Ano + ranked column chart). Single dynamic page; slicers control scenario.

## Prerequisites

The auto-download script must be at version 34-column schema (UTF-8, all 22 Cond columns kept including `TxTModalidade`, all 4 reimbursement columns, all 3 new-customer discount %). If your `Main\ERSE_main.csv` has fewer columns, hard-refresh the GitHub copy of `erse-tariff-download.md`, replace Action 2 in PAD, delete `_state\last_update.txt`, and re-run.

## Step 1 — Add the `OfferFamily` calculated column

Why: the PDF benchmarks compare specific **offer families** (e.g. "Galp Combina", "Repsol VIVA Parcerias DD+FE+SVA") rather than competitor averages. The CSV has 800+ unique offer names — too granular for a benchmark axis. We collapse them into ~20 named families using DAX pattern matching.

**Add as calculated column** on `ERSE_main`:

1. Click `ERSE_main` in the Data pane → friso **Modelação** → **Nova coluna**.
2. Paste the DAX below.

```
OfferFamily =
VAR Com  = 'ERSE_main'[COM]
VAR Nome = 'ERSE_main'[NomeProposta]
VAR Mod  = 'ERSE_main'[TxTModalidade]
RETURN
SWITCH(
    TRUE(),
    -- Repsol families
    Com = "REPSOL" && CONTAINSSTRING(Nome, "VIVA Parcerias")    && CONTAINSSTRING(Nome, "FE")  && CONTAINSSTRING(Nome, "DD"), "Repsol VIVA Parcerias DD+FE",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "VIVA Parcerias"),                                                                  "Repsol VIVA Parcerias",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "VIVA SEM MAIS"),                                                                   "Repsol VIVA SEM MAIS",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "VIVA PRO SEM MAIS"),                                                               "Repsol VIVA PRO SEM MAIS",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "LEVE PRO SEM MAIS BTE"),                                                           "Repsol LEVE PRO SEM MAIS BTE",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "LEVE PRO SEM MAIS"),                                                               "Repsol LEVE PRO SEM MAIS",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "LEVE Parcerias")    && CONTAINSSTRING(Nome, "DD") && CONTAINSSTRING(Nome, "FE"),  "Repsol LEVE Parcerias DD+FE",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "LEVE Parcerias"),                                                                  "Repsol LEVE Parcerias",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "LEVE SEM MAIS"),                                                                   "Repsol LEVE SEM MAIS",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "TARIFA SANTANDER DUAL"),                                                           "Repsol Santander Dual",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "TARIFA SANTANDER"),                                                                "Repsol Santander",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "TARIFA VODAFONE DUAL"),                                                            "Repsol Vodafone Dual",
    Com = "REPSOL" && CONTAINSSTRING(Nome, "TARIFA VODAFONE"),                                                                 "Repsol Vodafone",
    Com = "REPSOL" && LEFT(Nome, 4) = "VIVA",                                                                                  "Repsol VIVA Geral",
    Com = "REPSOL" && LEFT(Nome, 4) = "LEVE",                                                                                  "Repsol LEVE Geral",
    -- Galp families
    Com = "GALP" && CONTAINSSTRING(Nome, "COMBINA Dual"),                                                                      "Galp Combina Dual",
    Com = "GALP" && CONTAINSSTRING(Nome, "COMBINA Eletricidade Verde"),                                                        "Galp Combina Verde",
    Com = "GALP" && CONTAINSSTRING(Nome, "COMBINA GásNatural"),                                                                "Galp Combina Gás",
    Com = "GALP" && CONTAINSSTRING(Nome, "Casa & Estrada"),                                                                    "Galp Casa & Estrada",
    Com = "GALP" && CONTAINSSTRING(Nome, "Negócios"),                                                                          "Galp Negócios",
    Com = "GALP",                                                                                                              "Galp Outras",
    -- EDP families
    Com = "EDPC" && CONTAINSSTRING(Nome, "Verde") && CONTAINSSTRING(Nome, "Negócios"),                                         "EDP Verde Negócios",
    Com = "EDPC" && CONTAINSSTRING(Nome, "Verde"),                                                                             "EDP Verde",
    Com = "EDPC" && CONTAINSSTRING(Nome, "Negócios"),                                                                          "EDP Negócios",
    Com = "EDPC" && CONTAINSSTRING(Nome, "Digital"),                                                                           "EDP Digital",
    Com = "EDPC",                                                                                                              "EDP Geral",
    -- ACP partnerships (currently only Gold)
    CONTAINSSTRING(Mod, "ACP"),                                                                                                "Gold ACP",
    -- Endesa
    Com = "END" && CONTAINSSTRING(Nome, "Tempo"),                                                                              "Endesa Tempo",
    Com = "END",                                                                                                               "Endesa",
    -- Iberdrola
    Com = "IBD" && CONTAINSSTRING(Nome, "Smart"),                                                                              "Iberdrola Smart",
    Com = "IBD",                                                                                                               "Iberdrola",
    -- Plenitude
    Com = "ENIPLENITUDE",                                                                                                      "Plenitude",
    -- Gold (non-ACP)
    Com = "GOLD" && CONTAINSSTRING(Nome, "Combina"),                                                                           "Gold Combina",
    Com = "GOLD" && CONTAINSSTRING(Nome, "Digital"),                                                                           "Gold Digital",
    Com = "GOLD",                                                                                                              "Gold",
    -- G9
    Com = "G9ENERGY",                                                                                                          "G9",
    -- MEO
    Com = "MEOENERGIA",                                                                                                        "MEO",
    -- Regulated tariff
    Com = "TUR",                                                                                                               "Mercado Regulado",
    Com = "CUR",                                                                                                               "Mercado Regulado (CUR)",
    -- Default: use COM code
    Com
)
```

3. Confirma criação. A coluna `OfferFamily` aparece em `ERSE_main`.

**Tweak depois**: se vires uma família com poucos membros ou que devia estar separada, edita o `SWITCH`. As regras são ordem-sensíveis (primeira condição que bate ganha).

## Step 2 — What-if parameter para Consumo Anual

1. Friso **Modelação** → **Novo parâmetro** → **Intervalo numérico**.
2. Configura:
   - Nome: `Consumo Anual`
   - Tipo de dados: Número Inteiro
   - Mínimo: `500`, Máximo: `15000`, Incremento: `100`, Default: `3500`
   - ✓ "Adicionar segmentação de dados a esta página"
3. OK.

Power BI cria uma nova tabela `Consumo Anual` com a coluna `Consumo Anual` e a medida `Consumo Anual Value = SELECTEDVALUE(...)`.

## Step 3 — Adiciona as medidas novas (5)

No `_Measures`, **Nova medida** para cada uma:

```
TE Selected =
SWITCH(
    SELECTEDVALUE('ERSE_main'[Contagem]),
    "1", AVERAGE('ERSE_main'[TV|TVFV|TVP]),
    "2", AVERAGE('ERSE_main'[TV|TVFV|TVP]),
    "3", AVERAGE('ERSE_main'[TV|TVFV|TVP]),
    BLANK()
)
```
Format: `0.0000`

```
Fatura Anual € (s/ Impostos) =
VAR LatestDate = [Latest Snapshot]
VAR Consumo = 'Consumo Anual'[Consumo Anual Value]
VAR TFdia      = CALCULATE( AVERAGE('ERSE_main'[TF]),                                            'ERSE_main'[SnapshotDate] = LatestDate )
VAR TEkWh      = CALCULATE( AVERAGE('ERSE_main'[TV|TVFV|TVP]),                                   'ERSE_main'[SnapshotDate] = LatestDate )
VAR Desconto   = CALCULATE( AVERAGE('ERSE_main'[DescontNovoCliente_c/IVA (€/ano)]),              'ERSE_main'[SnapshotDate] = LatestDate )
VAR CustoServ  = CALCULATE( AVERAGE('ERSE_main'[CustoServicos_c/IVA (€/ano)]),                   'ERSE_main'[SnapshotDate] = LatestDate )
RETURN
    (TFdia * 365) + (TEkWh * Consumo) + COALESCE(CustoServ, 0) - COALESCE(Desconto, 0)
```
Format: `€#,0.00`

```
Fatura Anual € (c/ Impostos) =
VAR Pre = [Fatura Anual € (s/ Impostos)]
VAR IVA = 1.23
VAR DGEG = 7.50
VAR Audiovisual = 36.48
RETURN
    (Pre * IVA) + DGEG + Audiovisual
```
Format: `€#,0.00`

> **Nota**: o IVA real é 23% sobre TF e 13% sobre TE para residencial pequeno (até 6.9 kVA). A medida acima aplica 23% como aproximação simples — diferença pequena no ranking, ~5% no valor absoluto. Se precisares de precisão fiscal exacta, abrimos um cálculo separado por componente.

```
Fatura Δ vs Previous =
VAR LatestDate = [Latest Snapshot]
VAR PrevDate = [Previous Snapshot]
VAR Consumo = 'Consumo Anual'[Consumo Anual Value]
VAR TFnow  = CALCULATE( AVERAGE('ERSE_main'[TF]),          'ERSE_main'[SnapshotDate] = LatestDate )
VAR TEnow  = CALCULATE( AVERAGE('ERSE_main'[TV|TVFV|TVP]), 'ERSE_main'[SnapshotDate] = LatestDate )
VAR TFprev = CALCULATE( AVERAGE('ERSE_main'[TF]),          'ERSE_main'[SnapshotDate] = PrevDate )
VAR TEprev = CALCULATE( AVERAGE('ERSE_main'[TV|TVFV|TVP]), 'ERSE_main'[SnapshotDate] = PrevDate )
VAR Now  = (TFnow  * 365) + (TEnow  * Consumo)
VAR Prev = (TFprev * 365) + (TEprev * Consumo)
RETURN
    Now - Prev
```
Format: `+€#,0.00;-€#,0.00;€0.00`

```
Rank by Fatura =
IF(
    ISINSCOPE('ERSE_main'[OfferFamily]),
    RANKX(
        ALL('ERSE_main'[OfferFamily]),
        [Fatura Anual € (c/ Impostos)],
        ,
        ASC,
        Dense
    )
)
```
Format: `#,0`

## Step 4 — Cria a página

1. No fundo, `+` para nova página → mudar nome para `Benchmark`.
2. Tamanho da página: 1280 × 720 (igual à anterior).
3. Cor de fundo: `#F5F5F5`.

## Step 5 — Layout

```
┌────────────────────────────────────────────────────────────────┐
│  [Headline texto dinâmico]    [Cartão Cenário: Pot/Cons/Tarifa]│  ← Y=20, h=80
├────────────────────────────────────────────────────────────────┤
│  Slicer Pot_Cont │ Contagem │ Segmento │ Consumo Anual         │  ← Y=110, h=50
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Matrix por OfferFamily (top 15 por Fatura):                   │
│  Linhas: TP €/dia · TE €/kWh · Desc · Fatura · Δ Snapshot       │  ← Y=170, h=270
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│  Column chart: Fatura €/Ano por OfferFamily, ASC               │
│  Repsol = laranja, outros = cinza                              │  ← Y=450, h=240
│                                                                  │
└────────────────────────────────────────────────────────────────┘
   Page navigator                                                    ← Y=695, h=25
```

## Step 6 — Cartão "Cenário"

1. **Inserir → Caixa de texto**.
2. Posição: X=`880`, Y=`20`. Tamanho: `380 × 80`.
3. Conteúdo (mistura texto fixo + valor dinâmico — usa **Inserir valor** para o `Latest Snapshot Display`):
   ```
   Cenário Atual
   Atualizado em: [Latest Snapshot Display]
   ```
4. Plano de fundo: branco. Margem: cinza claro.

## Step 7 — Headline dinâmico

Vamos criar um título que se adapta à seleção.

1. **Nova medida** no `_Measures`:

```
Headline Dinâmico =
VAR P = SELECTEDVALUE('ERSE_main'[Pot_Cont])
VAR C = SELECTEDVALUE('ERSE_main'[Contagem])
VAR Cons = 'Consumo Anual'[Consumo Anual Value]
VAR TipoTarifa =
    SWITCH(C,
        "1", "Tarifa Simples",
        "2", "Tarifa Bi-horária",
        "3", "Tarifa Tri-horária",
        "—"
    )
RETURN
    "Benchmark: " & FORMAT(P, "0.00") & " kVA · " & TipoTarifa & " · " & FORMAT(Cons, "#,0") & " kWh/ano"
```

2. **Inserir → Caixa de texto**. Posição X=`20`, Y=`20`. Tamanho `840 × 80`.
3. **Apaga o texto inicial** e clica no botão **Inserir valor** dentro do editor da caixa de texto → seleciona a medida `Headline Dinâmico` → **Adicionar**.
4. Selecciona o texto (o tag dinâmico aparece como `[Headline Dinâmico]`) → fonte `26`, **Negrito**.

## Step 8 — Slicers (4)

Para cada slicer:
1. Clica no canvas vazio → painel **Visualizações** → ícone **Segmentação de dados**.
2. Arrasta o campo correspondente:
   - Slicer 1: `'ERSE_main'[Pot_Cont]`
   - Slicer 2: `'ERSE_main'[Contagem]`
   - Slicer 3: `'ERSE_main'[Segmento]`
   - Slicer 4: `'Consumo Anual'[Consumo Anual]` (já existe — só posiciona)

Posições:
| Slicer | X | Y | Largura | Altura |
|---|---|---|---|---|
| Pot_Cont | `20` | `120` | `300` | `50` |
| Contagem | `330` | `120` | `300` | `50` |
| Segmento | `640` | `120` | `300` | `50` |
| Consumo | `950` | `120` | `310` | `50` |

Configura cada slicer:
- Aba **Visual** → **Definições da segmentação** → **Estilo**: `Lista pendente` (dropdown) — mais limpo.
- Aba **Visual** → **Cabeçalho da segmentação**: ligado.

Selecciona defaults:
- Pot_Cont = `6,9`
- Contagem = `1`
- Segmento = `Dom`
- Consumo Anual = `3500`

## Step 9 — Visual A: Matrix

1. Painel **Visualizações** → **Matriz**.
2. Configura:
   - **Linhas**: arrasta `'ERSE_main'[OfferFamily]`
   - **Colunas**: deixa vazio
   - **Valores** (por esta ordem):
     - `Avg TF Latest` (renomeia para "TP €/dia" via clicar 2x na pílula → Mudar nome para esta visualização)
     - `Avg TV Latest` (renomeia para "TE €/kWh")
     - `Avg New-Customer Discount Latest` (renomeia "Desc. Novo €/ano")
     - `Avg Services Cost` (renomeia "Custo Serv. €/ano")
     - `Fatura Anual € (c/ Impostos)` (renomeia "Fatura €/ano")
     - `Rank by Fatura` (renomeia "#")
     - `Fatura Δ vs Previous` (renomeia "Δ vs Prev")
3. Posição: X=`20`, Y=`180`. Tamanho `1240 × 260`.
4. Aba **Visual**:
   - **Tipografia**: tamanho `11`
   - **Subtotais**: desligados (Total da linha e Total da coluna)
   - **Estilo**: aplica um tema simples (Mínimo)
5. **Filtros neste visual**: arrasta `dim_COM[ComGroup]` → seleciona `Own` + `Key Competitor` (esconde os 23 menores).
6. **Ordenação**: clica nos 3 pontos `…` do visual → **Ordenar por** → `Fatura €/ano` → ascendente.
7. **Top 15**: aba **Filtros neste visual** → encontra `OfferFamily` → muda Filter type para `Top N` → **Mostrar itens** = `Top 15` por `Fatura Anual € (c/ Impostos)`.

**Destacar Repsol**: aba **Visual** → **Elementos da célula** → **Cor de fundo** → ícone `fx` → seleciona `Regras` → 
- Quando `OfferFamily` `começa com` `Repsol` → cor de fundo `#FFE5D0` (laranja claro).

## Step 10 — Visual B: Column Chart

1. Painel **Visualizações** → **Gráfico de colunas agrupadas**.
2. Configura:
   - **Eixo X**: `'ERSE_main'[OfferFamily]`
   - **Eixo Y**: `Fatura Anual € (c/ Impostos)`
3. Posição: X=`20`, Y=`450`. Tamanho `1240 × 240`.
4. **Filtros neste visual**: igual à matrix (Key Competitors + Own, Top 15 por Fatura ASC).
5. **Ordenar**: 3 pontos `…` → **Ordenar por** → `Fatura €/ano` → ascendente.
6. **Cor por valor**: aba **Visual** → **Colunas** → **Cores** → ícone `fx` → 
   - Cria uma medida no `_Measures`:

```
Bar Color Benchmark =
IF(
    SELECTEDVALUE(dim_COM[IsOwnCompany]) = TRUE(),
    "#E87722",
    "#888888"
)
```

   - No `fx` → **Formato baseado em**: Valor do campo → `Bar Color Benchmark`.
7. **Etiquetas de dados**: ligadas. Tamanho `10`. Mostrar `Fatura €/ano`.
8. **Linha de constante** (média de mercado): aba **Visual** → secção **Linhas** → adiciona linha → tipo **Média** sobre `Fatura Anual € (c/ Impostos)`. Cor cinza tracejado.
9. Aba **Geral** → **Título**: `Fatura Anual €/Ano por Oferta`. Negrito.

## Step 11 — Insight panel (opcional)

Caixa de texto pequena no canto superior direito do chart com Δ:
1. **Nova medida**:

```
Insight Snapshot =
VAR R = CALCULATE([Rank by Fatura], dim_COM[IsOwnCompany] = TRUE())
VAR Tot = COUNTROWS( CALCULATETABLE(VALUES('ERSE_main'[OfferFamily]), dim_COM[IsKeyCompetitor] = TRUE() || dim_COM[IsOwnCompany] = TRUE()) )
VAR Diff = CALCULATE([Fatura Δ vs Previous], dim_COM[IsOwnCompany] = TRUE())
RETURN
    "Repsol está em " & R & "º de " & Tot & " · " &
    SWITCH(TRUE(),
        Diff > 0, "subiu " & FORMAT(Diff, "€#,0.00") & " desde a última snapshot",
        Diff < 0, "desceu " & FORMAT(ABS(Diff), "€#,0.00") & " desde a última snapshot",
        "sem mudança vs snapshot anterior"
    )
```

2. **Inserir → Caixa de texto** posicionada por cima da matrix (X=`20`, Y=`160`, h=`20`). Insere a medida `Insight Snapshot`. Fonte `12`, *itálico*.

## Step 12 — Polimento final

- Alinhar slicers e visuais (Ctrl+clique múltiplo + friso **Formato → Distribuir horizontalmente**).
- Filtros nesta página: garante que `dim_COM[ComGroup]` está em `Own + Key Competitor + Regulated` (default).
- Guarda Ctrl+S.

## Caveats explicitamente declarados

- **Vigência de descontos (3m/6m/12m)** não está disponível como dados estruturados — vive em campos de texto livre (`TxTOferta`, `TxTFidelização`). A medida `Fatura €/ano` aplica o desconto agregado anual `DescontNovoCliente_c/IVA`. Não distingue "desconto só nos primeiros 3 meses" de "desconto contínuo".
- **IVA é simplificado** (23% flat). Real é 23% TF + 13% TE para residencial até 6.9 kVA. Diferença ~5% no valor absoluto, sem efeito no ranking.
- **OfferFamily** agrupa nomes de ofertas usando padrões de texto. Pode não cobrir 100% dos casos — a regra "default" cai para o COM code. Ajusta o `SWITCH` quando vires categorias mal classificadas.
- **Comparação por OfferFamily, não por COD_Proposta**: cada família pode conter 5-30 ofertas distintas. As médias `Avg TF Latest`, `Avg TV Latest` reflectem isso. Se quiseres ver oferta-a-oferta dentro de uma família, faz drill-through ou expande no matrix.

## Roadmap futuro

- Bookmarks pré-configurados para cenários comuns (6.9 kVA Simples Dom 3500 kWh, etc.) → 1 clique para gerar a vista que cada PDF Repsol mostra.
- Twin-bar chart com pré/pós-desconto sobreposto → necessita custom visual ou clustered column com 2 séries.
- Discount vigência (3m/6m/12m) → exigirá parsing dos campos de texto livre. Pode ser feito em Power Query com um conjunto de regras regex.
- Replicar exactamente os números Repsol — calibração fina das taxas (IVA por componente, TAR, audiovisual) com base no simulador ERSE.

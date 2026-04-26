# ERSE Competitive — Power BI Report Pages

Page-by-page specification for the report. Builds on the data model in `erse-power-bi-measures.md`. Optimized for the strategy team's question set: *"who is moving prices, where are we, and what's launching?"*

10 pages. Each page lists: visuals, slicers, conditional formatting, and the strategic question it answers.

---

## Global navigation & theme

- Add a **Page navigator** visual (Insert → Buttons → Navigator → Page navigator) on every page in the same position. Lets users hop between pages without scrolling.
- Add three **report-level slicers** in the Filters pane:
  - `dim_COM[ComGroup]` — default selection: `Own` + `Key Competitor`
  - `'ERSE_main'[Fornecimento]` — default: `ELE` + `DUAL`
  - `'ERSE_main'[Pot_Cont]` — default: `6.9` (most-common residential)
- Pin a header text box on every page: `[Latest Snapshot Display]` — so the user always sees how fresh the data is.
- Theme: pick one accent color for **Own**, one neutral for **Key Competitors**, one muted for **Other**. Apply consistently across visuals.

---

## Page 1 — Cover (KPIs)

**Question**: *"Is the data fresh, and what's the headline this week?"*

**Visuals**:

| Position | Visual | Configuration |
|---|---|---|
| Top banner | Text box | Title: "ERSE Competitive — Mercado de Eletricidade & Gás Natural". Subtitle (text formula): `"Última atualização: " & [Latest Snapshot Display]` |
| KPI row 1 | Card × 4 | `# Active Offers`, `# Active Competitors`, `Days Since Last Update`, `# Snapshots` |
| KPI row 2 | Card × 4 | `# New Offers (Since Previous)`, `# Offers Discontinued (Since Previous)`, `# Price Changes (Since Previous)`, `# New Offers (Last 30d)` |
| Centerpiece | Multi-row card | `Own TF Latest`, `Market TF Latest (excl. Own)`, `Own vs Market TF Δ`, `Own vs Market TF %` (with conditional color: green if Own < Market, red if Own > Market) |
| Bottom-left | Bar chart | Y: `dim_COM[Comercializador]`, X: `[# Active Offers]`. Filter to Key Competitors + Own. Sort descending. Highlight Own bar. |
| Bottom-right | Donut chart | Legend: `'ERSE_main'[Fornecimento]`, Values: `[# Active Offers]` |

**Conditional formatting**: cards with `Δ` measures should color-format the value (green descending, red ascending — because lower TF is better positioning).

---

## Page 2 — Mercado: Visão Geral

**Question**: *"What does the market look like — who has the most offers, what's the modalidade mix?"*

**Visuals**:

| Position | Visual | Configuration |
|---|---|---|
| Top-left | Stacked bar chart | Y-axis: `dim_COM[Comercializador]`, X-axis: `[# Active Offers]`, Legend: `'ERSE_main'[Fornecimento]`. Sort desc. |
| Top-right | Multi-row card | `% Indexed Offers`, `% Fixed Offers`, `% Domestic Offers`, `% Dual Offers`, `% New Customer Only Offers` |
| Mid-left | Treemap | Group: `dim_COM[ComGroup]` then `dim_COM[Comercializador]`, Values: `[# Active Offers]` |
| Mid-right | Pie chart | Legend: `'ERSE_main'[Segmento]` (Dom/Ndom/Tod), Values: `[# Active Offers]` |
| Bottom | Matrix | Rows: `dim_COM[Comercializador]`, Columns: `'ERSE_main'[Contagem]`, Values: `[# Active Offers]`. Filter Key Competitors + Own. |

**Slicers**: `'ERSE_main'[Segmento]`, `'ERSE_main'[FiltroPrecosIndex_ELE]`.

---

## Page 3 — Posicionamento de Preços (TF)

**Question**: *"For the fixed term, where do we stand vs each competitor at each power tier?"*

**Visuals**:

| Position | Visual | Configuration |
|---|---|---|
| Centerpiece | Matrix | Rows: `dim_COM[Comercializador]`, Columns: `'ERSE_main'[Pot_Cont]`, Values: `[Avg TF Latest]`. Conditional formatting: heat map (green low → red high). Highlight Own row (bold + brand color). |
| Right side | Bar chart | Y: `dim_COM[Comercializador]`, X: `[Distance to Cheapest TF]`. Filter Key Competitors + Own. Sort asc. |
| Bottom-left | Card | `[TF Position Label]` — slicer-driven |
| Bottom-right | Bar chart | Y: `dim_COM[Comercializador]`, X: `[Avg TF Latest]`. Filter Key Competitors + Own. Sort asc. Reference line: `[Market TF Latest (excl. Own)]`. |

**Slicers**: `'ERSE_main'[Segmento]`, `'ERSE_main'[Contagem]`, `'ERSE_main'[FiltroPrecosIndex_ELE]`.

---

## Page 4 — Posicionamento de Preços (TV)

**Question**: *"Same as Page 3, but for the variable term — the price per kWh during peak hours."*

Same layout as Page 3 but swap every `TF` measure for the corresponding `TV` measure. Add a small panel for `TVV` (off-peak):

| Position | Visual |
|---|---|
| Side panel | Card row: `[Avg TVV Latest]`, `[Min TVV Latest]`, `[Avg TVVz Latest]`, `[Min TVVz Latest]` |

---

## Page 5 — What's New (Últimos 30 dias)

**Question**: *"Which offers launched in the last 30 days, and what are they like?"*

**Visuals**:

| Position | Visual | Configuration |
|---|---|---|
| Top | Card | `[# New Offers (Last 30d)]` (large) |
| Centerpiece | Table | Columns: `dim_COM[Comercializador]`, `'ERSE_main'[NomeProposta]`, `'ERSE_main'[Pot_Cont]`, `'ERSE_main'[Contagem]`, `'ERSE_main'[TF]`, `'ERSE_main'[TV\|TVFV\|TVP]`, `'ERSE_main'[Data ini]`, `'ERSE_main'[DescontNovoCliente_c/IVA (€/ano)]`. Filter: only offers whose `FirstSeen` is within last 30 days (use a measure or a calculated column). |
| Right | Bar chart | Y: `dim_COM[Comercializador]`, X: count of new offers in last 30d, sorted desc. |
| Bottom | Timeline | X: `'ERSE_main'[Data ini]`, Y: count of new offers per launch date |

For the table filter, create a calculated column on `ERSE_main`:

```
IsNewLast30d =
VAR ThisCod = 'ERSE_main'[COD_Proposta]
VAR FirstSeen =
    CALCULATE(
        MIN('ERSE_main'[SnapshotDate]),
        ALLEXCEPT('ERSE_main', 'ERSE_main'[COD_Proposta])
    )
VAR LatestDate =
    CALCULATE(
        MAX('ERSE_main'[SnapshotDate]),
        ALL('ERSE_main')
    )
RETURN
    IF(FirstSeen >= LatestDate - 30, 1, 0)
```

Then filter the visual to `IsNewLast30d = 1`.

---

## Page 6 — Change Log (Histórico de Mudanças)

**Question**: *"How have prices moved over time, broken down by competitor?"*

**Visuals**:

| Position | Visual | Configuration |
|---|---|---|
| Top-left | Line chart | X: `'ERSE_main'[SnapshotDate]`, Y: `[Avg TF Latest]` (rename to "TF Médio"), Legend: `dim_COM[Comercializador]`. Filter Key Competitors + Own. |
| Top-right | Line chart | Same but for `[Avg TV Latest]`. |
| Bottom-left | Bar chart | Y: `dim_COM[Comercializador]`, X: `[TF Δ vs Previous]`. Conditional color: red if positive (price went up), green if negative. |
| Bottom-right | Bar chart | Y: `dim_COM[Comercializador]`, X: `[TV Δ vs Previous]`. Same conditional formatting. |

**Slicers**: `'ERSE_main'[Pot_Cont]`, `'ERSE_main'[Contagem]`, `dim_COM[ComGroup]`, time slider on `SnapshotDate`.

---

## Page 7 — Promoções & Descontos

**Question**: *"Who's being aggressive on new-customer promotions?"*

**Visuals**:

| Position | Visual | Configuration |
|---|---|---|
| Top | KPI cards | `[Avg New-Customer Discount Latest]`, `[Max New-Customer Discount Latest]`, `[# Offers With New-Customer Discount]`, `[% Offers With Discount]` |
| Mid-left | Bar chart | Y: `dim_COM[Comercializador]`, X: `[Avg New-Customer Discount Latest]`. Sort desc. |
| Mid-right | Bar chart | Y: `dim_COM[Comercializador]`, X: `[# Offers With New-Customer Discount]`. Sort desc. |
| Bottom | Table | Top 20 offers by `DescontNovoCliente_c/IVA (€/ano)`. Columns: `Comercializador`, `NomeProposta`, `Pot_Cont`, `Discount value`, `TF`, `TV\|TVFV\|TVP`, `DuracaoContrato`. |

---

## Page 8 — Tendências de Mercado

**Question**: *"How is the market moving — toward indexed? toward dual? toward longer contracts?"*

**Visuals**:

| Position | Visual | Configuration |
|---|---|---|
| Top-left | Line chart | X: `SnapshotDate`, Y: `[% Indexed Offers]`, no legend (single line) |
| Top-right | Line chart | X: `SnapshotDate`, Y: `[% Dual Offers]` |
| Mid-left | 100% stacked column | X: `SnapshotDate`, Legend: `'ERSE_main'[Fornecimento]`, Values: `[# Active Offers]` |
| Mid-right | 100% stacked column | X: `SnapshotDate`, Legend: `'ERSE_main'[Contagem]`, Values: `[# Active Offers]` |
| Bottom | Line chart | X: `SnapshotDate`, Y: `[Avg Contract Duration]`, Legend: `dim_COM[Comercializador]`. Filter Key Competitors + Own. |

---

## Page 9 — Catálogo Completo de Ofertas

**Question**: *"Show me everything currently available; let me filter."*

**Visuals**:

A single huge table with these columns (one row per Precos row at latest snapshot):

| Column | Source |
|---|---|
| Comercializador | `dim_COM[Comercializador]` |
| Oferta | `'ERSE_main'[NomeProposta]` |
| Segmento | `'ERSE_main'[Segmento]` |
| Fornecimento | `'ERSE_main'[Fornecimento]` |
| Contagem | `'ERSE_main'[Contagem]` |
| Potência | `'ERSE_main'[Pot_Cont]` |
| TF | `'ERSE_main'[TF]` |
| TV (Ponta) | `'ERSE_main'[TV\|TVFV\|TVP]` |
| TVV (Vazio) | `'ERSE_main'[TVV\|TVC]` |
| Duração (m) | `'ERSE_main'[DuracaoContrato]` |
| Indexada? | `'ERSE_main'[FiltroPrecosIndex_ELE]` |
| Tarifa Social? | `'ERSE_main'[FiltroTarifaSocial]` |
| Só novos clientes? | `'ERSE_main'[FiltroNovosClientes]` |
| Desconto Novo Cliente | `'ERSE_main'[DescontNovoCliente_c/IVA (€/ano)]` |
| Custo Serviços | `'ERSE_main'[CustoServicos_c/IVA (€/ano)]` |

**Filter**: only latest snapshot. Use a measure-based filter or a page-level filter on `[Latest Snapshot]`.

**Slicers**: every dimension on the side — `dim_COM[Comercializador]`, `Segmento`, `Fornecimento`, `Contagem`, `Pot_Cont`, `FiltroPrecosIndex_ELE`, `FiltroNovosClientes`, `FiltroTarifaSocial`. Use the **dropdown / multi-select** slicer mode for clean UI.

---

## Page 10 — Metodologia & Qualidade dos Dados

**Question**: *"How do I trust this report?"*

**Content** (text boxes + small visuals):

- **Fonte**: ERSE Simulador de Preços (`https://simuladorprecos.erse.pt`). Dados públicos, atualizados sempre que os comercializadores reportem alterações.
- **Cadência**: descarga diária às 08:00. Salta o trabalho se o `csvPath` não mudou desde a última atualização (logo, só processa quando há novidades genuínas).
- **Histórico**: snapshot mais antigo carregado em ___-___-___. Quantos snapshots estão disponíveis: `[# Snapshots]`. Cada snapshot é a totalidade dos preços comerciais no momento em que a ERSE publicou.
- **Limitações conhecidas**:
  - Nem todos os snapshots intermédios estão preservados — a ERSE substitui o ficheiro a cada atualização. Recuperaram-se 16 snapshots históricos via Wayback Machine; os restantes estão perdidos.
  - O preço apresentado é o tarifário base do plano. Descontos por débito direto, fatura eletrónica e parcerias podem reduzir o preço efetivo — esses descontos vivem no campo `DescontNovoCliente_c/IVA (€/ano)` quando aplicáveis a novos clientes.
  - Para clientes existentes, o desconto aplicado depende da configuração contratual e não é refletido nos preços ERSE.
- **Refrescamento**: o Power BI carrega o `Main\ERSE_main.csv` que é reconstruído pela flow do PAD. Para forçar refresh manual: Base → Atualizar.
- **Contacto / dúvidas**: \<inserir o teu nome e e-mail\>

Add a small visual: line chart of `[Activity Score (Last 30d)]` over time — mostra o nível de movimento do mercado.

---

## Final polish checklist

Before sharing the report:

- [ ] Every page has the page navigator visual in the same position
- [ ] Every page shows `[Latest Snapshot Display]` in the header
- [ ] Theme colors are consistent (Own = brand color, Key = neutral, Other = muted)
- [ ] Tooltips configured on each visual (right-click → Tooltip → set Title and Fields)
- [ ] Cross-filtering reviewed (some visuals shouldn't filter each other — set Edit interactions)
- [ ] Number formats correct (€ for currency, decimals for prices, % for percentages)
- [ ] Sort orders set on every chart (descending for "ranking", ascending for "cheapest first")
- [ ] Mobile layout (View → Mobile layout) — at minimum Pages 1 and 3
- [ ] Sensitivity label set if applicable
- [ ] File saved as `.pbix`, NOT pushed to public repos (it bundles the data)

---

## Suggested presentation order to the manager

1. Open on **Page 1 (Cover)**: "Vê o estado do mercado de relance — última atualização, número de ofertas activas, comparação directa com a concorrência."
2. **Page 3 (Posicionamento TF)**: "Aqui mostra-se onde estamos por nível de potência — vês logo quem é mais barato."
3. **Page 5 (What's New)**: "Estas são as ofertas que lançaram nas últimas 4 semanas — o que monitorizamos para responder rápido."
4. **Page 6 (Change Log)**: "Tendência ao longo do tempo — quem está a baixar, quem está a subir."
5. **Page 7 (Promoções)**: "Quem é mais agressivo a captar novos clientes."

Pages 2, 4, 8, 9, 10 are para drill-down e suporte; ficam disponíveis pelo navigator quando alguém quer aprofundar.

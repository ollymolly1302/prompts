# ERSE Competitive — Power BI Data Model & Measures

Comprehensive Power BI build on top of the `ERSE_main.csv` produced by the auto-download flow. Includes the data model setup (table types, `dim_COM` competitor table, relationships), and 51 DAX measures organized in 11 folders for serious competitive intelligence.

---

## ERSE_main — schema reference

24 columns produced by the latest version of the auto-download script:

| # | Column | Type | Notes |
|---|---|---|---|
| 1 | `COM` | Text | Competitor code |
| 2 | `Pot_Cont` | Decimal | Contracted power (kVA) |
| 3 | `Escalao` | Text | Gas consumption band |
| 4 | `COD_Proposta` | Text | Offer ID |
| 5 | `Contagem` | Text | `1`=Simples, `2`=Bi-horária, `3`=Tri-horária, blank=gas only |
| 6 | `TF` | Decimal | Termo Fixo electricity (€/dia) |
| 7 | `TV\|TVFV\|TVP` | Decimal | Main variable term (price during peak/cheias hours) |
| 8 | `TVV\|TVC` | Decimal | Off-peak/middle variable term |
| 9 | `TVVz` | Decimal | Tri-horária vazio (off-peak) |
| 10 | `TFGN` | Decimal | Termo Fixo gas natural |
| 11 | `TVGN` | Decimal | Termo Variável gas natural |
| 12 | `NomeProposta` | Text | Commercial offer name |
| 13 | `Segmento` | Text | `Dom`/`Ndom`/`Tod` |
| 14 | `TipoContagem` | Text | Supported contagem codes per offer |
| 15 | `Fornecimento` | Text | `ELE`/`GN`/`DUAL` |
| 16 | `DuracaoContrato` | Decimal | Months |
| 17 | `Data ini` | Date | Offer start (note name has space) |
| 18 | `Data fim` | Date | Offer end (note name has space) |
| 19 | `FiltroPrecosIndex_ELE` | Text | `S`/`N` — indexed pricing flag |
| 20 | `FiltroTarifaSocial` | Text | `S`/`N` — social tariff flag |
| 21 | `FiltroNovosClientes` | Text | `S`/`N` — new-customer-only flag |
| 22 | `CustoServicos_c/IVA (€/ano)` | Decimal | Bundled services cost (annual) |
| 23 | `DescontNovoCliente_c/IVA (€/ano)` | Decimal | New-customer discount value |
| 24 | `SnapshotDate` | Date/Time | ERSE publication time |

**Important**: pipe `\|` in column names is a literal `|`. Reference in DAX: `'ERSE_main'[TV|TVFV|TVP]` — the brackets handle special chars literally.

---

## Step 1 — Power Query setup

In the Power Query Editor (Base → Transformar dados):

1. Select query `ERSE_main` → **Definições da Origem** → set **Origem do ficheiro** locale to **"Português (Portugal)"** (so commas decode as decimals).
2. Set column types (right-click each column header → Tipo de dados):
   - Date/Time: `SnapshotDate`
   - Date: `Data ini`, `Data fim`
   - Decimal Number: `Pot_Cont`, all six price columns (TF, TV|TVFV|TVP, TVV|TVC, TVVz, TFGN, TVGN), `DuracaoContrato`, `CustoServicos_c/IVA (€/ano)`, `DescontNovoCliente_c/IVA (€/ano)`
   - Text: everything else
3. Apply.

If Power Query refuses to convert empty cells in the price columns: replace empty with `null` first (right-click column → Substituir Valores → empty → null), then convert.

---

## Step 2 — Create the `dim_COM` table

This is the competitor dimension. It joins to `ERSE_main` on `COM` and lets visuals filter cleanly to "Own Company", "Key Competitors", etc.

### How to add it

In Power BI Desktop:

1. Modeling ribbon → **New table**.
2. Paste the DAX below.

```dax
dim_COM = 
DATATABLE(
    "COM", STRING,
    "Comercializador", STRING,
    "IsOwnCompany", BOOLEAN,
    "IsKeyCompetitor", BOOLEAN,
    "ComGroup", STRING,
    {
        // Replace <YourCompanyCOM> and "<Your Company Name>" with your actual codes
        {"<YourCompanyCOM>", "<Your Company Name>", TRUE, FALSE, "Own"},

        // Major competitors — set IsKeyCompetitor = TRUE for the ones you want pinned in visuals
        {"EDPC",         "EDP",         FALSE, TRUE,  "Key Competitor"},
        {"GALP",         "Galp",        FALSE, TRUE,  "Key Competitor"},
        {"END",          "Endesa",      FALSE, TRUE,  "Key Competitor"},
        {"IBD",          "Iberdrola",   FALSE, TRUE,  "Key Competitor"},
        {"GOLD",         "Gold Energy", FALSE, TRUE,  "Key Competitor"},
        {"ENIPLENITUDE", "Plenitude",   FALSE, TRUE,  "Key Competitor"},
        {"G9ENERGY",     "G9",          FALSE, TRUE,  "Key Competitor"},
        {"MEOENERGIA",   "MEO",         FALSE, TRUE,  "Key Competitor"},

        // Other suppliers (not flagged as key — IsKeyCompetitor = FALSE)
        {"ALFAENERGIA",   "Alfa Energia",   FALSE, FALSE, "Other"},
        {"AUDAX",         "Audax",          FALSE, FALSE, "Other"},
        {"AXPO",          "Axpo",           FALSE, FALSE, "Other"},
        {"COOP",          "Coopérnico",     FALSE, FALSE, "Other"},
        {"CUR",           "CUR",            FALSE, FALSE, "Other"},
        {"DOUROGAS",      "Dourogás",       FALSE, FALSE, "Other"},
        {"ELERGONE",      "Elergone",       FALSE, FALSE, "Other"},
        {"EZUENERGIA",    "EZU",            FALSE, FALSE, "Other"},
        {"IBELECTRA",     "Ibelectra",      FALSE, FALSE, "Other"},
        {"JAFPLUS",       "JAF Plus",       FALSE, FALSE, "Other"},
        {"LOGICA",        "Lógica Energy",  FALSE, FALSE, "Other"},
        {"LUZBOA",        "LuzBoa",         FALSE, FALSE, "Other"},
        {"LUZIGAS",       "LuziGás",        FALSE, FALSE, "Other"},
        {"MUON",          "Muon",           FALSE, FALSE, "Other"},
        {"NABALIAENERGIA","Nabalia",        FALSE, FALSE, "Other"},
        {"NOSSAENERGIA",  "Nossa Energia",  FALSE, FALSE, "Other"},
        {"OENEO",         "OENEO",          FALSE, FALSE, "Other"},
        {"PORTULOGOS",    "Portulogos",     FALSE, FALSE, "Other"},
        {"TUR",           "TUR (Regulado)", FALSE, FALSE, "Regulated"},
        {"U1",            "U1",             FALSE, FALSE, "Other"},
        {"USENERGY",      "USEnergy",       FALSE, FALSE, "Other"},
        {"YESENERGY",     "Yes Energy",     FALSE, FALSE, "Other"},
        {"ZUG POWER",     "ZUG Power",      FALSE, FALSE, "Other"}
    }
)
```

### Add the relationship

1. Model view → drag `ERSE_main[COM]` onto `dim_COM[COM]`.
2. Cardinality: **Many-to-one** (ERSE_main is many, dim_COM is one).
3. Cross-filter direction: **Single** (default).

After this, every measure / visual can filter by `dim_COM[IsOwnCompany]` or `dim_COM[IsKeyCompetitor]` instead of hardcoding COM lists.

---

## Step 3 — Create the `_Measures` table

A blank table that holds every measure.

1. Home ribbon → **Inserir dados**.
2. Leave default cell. Name the column `Placeholder`. Name the table `_Measures` (underscore sorts to top).
3. Click **Carregar**.
4. Right-click `Placeholder` column → **Ocultar na vista de relatório**.

---

## Step 4 — Create all 51 measures

For each measure below: right-click `_Measures` → **Nova medida** → paste the DAX → Enter → in the **Propriedades** pane on the right, set **Display folder** and **Format string**.

> **DAX cardinal rule**: never reference a measure directly in a `CALCULATE` Boolean filter (`column = [Measure]`). Always wrap with `VAR LatestDate = [Latest Snapshot] RETURN CALCULATE(..., column = LatestDate)`. The error message `function 'PLACEHOLDER'` is the symptom of breaking this rule.

---

### Folder: Snapshots

```
Latest Snapshot = MAX('ERSE_main'[SnapshotDate])
```
Format: `dd/mm/yyyy hh:mm:ss`

```
Previous Snapshot =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MAX('ERSE_main'[SnapshotDate]),
    'ERSE_main'[SnapshotDate] < LatestDate
)
```
Format: `dd/mm/yyyy hh:mm:ss`

```
Latest Snapshot Display = FORMAT([Latest Snapshot], "dd/mm/yyyy hh:mm")
```

```
# Snapshots = DISTINCTCOUNT('ERSE_main'[SnapshotDate])
```
Format: `#,0`

```
Days Since Last Update = DATEDIFF([Latest Snapshot], NOW(), DAY)
```
Format: `#,0`

### Folder: Counts

```
# Active Competitors =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    DISTINCTCOUNT('ERSE_main'[COM]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `#,0`

```
# Active Offers =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `#,0`

```
# New Offers (Since Previous) =
VAR LatestDate = [Latest Snapshot]
VAR PrevDate = [Previous Snapshot]
VAR LatestOffers =
    CALCULATETABLE(VALUES('ERSE_main'[COD_Proposta]), 'ERSE_main'[SnapshotDate] = LatestDate)
VAR PrevOffers =
    CALCULATETABLE(VALUES('ERSE_main'[COD_Proposta]), 'ERSE_main'[SnapshotDate] = PrevDate)
RETURN
    COUNTROWS(EXCEPT(LatestOffers, PrevOffers))
```
Format: `#,0`

```
# Offers Discontinued (Since Previous) =
VAR LatestDate = [Latest Snapshot]
VAR PrevDate = [Previous Snapshot]
VAR LatestOffers =
    CALCULATETABLE(VALUES('ERSE_main'[COD_Proposta]), 'ERSE_main'[SnapshotDate] = LatestDate)
VAR PrevOffers =
    CALCULATETABLE(VALUES('ERSE_main'[COD_Proposta]), 'ERSE_main'[SnapshotDate] = PrevDate)
RETURN
    COUNTROWS(EXCEPT(PrevOffers, LatestOffers))
```
Format: `#,0`

```
# New Offers (Last 30d) =
VAR LatestDate = [Latest Snapshot]
VAR Cutoff = LatestDate - 30
VAR FirstSeenPerOffer =
    ADDCOLUMNS(
        VALUES('ERSE_main'[COD_Proposta]),
        "FirstSeen",
        CALCULATE(MIN('ERSE_main'[SnapshotDate]))
    )
RETURN
    COUNTROWS(FILTER(FirstSeenPerOffer, [FirstSeen] >= Cutoff))
```
Format: `#,0`

### Folder: Pricing - Current (Peak/Simples)

These use `TV|TVFV|TVP` — the main variable term that applies to peak / simples customers.

```
Avg TF Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    AVERAGE('ERSE_main'[TF]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Min TF Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MIN('ERSE_main'[TF]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Max TF Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MAX('ERSE_main'[TF]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
TF Spread Latest = [Max TF Latest] - [Min TF Latest]
```
Format: `0.0000`

```
Avg TV Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    AVERAGE('ERSE_main'[TV|TVFV|TVP]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Min TV Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MIN('ERSE_main'[TV|TVFV|TVP]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Max TV Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MAX('ERSE_main'[TV|TVFV|TVP]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
TV Spread Latest = [Max TV Latest] - [Min TV Latest]
```
Format: `0.0000`

### Folder: Pricing - Off-Peak

These use `TVV|TVC` (vazio bi-horária / cheias tri-horária) and `TVVz` (vazio tri-horária).

```
Avg TVV Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    AVERAGE('ERSE_main'[TVV|TVC]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Avg TVVz Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    AVERAGE('ERSE_main'[TVVz]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Min TVV Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MIN('ERSE_main'[TVV|TVC]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Min TVVz Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MIN('ERSE_main'[TVVz]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

### Folder: Pricing - Gas

```
Avg TFGN Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    AVERAGE('ERSE_main'[TFGN]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Avg TVGN Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    AVERAGE('ERSE_main'[TVGN]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Min TFGN Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MIN('ERSE_main'[TFGN]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Min TVGN Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MIN('ERSE_main'[TVGN]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

### Folder: Pricing - Changes

```
Avg TF Previous =
VAR PrevDate = [Previous Snapshot]
RETURN
CALCULATE(
    AVERAGE('ERSE_main'[TF]),
    'ERSE_main'[SnapshotDate] = PrevDate
)
```
Format: `0.0000`

```
TF Delta vs Previous = [Avg TF Latest] - [Avg TF Previous]
```
Format: `+0.0000;-0.0000;0.0000`

```
TF % vs Previous = DIVIDE([TF Delta vs Previous], [Avg TF Previous])
```
Format: `+0.00%;-0.00%;0.00%`

```
Avg TV Previous =
VAR PrevDate = [Previous Snapshot]
RETURN
CALCULATE(
    AVERAGE('ERSE_main'[TV|TVFV|TVP]),
    'ERSE_main'[SnapshotDate] = PrevDate
)
```
Format: `0.0000`

```
TV Delta vs Previous = [Avg TV Latest] - [Avg TV Previous]
```
Format: `+0.0000;-0.0000;0.0000`

```
TV % vs Previous = DIVIDE([TV Delta vs Previous], [Avg TV Previous])
```
Format: `+0.00%;-0.00%;0.00%`

```
# Price Changes (Since Previous) =
VAR LatestDate = [Latest Snapshot]
VAR PrevDate = [Previous Snapshot]
VAR Pairs =
    ADDCOLUMNS(
        SUMMARIZE('ERSE_main', 'ERSE_main'[COD_Proposta], 'ERSE_main'[Pot_Cont], 'ERSE_main'[Contagem]),
        "LatestTF", CALCULATE(MAX('ERSE_main'[TF]), 'ERSE_main'[SnapshotDate] = LatestDate),
        "PrevTF",   CALCULATE(MAX('ERSE_main'[TF]), 'ERSE_main'[SnapshotDate] = PrevDate),
        "LatestTV", CALCULATE(MAX('ERSE_main'[TV|TVFV|TVP]), 'ERSE_main'[SnapshotDate] = LatestDate),
        "PrevTV",   CALCULATE(MAX('ERSE_main'[TV|TVFV|TVP]), 'ERSE_main'[SnapshotDate] = PrevDate)
    )
RETURN
    COUNTROWS(
        FILTER(
            Pairs,
            (NOT ISBLANK([LatestTF]) && NOT ISBLANK([PrevTF]) && [LatestTF] <> [PrevTF]) ||
            (NOT ISBLANK([LatestTV]) && NOT ISBLANK([PrevTV]) && [LatestTV] <> [PrevTV])
        )
    )
```
Format: `#,0`

```
Trend Direction TF =
SWITCH(
    TRUE(),
    [TF Delta vs Previous] > 0, "↑ Subiu",
    [TF Delta vs Previous] < 0, "↓ Desceu",
    "= Igual"
)
```

### Folder: Ranking

```
Rank by TF (Key Competitors) =
IF(
    ISINSCOPE(dim_COM[COM]),
    CALCULATE(
        RANKX(
            CALCULATETABLE(VALUES(dim_COM[COM]), dim_COM[IsKeyCompetitor] = TRUE() || dim_COM[IsOwnCompany] = TRUE()),
            [Avg TF Latest],
            ,
            ASC,
            Dense
        )
    )
)
```
Format: `#,0`

```
Rank by TV (Key Competitors) =
IF(
    ISINSCOPE(dim_COM[COM]),
    CALCULATE(
        RANKX(
            CALCULATETABLE(VALUES(dim_COM[COM]), dim_COM[IsKeyCompetitor] = TRUE() || dim_COM[IsOwnCompany] = TRUE()),
            [Avg TV Latest],
            ,
            ASC,
            Dense
        )
    )
)
```
Format: `#,0`

```
Distance to Cheapest TF =
[Avg TF Latest] -
CALCULATE(
    [Min TF Latest],
    ALL(dim_COM[COM])
)
```
Format: `+0.0000;-0.0000;0.0000`

```
Distance to Avg TF =
VAR LatestDate = [Latest Snapshot]
RETURN
[Avg TF Latest] -
CALCULATE(
    AVERAGE('ERSE_main'[TF]),
    'ERSE_main'[SnapshotDate] = LatestDate,
    ALL(dim_COM[COM])
)
```
Format: `+0.0000;-0.0000;0.0000`

```
TF Position Label =
VAR R = [Rank by TF (Key Competitors)]
RETURN
    IF(
        NOT ISBLANK(R),
        R & "º mais barato",
        BLANK()
    )
```

### Folder: Own vs Market

These compare your own company directly to the market. They depend on `dim_COM[IsOwnCompany]` being TRUE for your COM.

```
Own TF Latest =
CALCULATE(
    [Avg TF Latest],
    dim_COM[IsOwnCompany] = TRUE()
)
```
Format: `0.0000`

```
Market TF Latest (excl. Own) =
CALCULATE(
    [Avg TF Latest],
    dim_COM[IsOwnCompany] = FALSE(),
    dim_COM[IsKeyCompetitor] = TRUE()
)
```
Format: `0.0000`

```
Own vs Market TF Δ =
[Own TF Latest] - [Market TF Latest (excl. Own)]
```
Format: `+0.0000;-0.0000;0.0000`

```
Own vs Market TF % =
DIVIDE(
    [Own vs Market TF Δ],
    [Market TF Latest (excl. Own)]
)
```
Format: `+0.00%;-0.00%;0.00%`

```
Own TV Latest =
CALCULATE(
    [Avg TV Latest],
    dim_COM[IsOwnCompany] = TRUE()
)
```
Format: `0.0000`

```
Market TV Latest (excl. Own) =
CALCULATE(
    [Avg TV Latest],
    dim_COM[IsOwnCompany] = FALSE(),
    dim_COM[IsKeyCompetitor] = TRUE()
)
```
Format: `0.0000`

```
Own vs Market TV Δ = [Own TV Latest] - [Market TV Latest (excl. Own)]
```
Format: `+0.0000;-0.0000;0.0000`

```
Own vs Market TV % =
DIVIDE(
    [Own vs Market TV Δ],
    [Market TV Latest (excl. Own)]
)
```
Format: `+0.00%;-0.00%;0.00%`

### Folder: Discounts & Promos

```
Avg New-Customer Discount Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    AVERAGE('ERSE_main'[DescontNovoCliente_c/IVA (€/ano)]),
    'ERSE_main'[SnapshotDate] = LatestDate,
    'ERSE_main'[DescontNovoCliente_c/IVA (€/ano)] > 0
)
```
Format: `€#,0.00`

```
Max New-Customer Discount Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MAX('ERSE_main'[DescontNovoCliente_c/IVA (€/ano)]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `€#,0.00`

```
# Offers With New-Customer Discount =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
    'ERSE_main'[SnapshotDate] = LatestDate,
    'ERSE_main'[DescontNovoCliente_c/IVA (€/ano)] > 0
)
```
Format: `#,0`

```
% Offers With Discount =
VAR LatestDate = [Latest Snapshot]
VAR Total =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = LatestDate
    )
RETURN
    DIVIDE([# Offers With New-Customer Discount], Total)
```
Format: `0.0%`

### Folder: Mix

```
% Indexed Offers =
VAR LatestDate = [Latest Snapshot]
VAR Indexed =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = LatestDate,
        'ERSE_main'[FiltroPrecosIndex_ELE] = "S"
    )
VAR Total =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = LatestDate
    )
RETURN
    DIVIDE(Indexed, Total)
```
Format: `0.0%`

```
% Fixed Offers = 1 - [% Indexed Offers]
```
Format: `0.0%`

```
% Domestic Offers =
VAR LatestDate = [Latest Snapshot]
VAR Dom =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = LatestDate,
        'ERSE_main'[Segmento] = "Dom"
    )
VAR Total =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = LatestDate
    )
RETURN
    DIVIDE(Dom, Total)
```
Format: `0.0%`

```
% Dual Offers =
VAR LatestDate = [Latest Snapshot]
VAR Dual =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = LatestDate,
        'ERSE_main'[Fornecimento] = "DUAL"
    )
VAR Total =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = LatestDate
    )
RETURN
    DIVIDE(Dual, Total)
```
Format: `0.0%`

```
% New Customer Only Offers =
VAR LatestDate = [Latest Snapshot]
VAR NewOnly =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = LatestDate,
        'ERSE_main'[FiltroNovosClientes] = "S"
    )
VAR Total =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = LatestDate
    )
RETURN
    DIVIDE(NewOnly, Total)
```
Format: `0.0%`

### Folder: Offer Characteristics

```
Avg Contract Duration =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    AVERAGE('ERSE_main'[DuracaoContrato]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0`

```
# Long-term Offers (>=24m) =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
    'ERSE_main'[SnapshotDate] = LatestDate,
    'ERSE_main'[DuracaoContrato] >= 24
)
```
Format: `#,0`

```
# Short-term Offers (<12m) =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
    'ERSE_main'[SnapshotDate] = LatestDate,
    'ERSE_main'[DuracaoContrato] < 12
)
```
Format: `#,0`

```
Avg Services Cost =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    AVERAGE('ERSE_main'[CustoServicos_c/IVA (€/ano)]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `€#,0.00`

### Folder: Activity

```
Activity Score (Last 30d) =
VAR LatestDate = [Latest Snapshot]
VAR Cutoff = LatestDate - 30
RETURN
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[SnapshotDate]),
        'ERSE_main'[SnapshotDate] >= Cutoff
    )
```
Format: `#,0`

```
# Snapshots With Changes (Last 30d) =
VAR LatestDate = [Latest Snapshot]
VAR Cutoff = LatestDate - 30
VAR Snaps =
    FILTER(
        VALUES('ERSE_main'[SnapshotDate]),
        'ERSE_main'[SnapshotDate] >= Cutoff
    )
RETURN
    COUNTROWS(Snaps)
```
Format: `#,0`

---

## After all measures are in

The `_Measures` table should look like this in the data pane:

```
_Measures (calculator icon)
├── Activity (2)
├── Counts (5)
├── Discounts & Promos (4)
├── Mix (5)
├── Offer Characteristics (4)
├── Own vs Market (8)
├── Pricing - Changes (8)
├── Pricing - Current (Peak/Simples) (8)
├── Pricing - Gas (4)
├── Pricing - Off-Peak (4)
├── Ranking (5)
└── Snapshots (5)

Total: 51 measures across 12 folders.
```

(Plus Power BI auto-generates 0 columns since `_Measures` is now a measures-only table.)

---

## Common pitfalls

- **Error: "function 'PLACEHOLDER' was used in a True/False expression..."** → cannot reference a measure in a `CALCULATE` Boolean filter. Use the `VAR LatestDate = [Latest Snapshot] RETURN CALCULATE(..., column = LatestDate)` pattern. All measures here already follow it.
- **Decimal columns parse as integers (or fail)** → check the file's locale in Power Query is set to "Português (Portugal)" so `,` is treated as decimal separator.
- **`IsOwnCompany` measures all return blank** → you forgot to set `IsOwnCompany = TRUE` for at least one row in `dim_COM`. Edit the table.
- **`Rank by TF (Key Competitors)` is blank everywhere** → expected if no `COM` is in the visual context (the `ISINSCOPE` guard is by design). Add `dim_COM[Comercializador]` to a row/column slot in your visual.
- **`SnapshotDate` arithmetic returns blank** → confirm column type is Date/Time, not Text. Power Query → Tipo de dados.

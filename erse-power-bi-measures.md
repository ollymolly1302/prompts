# ERSE Competitive — Power BI Measures (DAX)

31 measures for the ERSE Competitive analysis. The recommended setup is a dedicated **Measures table** — a blank table that holds every measure and keeps them visually separated from the data table. Inside that table, measures are grouped into 7 folders.

## Prerequisites in the model

Before creating the measures, make sure the columns of `ERSE_main` have the right types in Power Query (Edit Queries → select column → Data Type):

- `SnapshotDate` → **Date/Time**
- `DataIni`, `DataFim` → **Date** (or Date/Time)
- `Pot_Cont`, `Escalao`, `DuracaoContrato`, all price columns (`TF`, `TV`, `TVFV`, `TVI`, `TVx`, `TFGN`, `TVGN`, ...) → **Decimal Number** (use locale "Portuguese (Portugal)" if comma is the decimal separator)
- `COM`, `COD_Proposta`, `NomeProposta` → **Text**

Without correct types, time-intelligence measures silently produce blank.

---

## Step 1 — Create a blank "Measures" table

The cleanest way to organize measures is a dedicated empty table.

1. Home ribbon → **Enter data** (Inserir dados).
2. In the dialog, leave the single empty cell as is. Name the column anything (e.g. `Placeholder`).
3. Change the **Table name** at the bottom to `_Measures` (the underscore prefix sorts it to the top of the data pane).
4. Click **Load**.
5. In the data pane on the right, you'll now see `_Measures` with one column.
6. Right-click the `Placeholder` column → **Hide in report view**.
7. After step 8 below (creating the first measure inside this table), the table icon will change to a calculator icon — meaning Power BI now recognizes it as a measures-only table and will pin it at the top.

## Step 2 — Create the 7 folders (just by typing the folder name when you create each measure)

Folders aren't created in advance — they appear automatically when at least one measure has that folder set in its **Display folder** property. The 7 folders we'll use:

- `Snapshots`
- `Counts`
- `Pricing - Current`
- `Pricing - Changes`
- `Ranking`
- `Offer Characteristics`
- `Activity`

## Step 3 — For each measure below

Repeat this 31 times:

1. **Right-click the `_Measures` table** in the data pane → **New measure**.
2. In the formula bar that opens, **delete** the placeholder text (`Measure = ...`).
3. **Paste the full DAX block from below** (it includes the measure name and the `=` sign).
4. Click the checkmark to confirm.
5. With the new measure still selected (single click in the data pane), look at the **Properties** pane on the right. If you don't see it: View ribbon → check **Properties pane**.
6. In Properties, set:
   - **Display folder** → type the folder name (e.g. `Snapshots`)
   - **Format string** → type the format from the "Format" line below the DAX (e.g. `0.0000`)

Tip: you can do all 31 DAX-paste steps first (steps 1-4), then go back and set all the Display folders in one batch (steps 5-6) — faster.

---

## The 31 measures

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
Format: *(leave blank — already a string)*

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

### Folder: Pricing - Current

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
    AVERAGE('ERSE_main'[TV]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Min TV Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MIN('ERSE_main'[TV]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
Max TV Latest =
VAR LatestDate = [Latest Snapshot]
RETURN
CALCULATE(
    MAX('ERSE_main'[TV]),
    'ERSE_main'[SnapshotDate] = LatestDate
)
```
Format: `0.0000`

```
TV Spread Latest = [Max TV Latest] - [Min TV Latest]
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
    AVERAGE('ERSE_main'[TV]),
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
        SUMMARIZE('ERSE_main', 'ERSE_main'[COD_Proposta], 'ERSE_main'[Pot_Cont]),
        "LatestTF", CALCULATE(MAX('ERSE_main'[TF]), 'ERSE_main'[SnapshotDate] = LatestDate),
        "PrevTF", CALCULATE(MAX('ERSE_main'[TF]), 'ERSE_main'[SnapshotDate] = PrevDate)
    )
RETURN
    COUNTROWS(
        FILTER(
            Pairs,
            NOT ISBLANK([LatestTF]) && NOT ISBLANK([PrevTF]) && [LatestTF] <> [PrevTF]
        )
    )
```
Format: `#,0`

```
Trend Direction =
SWITCH(
    TRUE(),
    [TF Delta vs Previous] > 0, "↑ Up",
    [TF Delta vs Previous] < 0, "↓ Down",
    "= Same"
)
```
Format: *(leave blank — string)*

### Folder: Ranking

```
Rank by TF =
IF(
    ISINSCOPE('ERSE_main'[COM]),
    RANKX(
        ALL('ERSE_main'[COM]),
        [Avg TF Latest],
        ,
        ASC,
        Dense
    )
)
```
Format: `#,0`

```
Rank by TV =
IF(
    ISINSCOPE('ERSE_main'[COM]),
    RANKX(
        ALL('ERSE_main'[COM]),
        [Avg TV Latest],
        ,
        ASC,
        Dense
    )
)
```
Format: `#,0`

```
Distance to Cheapest TF =
[Avg TF Latest] -
CALCULATE(
    [Min TF Latest],
    ALL('ERSE_main'[COM])
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
    ALL('ERSE_main'[COM])
)
```
Format: `+0.0000;-0.0000;0.0000`

```
TF Position Label =
VAR R = [Rank by TF]
RETURN
    IF(
        NOT ISBLANK(R),
        R & "º mais barato",
        BLANK()
    )
```
Format: *(leave blank — string)*

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

## After creating all measures

Once all 31 measures are in `_Measures` with their folders set, the data pane should show:

```
_Measures (calculator icon)
├── Activity
│   ├── # Snapshots With Changes (Last 30d)
│   └── Activity Score (Last 30d)
├── Counts
│   ├── # Active Competitors
│   ├── # Active Offers
│   ├── # New Offers (Last 30d)
│   ├── # New Offers (Since Previous)
│   └── # Offers Discontinued (Since Previous)
├── Offer Characteristics
│   ├── # Long-term Offers (>=24m)
│   ├── # Short-term Offers (<12m)
│   └── Avg Contract Duration
├── Pricing - Changes
│   ├── # Price Changes (Since Previous)
│   ├── Avg TF Previous
│   ├── Avg TV Previous
│   ├── TF % vs Previous
│   ├── TF Delta vs Previous
│   ├── Trend Direction
│   ├── TV % vs Previous
│   └── TV Delta vs Previous
├── Pricing - Current
│   ├── Avg TF Latest
│   ├── Avg TV Latest
│   ├── Max TF Latest
│   ├── Max TV Latest
│   ├── Min TF Latest
│   ├── Min TV Latest
│   ├── TF Spread Latest
│   └── TV Spread Latest
├── Ranking
│   ├── Distance to Avg TF
│   ├── Distance to Cheapest TF
│   ├── Rank by TF
│   ├── Rank by TV
│   └── TF Position Label
└── Snapshots
    ├── # Snapshots
    ├── Days Since Last Update
    ├── Latest Snapshot
    ├── Latest Snapshot Display
    └── Previous Snapshot
```

ERSE_main should still be in the data pane below `_Measures`, holding the actual data columns.

## Suggested first visuals

1. **Cover page KPI cards**: `Latest Snapshot Display`, `# Active Offers`, `# Active Competitors`, `Days Since Last Update`, `# New Offers (Since Previous)`, `# Price Changes (Since Previous)`.
2. **Price positioning matrix**: rows = `COM`, columns = `Pot_Cont`, values = `Avg TF Latest`. Conditional formatting (heatmap). Slicer on `Pot_Cont`.
3. **Trend line**: x-axis = `SnapshotDate`, y-axis = `Avg TF Latest` and `Avg TV Latest`, legend = `COM`. Slicer on `Pot_Cont`.

## Common pitfalls

- **Error: "function 'PLACEHOLDER' was used in a True/False expression..."** → DAX cannot reference a measure directly inside a Boolean filter of `CALCULATE`. The pattern `CALCULATE(..., column = [SomeMeasure])` fails. Always wrap with `VAR`-`RETURN`: assign the measure to a variable first, then compare to the variable. All measures in this doc already follow this pattern; if you write your own, remember the rule.
- **`SnapshotDate` is text, not date** → all time arithmetic returns blank. Fix the column type in Power Query first.
- **Decimal columns parse with `,` vs `.`** → if `Avg TF Latest` is suspiciously huge (millions instead of <1), the locale was misread. In Power Query, set the file's locale to "Portuguese (Portugal)" before changing type.
- **`Rank by TF` shows blank** outside of a `COM` context — that's correct, by design (the `ISINSCOPE` guard). It only renders when slicing/grouping by COM.

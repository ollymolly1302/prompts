# ERSE Competitive — Power BI Measures (TMDL)

Copy-paste-ready measures for the `ERSE_main` table built by the ERSE auto-download flow. 31 measures, all scoped to a `Measures` folder in the model pane with sub-folders for Snapshots, Counts, Pricing - Current, Pricing - Changes, Ranking, Offer Characteristics, and Activity.

## Prerequisites in the model

Before pasting these measures, make sure the table columns have the right types in Power Query:

- `SnapshotDate` → **Date/Time**
- `DataIni`, `DataFim` → **Date** (or Date/Time)
- `Pot_Cont`, `Escalao`, `DuracaoContrato`, all price columns (`TF`, `TV`, `TVFV`, `TVI`, `TVx`, `TFGN`, `TVGN`, ...) → **Decimal Number** (use locale "Portuguese (Portugal)" if comma is decimal separator)
- `COM`, `COD_Proposta`, `NomeProposta` → **Text**

Without correct types the time-intelligence measures will silently produce wrong results.

## How to paste — pick ONE of two paths

### Path A — TMDL view (recommended, one paste does all 31)

1. Open Power BI Desktop with the report.
2. **View** ribbon → **Model view**.
3. At the bottom of the screen, open the **TMDL view** pane (Power BI Desktop, May 2024 or later).
4. Click into the `table 'ERSE_main'` block. Place the cursor inside the table braces.
5. Paste the **single TMDL block below**.
6. Click **Apply**.

If you don't see TMDL view, your Power BI Desktop is older — use Path B.

### Path B — One measure at a time, via Report view

1. In Report view, right-click `ERSE_main` table in the Data pane → **New measure**.
2. Paste **only the DAX expression** (the part between `=` and the next blank line — no `displayFolder` line, no `formatString` line).
3. With the new measure still selected, in the **Properties** pane on the right (if hidden: View → Properties), set:
   - **Display folder**: `Measures\<sub-folder>` (e.g. `Measures\Snapshots`)
   - **Format string**: copy the value shown in the TMDL block
4. Repeat for each measure. The full list is below in `## All measures (DAX-only, for Path B)`.

---

## The single TMDL block (Path A)

Paste this entire block inside the `table 'ERSE_main'` definition in the TMDL view:

```tmdl
measure 'Latest Snapshot' = MAX('ERSE_main'[SnapshotDate])
    displayFolder: Measures\Snapshots
    formatString: dd/mm/yyyy hh:mm:ss

measure 'Previous Snapshot' =
    CALCULATE(
        MAX('ERSE_main'[SnapshotDate]),
        'ERSE_main'[SnapshotDate] < [Latest Snapshot]
    )
    displayFolder: Measures\Snapshots
    formatString: dd/mm/yyyy hh:mm:ss

measure 'Latest Snapshot Display' = FORMAT([Latest Snapshot], "dd/mm/yyyy hh:mm")
    displayFolder: Measures\Snapshots

measure '# Snapshots' = DISTINCTCOUNT('ERSE_main'[SnapshotDate])
    displayFolder: Measures\Snapshots
    formatString: #,0

measure 'Days Since Last Update' = DATEDIFF([Latest Snapshot], NOW(), DAY)
    displayFolder: Measures\Snapshots
    formatString: #,0

measure '# Active Competitors' =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COM]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot]
    )
    displayFolder: Measures\Counts
    formatString: #,0

measure '# Active Offers' =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot]
    )
    displayFolder: Measures\Counts
    formatString: #,0

measure '# New Offers (Since Previous)' =
    VAR LatestDate = [Latest Snapshot]
    VAR PrevDate = [Previous Snapshot]
    VAR LatestOffers =
        CALCULATETABLE(VALUES('ERSE_main'[COD_Proposta]), 'ERSE_main'[SnapshotDate] = LatestDate)
    VAR PrevOffers =
        CALCULATETABLE(VALUES('ERSE_main'[COD_Proposta]), 'ERSE_main'[SnapshotDate] = PrevDate)
    RETURN
        COUNTROWS(EXCEPT(LatestOffers, PrevOffers))
    displayFolder: Measures\Counts
    formatString: #,0

measure '# Offers Discontinued (Since Previous)' =
    VAR LatestDate = [Latest Snapshot]
    VAR PrevDate = [Previous Snapshot]
    VAR LatestOffers =
        CALCULATETABLE(VALUES('ERSE_main'[COD_Proposta]), 'ERSE_main'[SnapshotDate] = LatestDate)
    VAR PrevOffers =
        CALCULATETABLE(VALUES('ERSE_main'[COD_Proposta]), 'ERSE_main'[SnapshotDate] = PrevDate)
    RETURN
        COUNTROWS(EXCEPT(PrevOffers, LatestOffers))
    displayFolder: Measures\Counts
    formatString: #,0

measure '# New Offers (Last 30d)' =
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
    displayFolder: Measures\Counts
    formatString: #,0

measure 'Avg TF Latest' =
    CALCULATE(
        AVERAGE('ERSE_main'[TF]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot]
    )
    displayFolder: Measures\Pricing - Current
    formatString: 0.0000

measure 'Min TF Latest' =
    CALCULATE(
        MIN('ERSE_main'[TF]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot]
    )
    displayFolder: Measures\Pricing - Current
    formatString: 0.0000

measure 'Max TF Latest' =
    CALCULATE(
        MAX('ERSE_main'[TF]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot]
    )
    displayFolder: Measures\Pricing - Current
    formatString: 0.0000

measure 'TF Spread Latest' = [Max TF Latest] - [Min TF Latest]
    displayFolder: Measures\Pricing - Current
    formatString: 0.0000

measure 'Avg TV Latest' =
    CALCULATE(
        AVERAGE('ERSE_main'[TV]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot]
    )
    displayFolder: Measures\Pricing - Current
    formatString: 0.0000

measure 'Min TV Latest' =
    CALCULATE(
        MIN('ERSE_main'[TV]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot]
    )
    displayFolder: Measures\Pricing - Current
    formatString: 0.0000

measure 'Max TV Latest' =
    CALCULATE(
        MAX('ERSE_main'[TV]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot]
    )
    displayFolder: Measures\Pricing - Current
    formatString: 0.0000

measure 'TV Spread Latest' = [Max TV Latest] - [Min TV Latest]
    displayFolder: Measures\Pricing - Current
    formatString: 0.0000

measure 'Avg TF Previous' =
    CALCULATE(
        AVERAGE('ERSE_main'[TF]),
        'ERSE_main'[SnapshotDate] = [Previous Snapshot]
    )
    displayFolder: Measures\Pricing - Changes
    formatString: 0.0000

measure 'TF Delta vs Previous' = [Avg TF Latest] - [Avg TF Previous]
    displayFolder: Measures\Pricing - Changes
    formatString: +0.0000;-0.0000;0.0000

measure 'TF % vs Previous' = DIVIDE([TF Delta vs Previous], [Avg TF Previous])
    displayFolder: Measures\Pricing - Changes
    formatString: +0.00%;-0.00%;0.00%

measure 'Avg TV Previous' =
    CALCULATE(
        AVERAGE('ERSE_main'[TV]),
        'ERSE_main'[SnapshotDate] = [Previous Snapshot]
    )
    displayFolder: Measures\Pricing - Changes
    formatString: 0.0000

measure 'TV Delta vs Previous' = [Avg TV Latest] - [Avg TV Previous]
    displayFolder: Measures\Pricing - Changes
    formatString: +0.0000;-0.0000;0.0000

measure 'TV % vs Previous' = DIVIDE([TV Delta vs Previous], [Avg TV Previous])
    displayFolder: Measures\Pricing - Changes
    formatString: +0.00%;-0.00%;0.00%

measure '# Price Changes (Since Previous)' =
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
    displayFolder: Measures\Pricing - Changes
    formatString: #,0

measure 'Trend Direction' =
    SWITCH(
        TRUE(),
        [TF Delta vs Previous] > 0, "↑ Up",
        [TF Delta vs Previous] < 0, "↓ Down",
        "= Same"
    )
    displayFolder: Measures\Pricing - Changes

measure 'Rank by TF' =
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
    displayFolder: Measures\Ranking
    formatString: #,0

measure 'Rank by TV' =
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
    displayFolder: Measures\Ranking
    formatString: #,0

measure 'Distance to Cheapest TF' =
    [Avg TF Latest] -
    CALCULATE(
        [Min TF Latest],
        ALL('ERSE_main'[COM])
    )
    displayFolder: Measures\Ranking
    formatString: +0.0000;-0.0000;0.0000

measure 'Distance to Avg TF' =
    [Avg TF Latest] -
    CALCULATE(
        AVERAGE('ERSE_main'[TF]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot],
        ALL('ERSE_main'[COM])
    )
    displayFolder: Measures\Ranking
    formatString: +0.0000;-0.0000;0.0000

measure 'TF Position Label' =
    VAR R = [Rank by TF]
    RETURN
        IF(
            NOT ISBLANK(R),
            R & "º mais barato",
            BLANK()
        )
    displayFolder: Measures\Ranking

measure 'Avg Contract Duration' =
    CALCULATE(
        AVERAGE('ERSE_main'[DuracaoContrato]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot]
    )
    displayFolder: Measures\Offer Characteristics
    formatString: 0.0

measure '# Long-term Offers (>=24m)' =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot],
        'ERSE_main'[DuracaoContrato] >= 24
    )
    displayFolder: Measures\Offer Characteristics
    formatString: #,0

measure '# Short-term Offers (<12m)' =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot],
        'ERSE_main'[DuracaoContrato] < 12
    )
    displayFolder: Measures\Offer Characteristics
    formatString: #,0

measure 'Activity Score (Last 30d)' =
    VAR LatestDate = [Latest Snapshot]
    VAR Cutoff = LatestDate - 30
    RETURN
        CALCULATE(
            DISTINCTCOUNT('ERSE_main'[SnapshotDate]),
            'ERSE_main'[SnapshotDate] >= Cutoff
        )
    displayFolder: Measures\Activity
    formatString: #,0

measure '# Snapshots With Changes (Last 30d)' =
    VAR LatestDate = [Latest Snapshot]
    VAR Cutoff = LatestDate - 30
    VAR Snaps =
        FILTER(
            VALUES('ERSE_main'[SnapshotDate]),
            'ERSE_main'[SnapshotDate] >= Cutoff
        )
    RETURN
        COUNTROWS(Snaps)
    displayFolder: Measures\Activity
    formatString: #,0
```

---

## All measures (DAX-only, for Path B)

If you're on a Power BI Desktop without TMDL view, paste these one at a time via "New measure" and set Display Folder via Properties pane. The folder name to use is shown above each measure.

### Measures\Snapshots

```
Latest Snapshot = MAX('ERSE_main'[SnapshotDate])
```
Format: `dd/mm/yyyy hh:mm:ss`

```
Previous Snapshot =
CALCULATE(
    MAX('ERSE_main'[SnapshotDate]),
    'ERSE_main'[SnapshotDate] < [Latest Snapshot]
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

### Measures\Counts

```
# Active Competitors =
CALCULATE(
    DISTINCTCOUNT('ERSE_main'[COM]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot]
)
```
Format: `#,0`

```
# Active Offers =
CALCULATE(
    DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot]
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

### Measures\Pricing - Current

```
Avg TF Latest =
CALCULATE(
    AVERAGE('ERSE_main'[TF]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot]
)
```
Format: `0.0000`

```
Min TF Latest =
CALCULATE(
    MIN('ERSE_main'[TF]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot]
)
```
Format: `0.0000`

```
Max TF Latest =
CALCULATE(
    MAX('ERSE_main'[TF]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot]
)
```
Format: `0.0000`

```
TF Spread Latest = [Max TF Latest] - [Min TF Latest]
```
Format: `0.0000`

```
Avg TV Latest =
CALCULATE(
    AVERAGE('ERSE_main'[TV]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot]
)
```
Format: `0.0000`

```
Min TV Latest =
CALCULATE(
    MIN('ERSE_main'[TV]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot]
)
```
Format: `0.0000`

```
Max TV Latest =
CALCULATE(
    MAX('ERSE_main'[TV]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot]
)
```
Format: `0.0000`

```
TV Spread Latest = [Max TV Latest] - [Min TV Latest]
```
Format: `0.0000`

### Measures\Pricing - Changes

```
Avg TF Previous =
CALCULATE(
    AVERAGE('ERSE_main'[TF]),
    'ERSE_main'[SnapshotDate] = [Previous Snapshot]
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
CALCULATE(
    AVERAGE('ERSE_main'[TV]),
    'ERSE_main'[SnapshotDate] = [Previous Snapshot]
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

### Measures\Ranking

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
[Avg TF Latest] -
CALCULATE(
    AVERAGE('ERSE_main'[TF]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot],
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

### Measures\Offer Characteristics

```
Avg Contract Duration =
CALCULATE(
    AVERAGE('ERSE_main'[DuracaoContrato]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot]
)
```
Format: `0.0`

```
# Long-term Offers (>=24m) =
CALCULATE(
    DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot],
    'ERSE_main'[DuracaoContrato] >= 24
)
```
Format: `#,0`

```
# Short-term Offers (<12m) =
CALCULATE(
    DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
    'ERSE_main'[SnapshotDate] = [Latest Snapshot],
    'ERSE_main'[DuracaoContrato] < 12
)
```
Format: `#,0`

### Measures\Activity

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

## Suggested first visuals to build

Once the measures are in place, three quick wins:

1. **Cover page KPI cards**: `Latest Snapshot Display`, `# Active Offers`, `# Active Competitors`, `Days Since Last Update`, `# New Offers (Since Previous)`, `# Price Changes (Since Previous)`.
2. **Price positioning matrix**: rows = `COM`, columns = `Pot_Cont`, values = `Avg TF Latest`. Conditional formatting (heatmap). Slicer on `Pot_Cont`.
3. **Trend line**: x-axis = `SnapshotDate`, y-axis = `Avg TF Latest` and `Avg TV Latest`, legend = `COM`. Slicer on `Pot_Cont`.

## Common pitfalls

- **`SnapshotDate` is text, not date** → all time arithmetic returns blank. Fix the column type in Power Query first.
- **Decimal columns parse with `,` vs `.`** → if `Avg TF Latest` is suspiciously huge (millions instead of <1), the locale was misread. In Power Query, set the file's locale to "Portuguese (Portugal)" before changing type.
- **`Rank by TF` shows blank** — that's correct outside of a `COM` context (the ISINSCOPE guard). It only renders when slicing/grouping by COM.

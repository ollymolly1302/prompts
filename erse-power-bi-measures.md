# ERSE Competitive — Power BI Measures (TMDL)

Copy-paste-ready measures for the `ERSE_main` table built by the ERSE auto-download flow. All measures are scoped to the `Measures` folder in the model pane, with sub-folders for Snapshots, Counts, Pricing - Current, Pricing - Changes, Ranking, Offer Characteristics, and Activity.

## Prerequisites in the model

Before pasting these measures, make sure the table columns have the right types in Power Query:

- `SnapshotDate` → **Date/Time**
- `DataIni`, `DataFim` → **Date** (or Date/Time)
- `Pot_Cont`, `Escalao`, `DuracaoContrato`, all price columns (`TF`, `TV`, `TVFV`, `TVI`, `TVx`, `TFGN`, `TVGN`, ...) → **Decimal Number** (use locale "Portuguese (Portugal)" if comma is decimal separator)
- `COM`, `COD_Proposta`, `NomeProposta` → **Text**

Without correct types the time-intelligence measures will silently produce wrong results.

## How to paste these into Power BI Desktop

**Option A — TMDL view (Power BI Desktop, May 2024+)**:
1. Open Power BI Desktop with the report.
2. View ribbon → **Model view**.
3. Right-click the `ERSE_main` table → **Edit in TMDL view** (or use the TMDL pane that opens at the bottom).
4. Inside the `table 'ERSE_main'` block, paste the measure blocks below (anywhere within the table braces).
5. Apply.

**Option B — One measure at a time (works on every Power BI version)**:
1. In Report view, right-click `ERSE_main` table → **New measure**.
2. Paste only the DAX expression (everything after `=`, before any property line).
3. After creating it, click on the measure → **Properties** pane → set **Display folder** to `Measures\<sub-folder>` (e.g. `Measures\Snapshots`).
4. Repeat per measure.

**Option C — Tabular Editor** (free): paste each TMDL block, save model, refresh in Power BI Desktop.

---

## Measures

All blocks below are TMDL. The `displayFolder` line places each measure in `Measures\<sub-folder>` so the model pane in Power BI shows a clean nested tree.

### Folder: Measures\Snapshots

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
```

### Folder: Measures\Counts

```tmdl
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
```

### Folder: Measures\Pricing - Current

```tmdl
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
```

### Folder: Measures\Pricing - Changes

```tmdl
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
```

### Folder: Measures\Ranking

```tmdl
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
```

### Folder: Measures\Offer Characteristics

```tmdl
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

measure '# Offers per Competitor' =
    CALCULATE(
        DISTINCTCOUNT('ERSE_main'[COD_Proposta]),
        'ERSE_main'[SnapshotDate] = [Latest Snapshot]
    )
    displayFolder: Measures\Offer Characteristics
    formatString: #,0
```

### Folder: Measures\Activity

```tmdl
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

## Suggested first visuals to build

Once the measures are in place, three quick wins:

1. **Cover page KPI cards**: `Latest Snapshot Display`, `# Active Offers`, `# Active Competitors`, `Days Since Last Update`, `# New Offers (Since Previous)`, `# Price Changes (Since Previous)`.
2. **Price positioning matrix**: rows = `COM`, columns = `Pot_Cont`, values = `Avg TF Latest`. Conditional formatting (heatmap). Slicer on `Pot_Cont`.
3. **Trend line**: x-axis = `SnapshotDate`, y-axis = `Avg TF Latest` and `Avg TV Latest`, legend = `COM`. Slicer on `Pot_Cont`.

## Common pitfalls

- **`SnapshotDate` is text, not date** → all time arithmetic returns blank. Fix the column type in Power Query first.
- **Decimal columns parse with `,` vs `.`** → if `Avg TF Latest` is suspiciously huge (millions instead of <1), the locale was misread. In Power Query, set the file's locale to "Portuguese (Portugal)" before changing type.
- **`Rank by TF` shows blank** — that's correct outside of a `COM` context (the ISINSCOPE guard). It only renders when slicing/grouping by COM.

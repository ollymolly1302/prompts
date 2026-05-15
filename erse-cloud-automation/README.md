# ERSE Tariff Auto-Download — Power Automate Cloud version

Daily automation that polls ERSE's tariff simulator and archives every new snapshot of competitive offers data, rebuilt for **Power Automate Cloud** without Premium license.

> See `../erse-tariff-download.md` for the original PAD (Power Automate Desktop) + PowerShell version. This folder is the cloud rewrite.

## Why a rewrite

The original PAD flow required:
- A user-installed Power Automate Desktop
- A locally accessible folder
- A Windows machine that's online and logged in when the flow runs

The cloud version runs entirely in Microsoft 365 — works on any device, no local install, no PC needs to be on.

## Constraint that defined the architecture

**No Premium license available.** This rules out:
- ❌ HTTP connector (generic)
- ❌ Custom connectors
- ❌ Triggering Power Automate Desktop flows from cloud
- ❌ Power Automate "Process" / unattended RPA

**The unlock**: `Excel Online (Business) → Run script` is a **standard** connector and Office Scripts support `fetch()` to external URLs.

## Architecture

```
[Recurrence trigger - daily 08:00]
    ↓
[Office Script 1: FetchERSE]
    Fetch Settings.json → extract csvPath → fetch ZIP as binary
    Returns: { status, base64, timestamp, sizeKB }
    ↓
[Compose: decode base64]
    ↓
[OneDrive: Create file]
    Saves the ZIP to a temp folder
    ↓
[OneDrive: Extract archive to folder]   ← unzip happens here (standard connector)
    ↓
[Get file content × 2]
    Reads Precos_ELEGN.csv and CondComerciais.csv
    ↓
[Office Script 2: ProcessERSE]
    Parses both CSVs, joins on COD_Proposta, adds SnapshotDate,
    appends to host Excel table, compares with previous snapshot
    Returns: { rowsAdded, changes, hasChanges, summary }
    ↓
[Condition: hasChanges = true?]
    ↓ yes
[Outlook: Send email]
    HTML table of price changes + link to Power BI report
```

The host Excel file (`ERSE_Historico.xlsx`) lives in SharePoint and serves two purposes:
1. Hosts the Office Scripts (Office Scripts are stored per-workbook)
2. Contains the cumulative `Dados` table that Power BI consumes

## Files in this folder

| File | What it is |
|---|---|
| `README.md` | This file |
| `01-fetch-script.ts` | Office Script 1 — downloads the ZIP from ERSE, returns base64 |

More files will be added as the project progresses:
- `02-process-script.ts` — Office Script 2 (parse, join, append, detect changes)
- `cloud-flow.md` — step-by-step build of the Power Automate flow
- `host-excel-setup.md` — SharePoint folder + Excel structure

## Required SharePoint setup (host Excel)

`ERSE_Historico.xlsx` with three sheets:

| Sheet | Type | Purpose |
|---|---|---|
| `Dados` | Excel Table named `tblDados` | Cumulative snapshot table; all historical rows with `SnapshotDate` column. Schema matches the original PAD output (see `../erse-tariff-download.md`). |
| `Log` | Plain range | Execution log: `Timestamp`, `Status`, `RowsAdded`/`SizeKB`, `Timestamp from ERSE`, `Notes` |
| `Config` | Excel Table named `tblConfig` | Configurable parameters. Minimum: row `SettingsURL` = `https://simuladorprecos.erse.pt/config/Settings.json` |

## License

These scripts are free to reuse. They depend on Microsoft 365 APIs only. ERSE's tariff simulator data is public information published by the Portuguese energy regulator.

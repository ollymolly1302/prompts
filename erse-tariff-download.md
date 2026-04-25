# ERSE Tariff Auto-Download (Power Automate Desktop + PowerShell)

Power Automate Desktop flow that polls the Portuguese regulator's tariff simulator (https://simuladorprecos.erse.pt) once a day, downloads the current commercial-offers ZIP only if its timestamp is not yet in the local archive, and rebuilds two consolidated CSVs (under `Main\`) that contain every historical snapshot with a `SnapshotDate` column for direct ingestion into Power BI.

## Why this design

- ERSE updates on demand (whenever a competitor changes a price or launches an offer), not on a fixed schedule. Polling daily is the right cadence.
- The check uses the **archive folder itself** as the source of truth: if the parsed timestamp from ERSE's `csvPath` already corresponds to a folder under `Histórico\`, no download. No `_state` file needed.
- A `Main\` folder is rebuilt on every successful run: it concatenates every snapshot in `Histórico\` and adds a `SnapshotDate` column derived from each source folder name. Power BI only needs to load these two files.

## Folder layout

Default base folder: `C:\Users\<you>\Downloads\ERSE`. After the first run + any backfill:

```
ERSE\
├── Histórico\
│   ├── Condições Comerciais\
│   │   ├── 2024-12-13_182211\CondComerciais.csv
│   │   ├── 2025-02-21_171922\CondComerciais.csv
│   │   └── ...
│   └── Preços\
│       ├── 2024-12-13_182211\Precos_ELEGN.csv
│       └── ...
├── Main\
│   ├── CondComerciais_main.csv   ← all snapshots merged + SnapshotDate column
│   └── Precos_ELEGN_main.csv     ← same
└── _tmp\                              ← created/deleted automatically per run
```

You don't need to create any subfolders manually — the script and the backfill (see `erse-historical-backfill.md`) create them.

## How the change-detection works

ERSE's homepage loads runtime config from `/config/Settings.json`. It contains a field `csvPath` pointing to the current ZIP file, with a timestamp embedded in the filename:

```json
{
  "csvPath": "https://simuladorprecos.erse.pt/Admin/csvs/<YYYYMMDD HHMMSS> CSV.zip",
  ...
}
```

The script:
1. Fetches `Settings.json`
2. Parses the timestamp from `csvPath`
3. Checks whether `Histórico\Condições Comerciais\<YYYY-MM-DD_HHMMSS>\CondComerciais.csv` already exists
4. If yes → no download, just rebuild Main. If no → download, save under that timestamp, then rebuild Main.

## Power Automate Desktop flow — 3 actions

### Action 1: Definir variável
- Name: `BASE`
- Value: `C:\Users\<you>\Downloads\ERSE` (or your real base folder)

### Action 2: Executar script do PowerShell

Paste the script below. Set:
- Output variable: `Result`
- Errors variable: `PsErrors`

```powershell
$base = '%BASE%'
$settingsUrl = 'https://simuladorprecos.erse.pt/config/Settings.json'

try {
    $settings = Invoke-RestMethod -Uri $settingsUrl -UseBasicParsing
} catch {
    [Console]::Write("ERROR: failed to fetch Settings.json - $_")
    exit
}

$currentCsvUrl = $settings.csvPath
if (-not $currentCsvUrl) {
    [Console]::Write("ERROR: csvPath field not found in Settings.json")
    exit
}

if ($currentCsvUrl -notmatch '/(\d{8}) (\d{6}) CSV\.zip$') {
    [Console]::Write("ERROR: could not parse timestamp from csvPath: $currentCsvUrl")
    exit
}
$datePart = $matches[1]
$timePart = $matches[2]
$timestamp = "{0}-{1}-{2}_{3}" -f $datePart.Substring(0,4), $datePart.Substring(4,2), $datePart.Substring(6,2), $timePart

$condHist   = "$base\Histórico\Condições Comerciais\$timestamp"
$precosHist = "$base\Histórico\Preços\$timestamp"

$status = ''

if ((Test-Path "$condHist\CondComerciais.csv") -and (Test-Path "$precosHist\Precos_ELEGN.csv")) {
    $status = "NO_UPDATE: $timestamp already in Historico"
} else {
    $tmpDir = "$base\_tmp"
    if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tmpDir | Out-Null

    $encodedUrl = [System.Uri]::EscapeUriString($currentCsvUrl)
    Invoke-WebRequest -Uri $encodedUrl -OutFile "$tmpDir\erse.zip" -UseBasicParsing

    Expand-Archive -Path "$tmpDir\erse.zip" -DestinationPath $tmpDir -Force

    $condCsv = Get-ChildItem -Path $tmpDir -Recurse -Filter 'CondComerciais.csv' | Select-Object -First 1
    $precosCsv = Get-ChildItem -Path $tmpDir -Recurse -Filter 'Precos_ELEGN.csv' | Select-Object -First 1

    if (-not $condCsv -or -not $precosCsv) {
        [Console]::Write("ERROR: expected CSVs not found in ZIP")
        exit
    }

    New-Item -ItemType Directory -Path $condHist -Force | Out-Null
    New-Item -ItemType Directory -Path $precosHist -Force | Out-Null
    Copy-Item $condCsv.FullName   "$condHist\CondComerciais.csv"   -Force
    Copy-Item $precosCsv.FullName "$precosHist\Precos_ELEGN.csv"   -Force

    Remove-Item $tmpDir -Recurse -Force

    $status = "UPDATED: $timestamp"
}

# === Rebuild Main folder ===
$mainDir = "$base\Main"
New-Item -ItemType Directory -Path $mainDir -Force | Out-Null

$enc = [System.Text.Encoding]::GetEncoding(1252)

function Compile-Snapshots {
    param($sourceFolder, $outputFile, $filename, $encoding, [int[]]$keepIdx, [int[]]$dropIdx)

    $folders = Get-ChildItem -Path $sourceFolder -Directory -ErrorAction SilentlyContinue | Sort-Object Name
    $allLines = New-Object System.Collections.ArrayList
    $headerWritten = $false

    foreach ($folder in $folders) {
        $csvPath = Join-Path $folder.FullName $filename
        if (-not (Test-Path $csvPath)) { continue }

        $ts = $folder.Name
        if ($ts -notmatch '^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})$') { continue }
        $snapshotDate = "{0}-{1}-{2} {3}:{4}:{5}" -f $matches[1], $matches[2], $matches[3], $matches[4], $matches[5], $matches[6]

        $lines = [System.IO.File]::ReadAllLines($csvPath, $encoding)
        if ($lines.Length -eq 0) { continue }

        for ($i = 0; $i -lt $lines.Length; $i++) {
            $cells = $lines[$i] -split ';'

            if ($keepIdx) {
                $cells = @($keepIdx | ForEach-Object { if ($_ -lt $cells.Length) { $cells[$_] } else { '' } })
            } elseif ($dropIdx) {
                $kept = New-Object System.Collections.ArrayList
                for ($j = 0; $j -lt $cells.Length; $j++) {
                    if ($dropIdx -notcontains $j) { [void]$kept.Add($cells[$j]) }
                }
                $cells = $kept.ToArray()
            }

            if ($i -eq 0) {
                if (-not $headerWritten) {
                    [void]$allLines.Add(($cells -join ';') + ';SnapshotDate')
                    $headerWritten = $true
                }
            } else {
                [void]$allLines.Add(($cells -join ';') + ";$snapshotDate")
            }
        }
    }

    [System.IO.File]::WriteAllLines($outputFile, $allLines, $encoding)
}

# CondComerciais: keep only COM (A), CDD_Proposta (B), NomeProposta (C), DuracaoContrato (L), DataIni (M), DataFim (N)
Compile-Snapshots -sourceFolder "$base\Histórico\Condições Comerciais" -outputFile "$mainDir\CondComerciais_main.csv" -filename 'CondComerciais.csv' -encoding $enc -keepIdx @(0, 1, 2, 11, 12, 13)

# Precos_ELEGN: drop ORD (D) and Contagem (F); keep all others
Compile-Snapshots -sourceFolder "$base\Histórico\Preços"               -outputFile "$mainDir\Precos_ELEGN_main.csv"   -filename 'Precos_ELEGN.csv' -encoding $enc -dropIdx @(3, 5)

[Console]::Write("$status; Main rebuilt")
```

### Action 3: Apresentar mensagem
- Title: `ERSE`
- Message: `%Result%`
- Icon: Information

## Outputs

| Output | Meaning |
|---|---|
| `UPDATED: 2026-04-13_173154; Main rebuilt` | New ZIP downloaded, archived under that timestamp, Main files refreshed |
| `NO_UPDATE: 2026-04-13_173154 already in Historico; Main rebuilt` | Current ERSE timestamp already exists locally — skipped download but still rebuilt Main |
| `ERROR: ...` | Something broke; check `PsErrors` for details |

## What the Main CSVs look like

Each line is a row from one of the snapshots, with `SnapshotDate` appended as the last column (semicolon-delimited, Windows-1252 encoding to match ERSE's source files).

**`CondComerciais_main.csv`** — only the relevant offer-metadata columns:

```
COM;CDD_Proposta;NomeProposta;DuracaoContrato;DataIni;DataFim;SnapshotDate
TUR;TUR;Condições de preço regulado;12;01/03/2025;31/12/2099;2024-12-13 18:22:11
ALFAENERGIA;ALFAENERGIA_03;Tarifa ALFA GAS FIXO BASE;12;02/04/2025;...;2024-12-13 18:22:11
...
```

**`Precos_ELEGN_main.csv`** — all price columns, `ORD` and `Contagem` filtered out:

```
COM;Pot_Cont;Escalao;CDD_Proposta;TF;TV;TVFV;TVI;TVx;TFGN;TVGN;...;SnapshotDate
CURBEI;1;BEI;CURBEI;0,0897;0,0641;...;2024-12-13 18:22:11
...
```

Power BI only needs to load these two files. The `SnapshotDate` column is the time-series axis.

## Test plan

1. **Backfill first** (one-off, see `erse-historical-backfill.md`) so `Histórico\` is populated.
2. **First run of this flow**: should download today's ZIP if its timestamp is newer than anything in `Histórico\`. Output: `UPDATED: ...`
3. **Second run, immediately**: should see the timestamp already exists and skip the download. Output: `NO_UPDATE: ... already in Historico`. The Main files are still refreshed (no-op effectively, same content).

## Scheduling

Use Windows Task Scheduler to run daily:

1. Task Scheduler → Create Task
2. Trigger: Daily at 08:00
3. Action: Start a program
   - Program: `"C:\Program Files (x86)\Power Automate Desktop\PAD.Console.Host.exe"`
   - Arguments: `"ms-powerautomate:/console/flow/run?workflowName=ERSE_Competitive_Update"`
4. Settings → tick "Run task as soon as possible after a scheduled start is missed"

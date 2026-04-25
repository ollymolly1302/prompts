# ERSE Tariff Auto-Download (Power Automate Desktop + PowerShell)

Power Automate Desktop flow that checks the Portuguese regulator's tariff simulator (https://simuladorprecos.erse.pt) once a day and downloads the latest commercial-offers ZIP only if it has been updated since the last check. The ZIP is extracted and the two CSVs are placed in fixed local folders for downstream processing.

## Why this design

- ERSE doesn't update on a fixed schedule — they push new versions whenever a competitor changes a price or launches an offer. Polling daily is the right cadence: rare enough not to hammer the site, frequent enough to catch updates within 24h.
- The flow short-circuits if the current `csvPath` matches the locally cached one — no wasted work.
- All real logic lives in one PowerShell action. The PAD flow is just orchestration. Easier to debug than a 20-action native PAD chain.
- No HTML scraping or browser automation: the simulator exposes the current ZIP URL in a JSON config endpoint (`/config/Settings.json`).

## Folder layout (set this up first)

Default base folder: `C:\Users\<you>\Downloads\ERSE`. The flow expects:

```
ERSE\
├── Atual\
│   ├── Condições Comerciais\   ← latest CondComerciais.csv lands here
│   └── Preços\                  ← latest Precos_ELEGN.csv lands here
├── _state\                      ← created automatically; stores last-known csvPath
└── _tmp\                        ← created/deleted automatically per run
```

You only need to create `Atual\Condições Comerciais\` and `Atual\Preços\` manually. The script handles `_state\` and `_tmp\` itself.

## How the change-detection works

ERSE's homepage loads runtime config from `/config/Settings.json`, which contains a field called `csvPath` pointing to the current ZIP file:

```json
{
  "csvPath": "https://simuladorprecos.erse.pt/Admin/csvs/<YYYYMMDD HHMMSS> CSV.zip",
  ...
}
```

The filename includes a timestamp. When ERSE publishes a new dataset, this value changes. We compare against `_state\last_update.txt`; if equal, no work; if different, download.

## Power Automate Desktop flow — 3 actions

### Action 1: Definir variável
- Name: `BASE`
- Value: `C:\Users\<you>\Downloads\ERSE`

### Action 2: Executar script do PowerShell

Paste the script below. Set:
- Output variable: `Result`
- Errors variable: `PsErrors`

```powershell
$base = '%BASE%'
$settingsUrl = 'https://simuladorprecos.erse.pt/config/Settings.json'
$stateFile = "$base\_state\last_update.txt"

$stateFolder = Split-Path $stateFile -Parent
if (-not (Test-Path $stateFolder)) { New-Item -ItemType Directory -Path $stateFolder | Out-Null }

$lastKnown = ''
if (Test-Path $stateFile) { $lastKnown = (Get-Content $stateFile -Raw).Trim() }

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

if ($currentCsvUrl -eq $lastKnown) {
    [Console]::Write("NO_UPDATE: $currentCsvUrl")
    exit
}

# Parse timestamp from URL: .../20260413 173154 CSV.zip -> 2026-04-13_173154
if ($currentCsvUrl -notmatch '/(\d{8}) (\d{6}) CSV\.zip$') {
    [Console]::Write("ERROR: could not parse timestamp from csvPath: $currentCsvUrl")
    exit
}
$datePart = $matches[1]
$timePart = $matches[2]
$timestamp = "{0}-{1}-{2}_{3}" -f $datePart.Substring(0,4), $datePart.Substring(4,2), $datePart.Substring(6,2), $timePart

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

$condHist    = "$base\Histórico\Condições Comerciais\$timestamp"
$precosHist  = "$base\Histórico\Preços\$timestamp"
$condAtual   = "$base\Atual\Condições Comerciais"
$precosAtual = "$base\Atual\Preços"

New-Item -ItemType Directory -Path $condHist   -Force | Out-Null
New-Item -ItemType Directory -Path $precosHist -Force | Out-Null
New-Item -ItemType Directory -Path $condAtual  -Force | Out-Null
New-Item -ItemType Directory -Path $precosAtual -Force | Out-Null

Copy-Item $condCsv.FullName   "$condHist\CondComerciais.csv"   -Force
Copy-Item $precosCsv.FullName "$precosHist\Precos_ELEGN.csv"   -Force
Copy-Item $condCsv.FullName   "$condAtual\CondComerciais.csv"  -Force
Copy-Item $precosCsv.FullName "$precosAtual\Precos_ELEGN.csv" -Force

Remove-Item $tmpDir -Recurse -Force

Set-Content -Path $stateFile -Value $currentCsvUrl -NoNewline

[Console]::Write("UPDATED: $timestamp")
```

### Action 3: Apresentar mensagem
- Title: `ERSE`
- Message: `%Result%`
- Icon: Information

## Outputs

| Output | Meaning |
|---|---|
| `UPDATED: <url>` | New version downloaded and copied to Atual\ |
| `NO_UPDATE: <url>` | csvPath unchanged since the last run |
| `ERROR: ...` | Something broke; check `PsErrors` |

## Scheduling

Use Windows Task Scheduler to run daily:

1. Task Scheduler → Create Task
2. Trigger: Daily at 08:00
3. Action: Start a program
   - Program: `"C:\Program Files (x86)\Power Automate Desktop\PAD.Console.Host.exe"`
   - Arguments: `"ms-powerautomate:/console/flow/run?workflowName=ERSE_Competitive_Update"`
4. Settings → tick "Run task as soon as possible after a scheduled start is missed"

## History note

Earlier iterations of this design tried to scrape the homepage HTML to find the "Atualizado em" date, but the homepage is JavaScript-rendered and the link is populated client-side from `Settings.json`. Using the JSON endpoint directly is faster, more reliable, and gives us the exact ZIP filename including the second-precision timestamp.

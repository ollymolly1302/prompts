# ERSE Tariff Auto-Download (Power Automate Desktop + PowerShell)

Power Automate Desktop flow that checks the Portuguese regulator's tariff simulator (https://simuladorprecos.erse.pt) once a day and downloads the latest commercial-offers ZIP only if it has been updated since the last check. The ZIP is extracted and the two CSVs are placed in fixed local folders for downstream processing.

## Why this design

- ERSE doesn't update on a fixed schedule — they push new versions whenever a competitor changes a price or launches an offer. Polling daily is the right cadence: rare enough not to hammer the site, frequent enough to catch updates within 24h.
- The flow short-circuits if the page's "Atualizado em" date matches the locally cached one — no wasted work.
- All real logic lives in one PowerShell action. The PAD flow is just orchestration. Easier to debug than a 20-action native PAD chain.
- No Edge browser automation: the page is fully server-rendered, so a plain HTTP GET works.

## Folder layout (set this up first)

Default base folder: `C:\Users\<you>\Downloads\ERSE`. The flow expects:

```
ERSE\
├── Atual\
│   ├── Condições Comerciais\   ← latest CondComerciais.csv lands here
│   └── Preços\                  ← latest Precos_ELEGN.csv lands here
├── _state\                      ← created automatically; stores last-update date
└── _tmp\                        ← created/deleted automatically per run
```

You only need to create `Atual\Condições Comerciais\` and `Atual\Preços\` manually. The script handles `_state\` and `_tmp\` itself.

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
$siteUrl = 'https://simuladorprecos.erse.pt'
$stateFile = "$base\_state\last_update.txt"

# Ensure _state exists
$stateFolder = Split-Path $stateFile -Parent
if (-not (Test-Path $stateFolder)) { New-Item -ItemType Directory -Path $stateFolder | Out-Null }

# Read last known update date
$lastKnown = ''
if (Test-Path $stateFile) { $lastKnown = (Get-Content $stateFile -Raw).Trim() }

# Fetch page
$page = (Invoke-WebRequest -Uri $siteUrl -UseBasicParsing).Content

# Find "Atualizado em DD-M-YYYY"
if ($page -notmatch 'Atualizado em (\d{1,2}-\d{1,2}-\d{4})') {
    Set-Content -Path "$base\_state\debug_page.html" -Value $page -Encoding UTF8
    [Console]::Write("ERROR: 'Atualizado em' not found. HTML saved to _state\debug_page.html")
    exit
}
$currentDate = $matches[1]

# Already up to date?
if ($currentDate -eq $lastKnown) {
    [Console]::Write("NO_UPDATE: already on $currentDate")
    exit
}

# Find ZIP URL
if ($page -notmatch 'href="(/Admin/csvs/[^"]+\.zip)"') {
    [Console]::Write("ERROR: ZIP link not found")
    exit
}
$zipUrl = $siteUrl + $matches[1]

# Download to tmp
$tmpDir = "$base\_tmp"
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
New-Item -ItemType Directory -Path $tmpDir | Out-Null
Invoke-WebRequest -Uri $zipUrl -OutFile "$tmpDir\erse.zip" -UseBasicParsing

# Extract
Expand-Archive -Path "$tmpDir\erse.zip" -DestinationPath $tmpDir -Force

# Locate the two CSVs (inside csv\ subfolder of the ZIP)
$condCsv = Get-ChildItem -Path $tmpDir -Recurse -Filter 'CondComerciais.csv' | Select-Object -First 1
$precosCsv = Get-ChildItem -Path $tmpDir -Recurse -Filter 'Precos_ELEGN.csv' | Select-Object -First 1

if (-not $condCsv -or -not $precosCsv) {
    [Console]::Write("ERROR: expected CSVs not found in ZIP")
    exit
}

# Ensure destination folders exist
New-Item -ItemType Directory -Path "$base\Atual\Condições Comerciais" -Force | Out-Null
New-Item -ItemType Directory -Path "$base\Atual\Preços" -Force | Out-Null

# Copy to Atual
Copy-Item $condCsv.FullName   "$base\Atual\Condições Comerciais\CondComerciais.csv" -Force
Copy-Item $precosCsv.FullName "$base\Atual\Preços\Precos_ELEGN.csv" -Force

# Cleanup
Remove-Item $tmpDir -Recurse -Force

# Persist new state
Set-Content -Path $stateFile -Value $currentDate -NoNewline

[Console]::Write("UPDATED: $currentDate")
```

### Action 3: Apresentar mensagem
- Title: `ERSE`
- Message: `%Result%`
- Icon: Information

## Outputs

| Output | Meaning |
|---|---|
| `UPDATED: <date>` | New version downloaded and copied to Atual\ |
| `NO_UPDATE: already on <date>` | Page hasn't changed since the last run |
| `ERROR: ...` | Something broke; check `_state\debug_page.html` |

## Scheduling

Use Windows Task Scheduler to run daily:

1. Task Scheduler → Create Task
2. Trigger: Daily at 08:00
3. Action: Start a program
   - Program: `"C:\Program Files (x86)\Power Automate Desktop\PAD.Console.Host.exe"`
   - Arguments: `"ms-powerautomate:/console/flow/run?workflowName=ERSE_Competitive_Update"`
4. Settings → tick "Run task as soon as possible after a scheduled start is missed"

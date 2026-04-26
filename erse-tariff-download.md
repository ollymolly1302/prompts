# ERSE Tariff Auto-Download (Power Automate Desktop + PowerShell)

Power Automate Desktop flow that polls the Portuguese regulator's tariff simulator (https://simuladorprecos.erse.pt) once a day, downloads the current commercial-offers ZIP only if its timestamp is not yet in the local archive, and rebuilds two consolidated CSVs (under `Main\`) that contain every historical snapshot with a `SnapshotDate` column for direct ingestion into Power BI.

## Why this design

- ERSE updates on demand (whenever a competitor changes a price or launches an offer), not on a fixed schedule. Polling daily is the right cadence.
- The check uses the **archive folder itself** as the source of truth: if the parsed timestamp from ERSE's `csvPath` already corresponds to a folder under `Histórico\`, no download. No `_state` file needed.
- A `Main\ERSE_main.csv` is rebuilt on every successful run: every Precos row from every snapshot is left-joined to its CondComerciais row on `COD_Proposta` (column E in Precos / column B in CondComerciais), giving each price row the offer's name, duration, and validity dates. A `SnapshotDate` column derived from the folder name closes the loop. Power BI only needs to load this single file.

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
│   └── ERSE_main.csv   ← all snapshots, Precos left-joined to CondComerciais on COD_Proposta + SnapshotDate
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

# === Detect changes vs previous snapshot (for email alert) ===
$emailBodyPath = "$base\_state\email_body.html"
$changeStats = ''

if ($status -like 'UPDATED:*') {
    $readEncDiff = [System.Text.Encoding]::UTF8
    $writeEncDiff = New-Object System.Text.UTF8Encoding($false)

    # Find previous snapshot folder
    $allHistFolders = Get-ChildItem -Path "$base\Histórico\Preços" -Directory -ErrorAction SilentlyContinue | Sort-Object Name
    $prevFolder = $allHistFolders | Where-Object { $_.Name -lt $timestamp } | Select-Object -Last 1

    if ($prevFolder) {
        $oldPrecosPath = Join-Path $prevFolder.FullName 'Precos_ELEGN.csv'
        $oldCondPath   = Join-Path "$base\Histórico\Condições Comerciais\$($prevFolder.Name)" 'CondComerciais.csv'
        $newPrecosPath = "$precosHist\Precos_ELEGN.csv"
        $newCondPath   = "$condHist\CondComerciais.csv"

        if ((Test-Path $oldPrecosPath) -and (Test-Path $oldCondPath)) {
            $oldPrecos = [System.IO.File]::ReadAllLines($oldPrecosPath, $readEncDiff)
            $newPrecos = [System.IO.File]::ReadAllLines($newPrecosPath, $readEncDiff)
            $oldCond   = [System.IO.File]::ReadAllLines($oldCondPath,   $readEncDiff)
            $newCond   = [System.IO.File]::ReadAllLines($newCondPath,   $readEncDiff)

            # COD -> NomeProposta maps
            $codNameNew = @{}
            for ($i = 1; $i -lt $newCond.Length; $i++) {
                $c = $newCond[$i] -split ';'
                if ($c.Length -ge 3) { $codNameNew[$c[1]] = $c[2] }
            }
            $codNameOld = @{}
            for ($i = 1; $i -lt $oldCond.Length; $i++) {
                $c = $oldCond[$i] -split ';'
                if ($c.Length -ge 3) { $codNameOld[$c[1]] = $c[2] }
            }

            # Distinct CODs in each side
            $codsNew = New-Object System.Collections.Generic.HashSet[string]
            for ($i = 1; $i -lt $newPrecos.Length; $i++) {
                $r = $newPrecos[$i] -split ';'
                if ($r.Length -gt 4) { [void]$codsNew.Add($r[4]) }
            }
            $codsOld = New-Object System.Collections.Generic.HashSet[string]
            for ($i = 1; $i -lt $oldPrecos.Length; $i++) {
                $r = $oldPrecos[$i] -split ';'
                if ($r.Length -gt 4) { [void]$codsOld.Add($r[4]) }
            }

            $newCods = @($codsNew | Where-Object { -not $codsOld.Contains($_) })
            $discontCods = @($codsOld | Where-Object { -not $codsNew.Contains($_) })

            # OLD price lookup
            $priceColIdxs  = @(6, 7, 8, 9, 10, 11)
            $priceColNames = @('TF', 'TV|TVFV|TVP', 'TVV|TVC', 'TVVz', 'TFGN', 'TVGN')

            $oldLookup = @{}
            for ($i = 1; $i -lt $oldPrecos.Length; $i++) {
                $r = $oldPrecos[$i] -split ';'
                if ($r.Length -lt 12) { continue }
                $key = "$($r[4])|$($r[1])|$($r[2])|$($r[5])"
                $oldLookup[$key] = $r
            }

            # Detect price changes
            $changes = New-Object System.Collections.ArrayList
            for ($i = 1; $i -lt $newPrecos.Length; $i++) {
                $r = $newPrecos[$i] -split ';'
                if ($r.Length -lt 12) { continue }
                $cod = $r[4]
                if ($newCods -contains $cod) { continue }
                $key = "$cod|$($r[1])|$($r[2])|$($r[5])"
                if (-not $oldLookup.ContainsKey($key)) { continue }
                $oldRow = $oldLookup[$key]
                for ($j = 0; $j -lt $priceColIdxs.Length; $j++) {
                    $colIdx = $priceColIdxs[$j]
                    $oldV = if ($colIdx -lt $oldRow.Length) { $oldRow[$colIdx] } else { '' }
                    $newV = if ($colIdx -lt $r.Length)      { $r[$colIdx] }      else { '' }
                    if ($oldV -ne $newV -and -not ([string]::IsNullOrEmpty($oldV) -and [string]::IsNullOrEmpty($newV))) {
                        [void]$changes.Add([pscustomobject]@{
                            Cod  = $cod
                            Nome = if ($codNameNew.ContainsKey($cod)) { $codNameNew[$cod] } else { $cod }
                            Pot  = $r[1]
                            Cont = $r[5]
                            Col  = $priceColNames[$j]
                            Old  = $oldV
                            New  = $newV
                        })
                    }
                }
            }

            $changeStats = "$($changes.Count) precos alterados; $($newCods.Count) novas; $($discontCods.Count) descontinuadas"

            # Build HTML email body
            $sbHtml = New-Object System.Text.StringBuilder
            [void]$sbHtml.AppendLine("<html><head><style>")
            [void]$sbHtml.AppendLine("body{font-family:Calibri,Arial,sans-serif;font-size:11pt}")
            [void]$sbHtml.AppendLine("table{border-collapse:collapse;margin-bottom:16px}")
            [void]$sbHtml.AppendLine("th,td{border:1px solid #ccc;padding:4px 8px}")
            [void]$sbHtml.AppendLine("th{background:#f0f0f0;text-align:left}")
            [void]$sbHtml.AppendLine(".up{color:#c13434}.down{color:#1b7f3a}")
            [void]$sbHtml.AppendLine(".s{background:#fff7e6;padding:10px;border-left:3px solid #e87722;margin-bottom:16px}")
            [void]$sbHtml.AppendLine("</style></head><body>")
            [void]$sbHtml.AppendLine("<h2>ERSE Competitive - Alteracoes detectadas</h2>")
            [void]$sbHtml.AppendLine("<div class='s'>")
            [void]$sbHtml.AppendLine("<b>Snapshot novo:</b> $timestamp<br>")
            [void]$sbHtml.AppendLine("<b>Snapshot anterior:</b> $($prevFolder.Name)<br>")
            [void]$sbHtml.AppendLine("<b>Alteracoes de preco:</b> $($changes.Count)<br>")
            [void]$sbHtml.AppendLine("<b>Ofertas novas:</b> $($newCods.Count)<br>")
            [void]$sbHtml.AppendLine("<b>Ofertas descontinuadas:</b> $($discontCods.Count)")
            [void]$sbHtml.AppendLine("</div>")

            if ($changes.Count -gt 0) {
                $sortedChanges = $changes | Sort-Object @{Expression = {
                    try {
                        $o = [double]::Parse(($_.Old -replace ',', '.'))
                        $n = [double]::Parse(($_.New -replace ',', '.'))
                        if ($o -ne 0) { [Math]::Abs(($n - $o) / $o) } else { 0 }
                    } catch { 0 }
                }; Descending = $true}

                [void]$sbHtml.AppendLine("<h3>Alteracoes de preco</h3>")
                [void]$sbHtml.AppendLine("<table><tr><th>Oferta</th><th>COD</th><th>Pot.</th><th>Cont.</th><th>Coluna</th><th>Antes</th><th>Depois</th><th>Delta</th></tr>")

                $maxRows = [Math]::Min($sortedChanges.Count, 100)
                for ($i = 0; $i -lt $maxRows; $i++) {
                    $c = $sortedChanges[$i]
                    $deltaStr = '-'
                    try {
                        $o = [double]::Parse(($c.Old -replace ',', '.'))
                        $n = [double]::Parse(($c.New -replace ',', '.'))
                        if ($o -ne 0) {
                            $pct = [Math]::Round((($n - $o) / $o) * 100, 2)
                            $cls = if ($pct -gt 0) { 'up' } elseif ($pct -lt 0) { 'down' } else { '' }
                            $sgn = if ($pct -gt 0) { '+' } else { '' }
                            $deltaStr = "<span class='$cls'>$sgn$pct" + [char]37 + "</span>"
                        }
                    } catch {}
                    [void]$sbHtml.AppendLine("<tr><td>$($c.Nome)</td><td>$($c.Cod)</td><td>$($c.Pot)</td><td>$($c.Cont)</td><td>$($c.Col)</td><td>$($c.Old)</td><td>$($c.New)</td><td>$deltaStr</td></tr>")
                }
                [void]$sbHtml.AppendLine("</table>")
                if ($changes.Count -gt 100) {
                    [void]$sbHtml.AppendLine("<p><i>(top 100 alteracoes por magnitude; total $($changes.Count))</i></p>")
                }
            }

            if ($newCods.Count -gt 0) {
                [void]$sbHtml.AppendLine("<h3>Ofertas novas ($($newCods.Count))</h3>")
                [void]$sbHtml.AppendLine("<table><tr><th>COD</th><th>Nome</th></tr>")
                foreach ($cod in ($newCods | Select-Object -First 100)) {
                    $nm = if ($codNameNew.ContainsKey($cod)) { $codNameNew[$cod] } else { '' }
                    [void]$sbHtml.AppendLine("<tr><td>$cod</td><td>$nm</td></tr>")
                }
                [void]$sbHtml.AppendLine("</table>")
            }

            if ($discontCods.Count -gt 0) {
                [void]$sbHtml.AppendLine("<h3>Ofertas descontinuadas ($($discontCods.Count))</h3>")
                [void]$sbHtml.AppendLine("<table><tr><th>COD</th><th>Ultimo nome conhecido</th></tr>")
                foreach ($cod in ($discontCods | Select-Object -First 100)) {
                    $nm = if ($codNameOld.ContainsKey($cod)) { $codNameOld[$cod] } else { '' }
                    [void]$sbHtml.AppendLine("<tr><td>$cod</td><td>$nm</td></tr>")
                }
                [void]$sbHtml.AppendLine("</table>")
            }

            [void]$sbHtml.AppendLine("</body></html>")

            [System.IO.File]::WriteAllText($emailBodyPath, $sbHtml.ToString(), $writeEncDiff)
        }
    }
}

# === Rebuild Main folder (single merged file) ===
$mainDir = "$base\Main"

# Wipe old Main contents so legacy files don't linger
if (Test-Path $mainDir) { Get-ChildItem $mainDir -File -ErrorAction SilentlyContinue | Remove-Item -Force }
New-Item -ItemType Directory -Path $mainDir -Force | Out-Null

# Source CSVs are UTF-8 with BOM. Read with UTF8 (handles BOM); write without BOM for Power BI.
$readEnc  = [System.Text.Encoding]::UTF8
$writeEnc = New-Object System.Text.UTF8Encoding($false)

# Cond columns kept (by header index in source CondComerciais.csv):
#   2 NomeProposta, 3 TxTModalidade, 4 Segmento, 5 TipoContagem,
#   8 ConsIni_ELE, 9 ConsFim_ELE, 10 Fornecimento,
#   11 DuracaoContrato, 12 Data ini, 13 Data fim,
#   21 FiltroPrecosIndex_ELE, 23 FiltroTarifaSocial, 25 FiltroNovosClientes,
#   27 CustoServicos, 28 ReembFixo,
#   29 ReembTF_ELE, 30 ReembTW_ELE, 31 ReembW_ELE,
#   35 DescontNovoCliente,
#   36 Desc TF_ELE Novo, 37 Desc TW_ELE Novo, 38 Desc W_ELE Novo
$condKeepIdx = @(2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 21, 23, 25, 27, 28, 29, 30, 31, 35, 36, 37, 38)

# Precos columns dropped (only ORD, idx 3). Contagem (idx 5) is kept now -- needed to slice tariff types.
$precosDropIdx = @(3)

function Compile-Merged {
    param($condFolder, $precosFolder, $outputFile, $readEnc, $writeEnc, [int[]]$condKeepIdx, [int[]]$precosDropIdx)

    $folders = Get-ChildItem -Path $precosFolder -Directory -ErrorAction SilentlyContinue | Sort-Object Name

    $allLines = New-Object System.Collections.ArrayList
    $headerWritten = $false

    foreach ($folder in $folders) {
        $ts = $folder.Name
        if ($ts -notmatch '^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})$') { continue }
        $snapshotDate = "{0}-{1}-{2} {3}:{4}:{5}" -f $matches[1], $matches[2], $matches[3], $matches[4], $matches[5], $matches[6]

        $precosPath = Join-Path $folder.FullName 'Precos_ELEGN.csv'
        $condPath   = Join-Path (Join-Path $condFolder $ts) 'CondComerciais.csv'

        if (-not (Test-Path $precosPath)) { continue }
        if (-not (Test-Path $condPath))   { continue }

        # Build COD_Proposta -> joined-Cond-fields (in $condKeepIdx order)
        $condLines = [System.IO.File]::ReadAllLines($condPath, $readEnc)
        $condIdx = @{}
        $emptyJoin = (',' * $condKeepIdx.Length).Replace(',', ';').Substring(1)  # 11 semicolons for 12 empty fields
        for ($i = 1; $i -lt $condLines.Length; $i++) {
            $c = $condLines[$i] -split ';'
            if ($c.Length -lt 36) { continue }
            $key = $c[1]
            $vals = New-Object System.Collections.ArrayList
            foreach ($kIdx in $condKeepIdx) {
                if ($kIdx -lt $c.Length) { [void]$vals.Add($c[$kIdx]) } else { [void]$vals.Add('') }
            }
            $condIdx[$key] = $vals -join ';'
        }

        $precosLines = [System.IO.File]::ReadAllLines($precosPath, $readEnc)
        if ($precosLines.Length -eq 0) { continue }

        # Header
        if (-not $headerWritten) {
            $ph = $precosLines[0] -split ';'
            $keptPh = New-Object System.Collections.ArrayList
            for ($j = 0; $j -lt $ph.Length; $j++) {
                if ($precosDropIdx -notcontains $j) { [void]$keptPh.Add($ph[$j]) }
            }
            $ch = $condLines[0] -split ';'
            $condHeader = New-Object System.Collections.ArrayList
            foreach ($kIdx in $condKeepIdx) {
                if ($kIdx -lt $ch.Length) { [void]$condHeader.Add($ch[$kIdx]) } else { [void]$condHeader.Add('') }
            }
            [void]$allLines.Add(($keptPh -join ';') + ';' + ($condHeader -join ';') + ';SnapshotDate')
            $headerWritten = $true
        }

        # Data rows
        for ($i = 1; $i -lt $precosLines.Length; $i++) {
            $cells = $precosLines[$i] -split ';'
            $codKey = if ($cells.Length -gt 4) { $cells[4] } else { '' }
            $condData = if ($condIdx.ContainsKey($codKey)) { $condIdx[$codKey] } else { $emptyJoin }

            $kept = New-Object System.Collections.ArrayList
            for ($j = 0; $j -lt $cells.Length; $j++) {
                if ($precosDropIdx -notcontains $j) { [void]$kept.Add($cells[$j]) }
            }

            [void]$allLines.Add(($kept -join ';') + ';' + $condData + ";$snapshotDate")
        }
    }

    [System.IO.File]::WriteAllLines($outputFile, $allLines, $writeEnc)
}

Compile-Merged -condFolder "$base\Histórico\Condições Comerciais" -precosFolder "$base\Histórico\Preços" -outputFile "$mainDir\ERSE_main.csv" -readEnc $readEnc -writeEnc $writeEnc -condKeepIdx $condKeepIdx -precosDropIdx $precosDropIdx

$finalMsg = "$status; Main rebuilt"
if ($changeStats) { $finalMsg += "; $changeStats" }
[Console]::Write($finalMsg)
```

### Action 3: Apresentar mensagem
- Title: `ERSE`
- Message: `%Result%`
- Icon: Information

### Action 4: Send change-alert email (only when there's a new snapshot)

The PowerShell step writes an HTML report to `_state\email_body.html` whenever there's a new snapshot. This action picks it up and emails it via Outlook.

**4a — Se** (Conditional)
- Categoria: **Condições → Se**
- Primeiro operando: `%Result%`
- Operador: `Contains` / `Contém`
- Segundo operando: `UPDATED:`

**Inside the If block**:

**4b — Iniciar o Outlook**
- Categoria: **Outlook → Iniciar o Outlook**
- Sem parâmetros para preencher.
- Variável produzida: `OutlookInstance` (ou nome semelhante — o PAD gera por defeito).

**4c — Ler texto do ficheiro**
- Categoria: **Ficheiro → Ler texto do ficheiro**
- Caminho: `%BASE%\_state\email_body.html`
- Armazenar como: `Texto individual`
- Codificação: `UTF-8`
- Guardar em: `EmailHtml`

**4d — Enviar mensagem de e-mail através do Outlook**
- Categoria: **Outlook → Enviar mensagem de e-mail através do Outlook**
- **Instância do Outlook**: `%OutlookInstance%` (a variável produzida pelo passo 4b)
- Conta: a tua conta Outlook (default)
- Para: o teu email (ex: `nome@empresa.com`); separa múltiplos por `;`
- Assunto: `ERSE — alterações detectadas (%Result%)`
- Corpo: `%EmailHtml%`
- O corpo é HTML: ✅ ligado
- Anexos: nenhum

**4e — Fechar o Outlook** (opcional, mas boas práticas)
- Categoria: **Outlook → Fechar o Outlook**
- Instância do Outlook: `%OutlookInstance%`

**End if**

> Se preferires SMTP em vez de Outlook (caso o Outlook não esteja instalado), troca por **Servidor de correio → Enviar e-mail** com SMTP server da Repsol, credenciais, etc.

## Outputs

| Output | Meaning |
|---|---|
| `UPDATED: 2026-04-13_173154; Main rebuilt; 47 precos alterados; 3 novas; 1 descontinuadas` | New ZIP downloaded, archived, Main files refreshed, change-alert email sent via Action 4 |
| `NO_UPDATE: 2026-04-13_173154 already in Historico; Main rebuilt` | Current ERSE timestamp already exists locally — skipped download (no email sent) |
| `ERROR: ...` | Something broke; check `PsErrors` for details |

## What `ERSE_main.csv` looks like

Single file. Each row is one Precos row enriched with the matching CondComerciais fields and tagged with the snapshot date. Semicolon-delimited, **UTF-8** encoding (no BOM).

24 columns total:

**From Precos** (drop only `ORD`):
1. `COM` — competitor code
2. `Pot_Cont` — contracted power (kVA)
3. `Escalao` — gas consumption band
4. `COD_Proposta` — offer ID (join key)
5. `Contagem` — tariff type code: `1`=Simples, `2`=Bi-horária, `3`=Tri-horária, blank=gas only
6. `TF` — Termo Fixo electricity (€/dia or €/mês)
7. `TV|TVFV|TVP` — Variable term: TV (Simples) / TVFV (Bi-horária ponta) / TVP (Tri-horária ponta)
8. `TVV|TVC` — TVV (Bi-horária vazio) / TVC (Tri-horária cheias)
9. `TVVz` — Tri-horária vazio
10. `TFGN` — Termo Fixo gas natural
11. `TVGN` — Termo Variável gas natural

**Joined from CondComerciais** (on `COD_Proposta`):
12. `NomeProposta` — commercial name
13. `TxTModalidade` — offer modality / partnerships (e.g. "Apenas para clientes ACP", "TARIFA SANTANDER...")
14. `Segmento` — Dom / Ndom / Tod
15. `TipoContagem` — supported contagem codes per offer (e.g. `123` = simples + bi + tri)
16. `ConsIni_ELE` — minimum applicable annual electricity consumption (kWh)
17. `ConsFim_ELE` — maximum applicable annual electricity consumption (kWh)
18. `Fornecimento` — ELE / GN / DUAL
19. `DuracaoContrato` — months
20. `Data ini` — offer start date
21. `Data fim` — offer end date
22. `FiltroPrecosIndex_ELE` — indexed-price flag
23. `FiltroTarifaSocial` — social tariff flag
24. `FiltroNovosClientes` — new-customer-only flag
25. `CustoServicos_c/IVA (€/ano)` — bundled services cost (annual, with VAT)
26. `ReembFixo (€/ano)` — fixed-amount reimbursement
27. `ReembTF_ELE (%)` — % reimbursement on TF (electricity)
28. `ReembTW_ELE (%)` — % reimbursement on TV (electricity variable term)
29. `ReembW_ELE (€/kWh)` — €/kWh reimbursement (electricity)
30. `DescontNovoCliente_c/IVA (€/ano)` — new-customer discount value (€/year)
31. `Desc. TF_ELE (%) - Novo Cliente` — % discount on TF for new customers
32. `Desc. TW_ELE (%) - Novo Cliente` — % discount on variable term for new customers
33. `Desc. W_ELE (€/kWh) - Novo Cliente` — €/kWh discount for new customers

**Added by the script:**
34. `SnapshotDate` — when ERSE published this version (datetime)

The join is a left join with Precos as the left side: every price row is preserved; if a Precos row has no matching offer in CondComerciais (rare/never), the joined fields are empty.

## Test plan

1. **Backfill first** (one-off, see `erse-historical-backfill.md`) so `Histórico\` is populated.
2. **First run of this flow**: should download today's ZIP if its timestamp is newer than anything in `Histórico\`. Output: `UPDATED: ...`
3. **Second run, immediately**: should see the timestamp already exists and skip the download. Output: `NO_UPDATE: ... already in Historico`. `ERSE_main.csv` is still refreshed (no-op effectively, same content).

## Scheduling

Use Windows Task Scheduler to run daily:

1. Task Scheduler → Create Task
2. Trigger: Daily at 08:00
3. Action: Start a program
   - Program: `"C:\Program Files (x86)\Power Automate Desktop\PAD.Console.Host.exe"`
   - Arguments: `"ms-powerautomate:/console/flow/run?workflowName=ERSE_Competitive_Update"`
4. Settings → tick "Run task as soon as possible after a scheduled start is missed"

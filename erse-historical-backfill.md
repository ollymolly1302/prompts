# ERSE Historical Backfill (one-off)

Recovers ~5 years of historical commercial-offer ZIPs from ERSE's tariff simulator and seeds your `Histórico\` folder. **Run this once**, then the daily flow keeps history current going forward.

## How it found the historical files

ERSE's homepage loads its current ZIP filename from `https://simuladorprecos.erse.pt/config/Settings.json` → field `csvPath`. The Wayback Machine has captured this JSON file 30+ times since 2018, exposing what the "current" filename was at each capture point. Most of those filenames are **still live on ERSE's server** (the directory listing is blocked, but direct file URLs work). Older ones that ERSE has deleted are still available as binary captures in the Wayback Machine.

Net: **16 distinct historical snapshots are recoverable**, going back to August 2021.

There are 7 more snapshots whose URL is known but whose binary has been lost (deleted from ERSE *and* never captured by Wayback) — those are gone for good.

## Folder layout produced

```
ERSE\
└── Histórico\
    ├── Condições Comerciais\
    │   ├── 2021-08-30_191926\CondComerciais.csv
    │   ├── 2024-09-17_141606\CondComerciais.csv
    │   ├── ...
    │   └── 2026-02-23_150212\CondComerciais.csv
    └── Preços\
        ├── 2021-08-30_191926\Precos_ELEGN.csv
        ├── ...
        └── 2026-02-23_150212\Precos_ELEGN.csv
```

The folder name is `YYYY-MM-DD_HHMMSS` (sortable, parseable by Power Query). This matches the format the daily flow uses, so Power BI sees them as one continuous time series.

## How to run

1. Open **PowerShell** on the work PC (any version, no admin needed).
2. Edit the `$base` line in the script below to point at your ERSE folder.
3. Paste the entire script into PowerShell and press Enter.
4. It takes ~1 minute. Output shows `[OK]`, `[SKIP]` (already done), or `[FAIL]` per snapshot.
5. After it finishes, you can delete the script — it's a one-off.

## The script

```powershell
# === ERSE Historical Backfill — one-off ===
# Edit the next line to point at your ERSE folder:
$base = 'C:\Users\<you>\Downloads\ERSE'

# (timestamp_for_folder, ERSE filename, optional wayback timestamp)
# If $wayback is non-null, fetch from Wayback Machine instead of ERSE direct.
$snapshots = @(
    # --- Live on ERSE (Dec 2024 onwards) ---
    @{ ts='2024-12-13_182211'; file='20241213 182211 CSV.zip'; wayback=$null },
    @{ ts='2025-02-21_171922'; file='20250221 171922 CSV.zip'; wayback=$null },
    @{ ts='2025-03-07_104921'; file='20250307 104921 CSV.zip'; wayback=$null },
    @{ ts='2025-04-04_141850'; file='20250404 141850 CSV.zip'; wayback=$null },
    @{ ts='2025-04-07_121828'; file='20250407 121828 CSV.zip'; wayback=$null },
    @{ ts='2025-06-06_114015'; file='20250606 114015 CSV.zip'; wayback=$null },
    @{ ts='2025-09-19_100313'; file='20250919 100313 CSV.zip'; wayback=$null },
    @{ ts='2025-10-17_141819'; file='20251017 141819 CSV.zip'; wayback=$null },
    @{ ts='2025-11-11_100533'; file='20251111 100533 CSV.zip'; wayback=$null },
    @{ ts='2026-01-06_184111'; file='20260106 184111 CSV.zip'; wayback=$null },
    @{ ts='2026-02-03_195117'; file='20260203 195117 CSV.zip'; wayback=$null },
    @{ ts='2026-02-09_152639'; file='20260209 152639 CSV.zip'; wayback=$null },
    @{ ts='2026-02-23_150212'; file='20260223 150212 CSV.zip'; wayback=$null },

    # --- ERSE deleted, Wayback Machine has the binary (older domain) ---
    @{ ts='2021-08-30_191926'; file='20210830 191926 CSV.zip'; wayback='20210831232814' },
    @{ ts='2024-09-17_141606'; file='20240917 141606 CSV.zip'; wayback='20240927093808' },
    @{ ts='2024-10-01_112646'; file='20241001 112646 CSV.zip'; wayback='20241002072324' }
)

$erseBase    = 'https://simuladorprecos.erse.pt/Admin/csvs/'
$waybackOld  = 'https://simulador.precos.erse.pt/Admin/csvs/'  # different domain, only for Wayback
$tmpDir      = "$base\_tmp_backfill"

if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

$success = 0; $skipped = 0; $failed = 0; $failedList = @()

foreach ($snap in $snapshots) {
    $ts        = $snap.ts
    $file      = $snap.file
    $waybackTs = $snap.wayback

    $condDest   = "$base\Histórico\Condições Comerciais\$ts"
    $precosDest = "$base\Histórico\Preços\$ts"

    if ((Test-Path "$condDest\CondComerciais.csv") -and (Test-Path "$precosDest\Precos_ELEGN.csv")) {
        Write-Host "[SKIP] $ts (already backfilled)"
        $skipped++
        continue
    }

    $encodedFile = $file -replace ' ', '%20'
    if ($waybackTs) {
        $url = "https://web.archive.org/web/${waybackTs}id_/${waybackOld}${encodedFile}"
    } else {
        $url = "${erseBase}${encodedFile}"
    }

    $zipFile = "$tmpDir\$ts.zip"
    Write-Host "[GET]  $ts"

    try {
        Invoke-WebRequest -Uri $url -OutFile $zipFile -UseBasicParsing -ErrorAction Stop -TimeoutSec 60
    } catch {
        Write-Host "  [FAIL] download: $($_.Exception.Message)"
        $failed++; $failedList += $ts
        continue
    }

    $extractDir = "$tmpDir\extract_$ts"
    if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
    try {
        Expand-Archive -Path $zipFile -DestinationPath $extractDir -Force -ErrorAction Stop
    } catch {
        Write-Host "  [FAIL] extract: $($_.Exception.Message)"
        $failed++; $failedList += $ts
        continue
    }

    $condCsv   = Get-ChildItem -Path $extractDir -Recurse -Filter 'CondComerciais.csv' | Select-Object -First 1
    $precosCsv = Get-ChildItem -Path $extractDir -Recurse -Filter 'Precos_ELEGN.csv'   | Select-Object -First 1

    if (-not $condCsv -or -not $precosCsv) {
        Write-Host "  [FAIL] expected CSVs not found in ZIP"
        $failed++; $failedList += $ts
        continue
    }

    New-Item -ItemType Directory -Path $condDest -Force | Out-Null
    New-Item -ItemType Directory -Path $precosDest -Force | Out-Null
    Copy-Item $condCsv.FullName   "$condDest\CondComerciais.csv"   -Force
    Copy-Item $precosCsv.FullName "$precosDest\Precos_ELEGN.csv"   -Force

    Write-Host "  [OK]"
    $success++
}

Remove-Item $tmpDir -Recurse -Force

Write-Host ""
Write-Host "=== Backfill complete ==="
Write-Host "  Success: $success"
Write-Host "  Skipped: $skipped"
Write-Host "  Failed:  $failed"
if ($failedList.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed snapshots (re-run to retry, or check network):"
    $failedList | ForEach-Object { Write-Host "  - $_" }
}
```

## What's in the snapshot list, and what's missing

**Recoverable (16 snapshots — the script handles them):**

| Date | Source |
|---|---|
| 2021-08-30 | Wayback Machine |
| 2024-09-17 | Wayback Machine |
| 2024-10-01 | Wayback Machine |
| 2024-12-13 | ERSE |
| 2025-02-21 | ERSE |
| 2025-03-07 | ERSE |
| 2025-04-04 | ERSE |
| 2025-04-07 | ERSE |
| 2025-06-06 | ERSE |
| 2025-09-19 | ERSE |
| 2025-10-17 | ERSE |
| 2025-11-11 | ERSE |
| 2026-01-06 | ERSE |
| 2026-02-03 | ERSE |
| 2026-02-09 | ERSE |
| 2026-02-23 | ERSE |

**Lost forever (URLs known but binary unavailable):**

`2021-10-15`, `2023-07-07`, `2023-07-12`, `2023-07-17`, `2024-01-08`, `2024-05-09`, `2024-11-05`

These 7 published versions exist as references but the actual ZIPs are nowhere accessible.

## After running

Verify with:

```powershell
Get-ChildItem "$base\Histórico\Preços" -Directory | Sort-Object Name | Select-Object Name
```

Should list 16 timestamped folders. Once verified, this script can be deleted — the daily flow handles everything from now on.

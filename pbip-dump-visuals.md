# Dump Power BI PBIP report visuals via PowerShell

When a Power BI file is saved in **PBIP (Power BI Project)** format, the report layer is just a folder of JSON files (PBIR format) sitting next to the TMDL semantic model. That makes it trivial to extract — no SDK, no admin rights, no third-party tools — using a one-shot PowerShell script.

This is useful when you want to document every visual on a report (chart type, fields in each bucket, filters, formatting) without clicking through them one by one.

## What you get

The script walks the `.Report/definition/` folder and concatenates every JSON definition into a single text file:

- `report.json` — global report definition, theme, page order
- `pages.json` — list of pages with their order/visibility
- `page.json` — per-page metadata (name, dimensions, filters, visual order)
- `visual.json` — **one per visual**, with visual type, fields wells (axis / values / legend / tooltip), filters, formatting
- `bookmarks.json` — bookmarks (often used for nav buttons / show-hide visuals)

Each block in the output is preceded by a header showing its relative path so you can tell which page / visual each chunk belongs to.

## Script

```powershell
# 1. Edit only this path — point it at the .Report\definition folder of your PBIP project.
$root = ""

# 2. Output file (defaults to your Desktop)
$output = "$HOME\Desktop\pbip_visuals_dump.txt"

Get-ChildItem $root -Recurse -Include "visual.json","page.json","report.json","pages.json","bookmarks.json" |
    Sort-Object FullName |
    ForEach-Object {
        "===== $($_.FullName.Substring($root.Length)) ====="
        Get-Content $_.FullName -Raw
        ""
    } | Set-Content $output -Encoding UTF8

Write-Host "Done -> $output"
```

## Variations

**Pipe straight to clipboard** instead of writing a file (useful if you want to paste somewhere immediately):

```powershell
... | Set-Clipboard
```

**Filter to a single page** while iterating on one area:

```powershell
$root = ""
$page = "Overview"

Get-ChildItem (Join-Path $root "pages\$page") -Recurse -Filter "visual.json" |
    ForEach-Object {
        "===== $($_.FullName.Substring($root.Length)) ====="
        Get-Content $_.FullName -Raw
        ""
    } | Set-Clipboard
```

**Exclude formatting noise** — `visual.json` files include a lot of `objects.<name>.properties.<x>` formatting blocks. If you only care about field bindings, post-process with `jq` or a quick PowerShell `Where-Object` on the parsed JSON to keep just the `query` / `dataRoles` portions.

## How the JSON is structured

Inside a `visual.json`, the parts you usually care about for documentation are:

- `visual.visualType` — the chart kind (e.g. `clusteredColumnChart`, `pivotTable`, `slicer`, `card`).
- `visual.query.queryState` — the field wells. Each bucket (`Category`, `Y`, `Series`, `Values`, `Tooltips`, `Rows`, `Columns`) contains a list of projections, each pointing to a `Table.Column` or measure reference.
- `filterConfig` — visual-level filters.
- `objects` — formatting (titles, colors, legend toggles).

Once you have this dump you can mechanically fill in a per-visual table: page → visual title → type → fields per bucket → filters.

## Why PBIP and not PBIX

A `.pbix` file is a binary zip that mixes everything together. A `.pbip` saves the same content as a folder of human-readable JSON (report) and TMDL (model). To convert: open the `.pbix` in Power BI Desktop, then **File → Save as → Power BI project**. After that, the script above works.

If your file is still in `.pbix` only, save-as PBIP first.

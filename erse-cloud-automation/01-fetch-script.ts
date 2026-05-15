/**
 * Office Script 1: FetchERSE
 *
 * Runs inside an Excel Online workbook hosted on SharePoint.
 * Called from a Power Automate cloud flow as a "Run script" action.
 *
 * What it does:
 *   1. Reads the ERSE Settings.json URL from the workbook's "Config" sheet
 *      (table `tblConfig`, row where ParamName = "SettingsURL").
 *      Falls back to the public default if the table is missing.
 *   2. Fetches Settings.json from ERSE and extracts `csvPath` (URL of the
 *      current commercial-offers ZIP file).
 *   3. Parses the timestamp embedded in the ZIP filename
 *      (format: ".../<YYYYMMDD> <HHMMSS> CSV.zip").
 *   4. Downloads the ZIP file as a binary ArrayBuffer.
 *   5. Encodes the binary as base64 in chunks (avoids stack overflow for
 *      ZIPs of a few hundred KB).
 *   6. Logs progress at each step via console.log() and best-effort writes
 *      a summary row to the "Log" sheet.
 *   7. Returns { status, base64, timestamp, sizeKB } to the cloud flow,
 *      which then decodes the base64, writes the ZIP to OneDrive, and
 *      extracts it using the standard "Extract archive to folder" action.
 *
 * Requires:
 *   - Sheet "Config" with Excel Table "tblConfig" (optional — has fallback)
 *   - Sheet "Log" (optional — log write is best-effort)
 *
 * Observability:
 *   - console.log() at every step → visible in the Office Scripts
 *     "Output Logs" panel when run from the editor.
 *   - A summary row is appended to the "Log" sheet on success.
 */

async function main(workbook: ExcelScript.Workbook): Promise<{
    status: string;
    base64: string;
    timestamp: string;
    sizeKB: number;
}> {
    console.log("=== START FetchERSE ===");

    // 1. Read SettingsURL from Config table (with fallback to public default)
    let settingsUrl = "https://simuladorprecos.erse.pt/config/Settings.json";
    try {
        const configSheet = workbook.getWorksheet("Config");
        const configTable = configSheet.getTable("tblConfig");
        const configRows = configTable.getRange().getValues();
        for (let i = 1; i < configRows.length; i++) {
            if (configRows[i][0] === "SettingsURL" && configRows[i][1]) {
                settingsUrl = configRows[i][1] as string;
                break;
            }
        }
        console.log(`Settings URL: ${settingsUrl}`);
    } catch (e) {
        console.log(`Warning: couldn't read Config table, using default URL. Reason: ${e}`);
    }

    // 2. Fetch Settings.json
    let settings: { csvPath?: string };
    try {
        console.log("Fetching Settings.json...");
        const resp = await fetch(settingsUrl);
        console.log(`Settings.json status: ${resp.status}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        settings = await resp.json();
        console.log(`Settings.json parsed. csvPath: ${settings.csvPath}`);
    } catch (e) {
        console.log(`ERROR fetching Settings.json: ${e}`);
        return { status: `ERROR: ${e}`, base64: "", timestamp: "", sizeKB: 0 };
    }

    if (!settings.csvPath) {
        console.log("ERROR: csvPath missing in Settings.json");
        return { status: "ERROR: csvPath missing", base64: "", timestamp: "", sizeKB: 0 };
    }

    // 3. Parse timestamp from the ZIP filename
    //    Expected pattern: ".../YYYYMMDD HHMMSS CSV.zip"
    const match = settings.csvPath.match(/(\d{8}) (\d{6}) CSV\.zip$/);
    const timestamp = match
        ? `${match[1].substring(0, 4)}-${match[1].substring(4, 6)}-${match[1].substring(6, 8)}_${match[2]}`
        : "unknown";
    console.log(`Parsed timestamp: ${timestamp}`);

    // 4. Fetch ZIP as binary
    let arrayBuf: ArrayBuffer;
    try {
        console.log("Fetching ZIP file...");
        const zipResp = await fetch(settings.csvPath);
        console.log(`ZIP status: ${zipResp.status}`);
        if (!zipResp.ok) throw new Error(`HTTP ${zipResp.status}`);
        arrayBuf = await zipResp.arrayBuffer();
        console.log(`ZIP downloaded, size: ${arrayBuf.byteLength} bytes`);
    } catch (e) {
        console.log(`ERROR downloading ZIP: ${e}`);
        return { status: `ERROR: ${e}`, base64: "", timestamp, sizeKB: 0 };
    }

    // 5. Convert ArrayBuffer to base64 (chunked, to avoid String.fromCharCode stack issues)
    const bytes = new Uint8Array(arrayBuf);
    const sizeKB = Math.round(bytes.byteLength / 1024);
    console.log(`Encoding to base64. Size: ${sizeKB} KB`);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);
    console.log(`Base64 encoded. Length: ${base64.length} chars`);

    // 6. Best-effort log to "Log" sheet (doesn't fail the script if sheet missing)
    try {
        const logSheet = workbook.getWorksheet("Log");
        if (logSheet) {
            const lastRow = logSheet.getUsedRange()?.getRowCount() ?? 1;
            logSheet.getCell(lastRow, 0).setValue(new Date().toISOString());
            logSheet.getCell(lastRow, 1).setValue("FetchERSE OK");
            logSheet.getCell(lastRow, 2).setValue(sizeKB);
            logSheet.getCell(lastRow, 3).setValue(timestamp);
            logSheet.getCell(lastRow, 4).setValue(`ZIP ${sizeKB}KB downloaded`);
            console.log(`Logged to Log sheet at row ${lastRow + 1}`);
        } else {
            console.log("Warning: 'Log' sheet not found, skipping log write");
        }
    } catch (e) {
        console.log(`Warning: couldn't write to Log sheet: ${e}`);
    }

    console.log("=== END FetchERSE — SUCCESS ===");
    return { status: "OK", base64: base64, timestamp, sizeKB };
}

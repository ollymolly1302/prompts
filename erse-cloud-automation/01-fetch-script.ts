/**
 * Office Script 1: FetchERSE
 *
 * Runs inside an Excel Online workbook hosted on SharePoint.
 * Called from a Power Automate cloud flow as a "Run script" action.
 *
 * What it does:
 *   1. Reads the ERSE Settings.json URL from the workbook's "Config" sheet
 *      (table `tblConfig`, row where ParamName = "SettingsURL").
 *   2. Fetches Settings.json from ERSE and extracts `csvPath` (URL of the
 *      current commercial-offers ZIP file).
 *   3. Parses the timestamp embedded in the ZIP filename
 *      (format: ".../<YYYYMMDD> <HHMMSS> CSV.zip").
 *   4. Downloads the ZIP file as a binary ArrayBuffer.
 *   5. Encodes the binary as base64 in chunks (avoids stack overflow for
 *      ZIPs of a few hundred KB).
 *   6. Logs the run to the "Log" sheet.
 *   7. Returns { status, base64, timestamp, sizeKB } to the cloud flow,
 *      which then decodes the base64, writes the ZIP to OneDrive, and
 *      extracts it using the standard "Extract archive to folder" action.
 *
 * Requires:
 *   - Sheet "Config" with Excel Table "tblConfig"
 *   - Sheet "Log" (plain range; script appends rows below the used range)
 */

async function main(workbook: ExcelScript.Workbook): Promise<{
    status: string;
    base64: string;
    timestamp: string;
    sizeKB: number;
}> {
    // 1. Read SettingsURL from Config table (with fallback to the default ERSE URL)
    const configSheet = workbook.getWorksheet("Config");
    const configTable = configSheet.getTable("tblConfig");
    const configRows = configTable.getRange().getValues();

    let settingsUrl = "https://simuladorprecos.erse.pt/config/Settings.json";
    for (let i = 1; i < configRows.length; i++) {
        if (configRows[i][0] === "SettingsURL" && configRows[i][1]) {
            settingsUrl = configRows[i][1] as string;
            break;
        }
    }

    // 2. Fetch Settings.json
    let settings: { csvPath?: string };
    try {
        const resp = await fetch(settingsUrl);
        if (!resp.ok) throw new Error(`Settings.json HTTP ${resp.status}`);
        settings = await resp.json();
    } catch (e) {
        return {
            status: `ERROR fetching Settings.json: ${e}`,
            base64: "",
            timestamp: "",
            sizeKB: 0,
        };
    }

    if (!settings.csvPath) {
        return {
            status: "ERROR: csvPath missing in Settings.json",
            base64: "",
            timestamp: "",
            sizeKB: 0,
        };
    }

    // 3. Parse timestamp from the ZIP filename
    //    Expected pattern: ".../YYYYMMDD HHMMSS CSV.zip"
    const match = settings.csvPath.match(/(\d{8}) (\d{6}) CSV\.zip$/);
    const timestamp = match
        ? `${match[1].substring(0, 4)}-${match[1].substring(4, 6)}-${match[1].substring(6, 8)}_${match[2]}`
        : "unknown";

    // 4. Fetch ZIP as binary
    let arrayBuf: ArrayBuffer;
    try {
        const zipResp = await fetch(settings.csvPath);
        if (!zipResp.ok) throw new Error(`ZIP HTTP ${zipResp.status}`);
        arrayBuf = await zipResp.arrayBuffer();
    } catch (e) {
        return {
            status: `ERROR downloading ZIP: ${e}`,
            base64: "",
            timestamp,
            sizeKB: 0,
        };
    }

    // 5. Convert ArrayBuffer to base64 (chunked, to avoid String.fromCharCode stack issues)
    const bytes = new Uint8Array(arrayBuf);
    const sizeKB = Math.round(bytes.byteLength / 1024);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);

    // 6. Append a row to the "Log" sheet
    const logSheet = workbook.getWorksheet("Log");
    const lastRow = logSheet.getUsedRange()?.getRowCount() ?? 1;
    logSheet.getCell(lastRow, 0).setValue(new Date().toISOString());
    logSheet.getCell(lastRow, 1).setValue("FetchERSE OK");
    logSheet.getCell(lastRow, 2).setValue(sizeKB);
    logSheet.getCell(lastRow, 3).setValue(timestamp);
    logSheet.getCell(lastRow, 4).setValue(`ZIP ${sizeKB}KB downloaded`);

    return {
        status: "OK",
        base64: base64,
        timestamp: timestamp,
        sizeKB: sizeKB,
    };
}

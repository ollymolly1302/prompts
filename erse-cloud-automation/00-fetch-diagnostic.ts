/**
 * Diagnostic: test whether Office Scripts can call external URLs at all.
 *
 * Microsoft 365 admins can disable or restrict external fetch in Office
 * Scripts at the tenant level. If the main FetchERSE script fails with
 * `TypeError: Failed to fetch`, run this diagnostic first to determine
 * whether the block is tenant-wide or specific to the ERSE domain.
 *
 * Target: https://httpbin.org/json — a public, CORS-friendly endpoint
 * commonly used to test HTTP clients. No credentials, no PII, returns
 * a small static JSON.
 *
 * Interpretation of the output:
 *   - "Status: 200" + JSON visible  → fetch works in general; ERSE
 *                                     domain is specifically blocked
 *                                     (admin allow-list needed).
 *   - "FAILED: Failed to fetch"     → external fetch is fully disabled
 *                                     in this tenant; need IT to enable
 *                                     Office Scripts external calls.
 *   - "Status: <other>"             → unexpected; capture and report.
 *
 * Reference: https://learn.microsoft.com/en-us/office/dev/scripts/develop/external-calls
 */

async function main(workbook: ExcelScript.Workbook): Promise<string> {
    console.log("Test: httpbin (public, CORS-OK)");
    try {
        const r = await fetch("https://httpbin.org/json");
        console.log(`Status: ${r.status}`);
        const j = await r.json();
        console.log(`OK: ${JSON.stringify(j).substring(0, 200)}`);
        return "FETCH WORKS";
    } catch (e) {
        console.log(`FAILED: ${e}`);
        return `FETCH BLOCKED: ${e}`;
    }
}

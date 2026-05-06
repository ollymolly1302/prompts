# ERSE Settings.json — sample for Power Automate "Parse JSON" schema

When building a Power Automate Cloud flow that consumes ERSE's tariff simulator config, the **Parse JSON** action needs a schema. The easiest way to generate one is to paste a real sample of the JSON into the "Generate from sample" dialog.

The endpoint is public:

```
https://simuladorprecos.erse.pt/config/Settings.json
```

## Sample payload

This is the live response (only the `csvPath` timestamp changes daily; all other keys are stable):

```json
{
  "externalLink": "https://simuladorprecos.erse.pt/content/files/PerguntasRespostas_2021.pdf",
  "csvPath": "https://simuladorprecos.erse.pt/Admin/csvs/20260101 000000 CSV.zip",
  "boletim1": "https://www.erse.pt/biblioteca/atos-e-documentos-da-erse/?tipologia=----+Ofertas+Comerciais&setor=Eletricidade&ano=&descricao=",
  "boletim2": "https://www.erse.pt/biblioteca/atos-e-documentos-da-erse/?tipologia=----+Ofertas+Comerciais&setor=G%C3%A1s+Natural&ano=&descricao=",
  "defaultValuesGN": [
    {
      "consumption": "1610",
      "timePeriod": "3"
    },
    {
      "consumption": "3407",
      "timePeriod": "3"
    },
    {
      "consumption": "7467",
      "timePeriod": "3"
    }
  ],
  "defaultValuesELE": [
    {
      "countingCycle": "2",
      "consumptionPeriod1": "1140",
      "consumptionPeriod2": "760",
      "power": "3",
      "timePeriod": "3"
    },
    {
      "countingCycle": "2",
      "consumptionPeriod1": "3000",
      "consumptionPeriod2": "2000",
      "power": "6",
      "timePeriod": "3"
    },
    {
      "countingCycle": "2",
      "consumptionPeriod1": "6540",
      "consumptionPeriod2": "4360",
      "power": "8",
      "timePeriod": "3"
    }
  ]
}
```

## Schema generated from this sample

If you want to skip the "Generate from sample" step and paste the schema directly into Power Automate's Parse JSON action:

```json
{
  "type": "object",
  "properties": {
    "externalLink": { "type": "string" },
    "csvPath": { "type": "string" },
    "boletim1": { "type": "string" },
    "boletim2": { "type": "string" },
    "defaultValuesGN": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "consumption": { "type": "string" },
          "timePeriod": { "type": "string" }
        },
        "required": ["consumption", "timePeriod"]
      }
    },
    "defaultValuesELE": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "countingCycle": { "type": "string" },
          "consumptionPeriod1": { "type": "string" },
          "consumptionPeriod2": { "type": "string" },
          "power": { "type": "string" },
          "timePeriod": { "type": "string" }
        },
        "required": ["countingCycle", "consumptionPeriod1", "consumptionPeriod2", "power", "timePeriod"]
      }
    }
  },
  "required": ["csvPath"]
}
```

## Field of interest for the download flow

Only `csvPath` is needed for the daily-download workflow. It points to a ZIP file whose URL is rewritten daily with the new snapshot timestamp:

```
https://simuladorprecos.erse.pt/Admin/csvs/<YYYYMMDD> <HHMMSS> CSV.zip
```

The ZIP contains two CSVs:
- `Precos.csv` (or `Precos_ELEGN.csv`) — current prices for every offer × tier × time-period
- `CondComerciais.csv` — commercial conditions: offer name, duration, validity dates

Notes:
- The filename uses a literal space between date and time, which is unusual. URL-encode it (`%20`) before passing to HTTP actions in tools that don't auto-encode.
- The ZIP itself is hosted on a public CDN; no authentication required.
- The endpoint is read frequently by the public simulator UI, so caching is friendly. A daily fetch from your own automation is well within polite usage.

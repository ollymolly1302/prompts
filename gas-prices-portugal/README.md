# Gas prices in Portugal — Market overview data

Compiled monthly natural gas prices for Portugal (Jan 2024 → Apr 2026), comparing the wholesale free market (MIBGAS VTP) against the regulated supplier-of-last-resort acquisition cost (CURg, set by ERSE). All sources are 100% official and public.

## Files

| File | What it is |
|---|---|
| `mibgas_vtp_pt_precos_mensais.xlsx` | MIBGAS VTP monthly average prices (Day-Ahead, EUR/MWh) — Portuguese virtual point |
| `mibgas_vtp_pt_grafico.png` | Chart preview of the MIBGAS VTP series |
| `regulado_vs_mercado_pt.xlsx` | Comparative: MIBGAS VTP vs CURg cost, by month — with annual averages, sources, and embedded chart |
| `regulado_vs_mercado_pt_grafico.png` | Chart preview of the comparison |

## Methodology

- **MIBGAS VTP (free market wholesale)**: monthly arithmetic mean of the daily Reference Price for the Day-Ahead product (GDAPT_D+1) at the Portuguese virtual point (VTP), aggregated from MIBGAS annual data files.
- **CURg cost (regulated wholesale)**: ERSE-approved unit gas acquisition cost for the regulated supplier-of-last-resort wholesaler, stepped per gas year (October → September).
  - 2023-24: 2,0858 cent€/kWh = 20,86 EUR/MWh
  - 2024-25: 2,1470 cent€/kWh = 21,47 EUR/MWh
  - 2025-26: 1,8687 cent€/kWh = 18,69 EUR/MWh
- Both values are **without ATR costs** (Acesso às Redes), so they are directly comparable at the wholesale energy-cost level.

## Key takeaways

| Year | MIBGAS VTP avg | CURg avg | Differential (free − regulated) |
|---|---|---|---|
| 2024 | 34,73 €/MWh | 21,01 €/MWh | **+13,72** |
| 2025 | 36,10 €/MWh | 20,77 €/MWh | **+15,32** |
| 2026 (Jan-Apr) | 41,05 €/MWh | 18,69 €/MWh | **+22,36** |

The differential **more than doubled** in 2026, driven by a March 2026 spike in MIBGAS (€53,02/MWh) while CURg stayed stable.

## Two slide-ready bullets

1. **In 2026, free market costs nearly double the regulated price** — gap of €22/MWh, which doubled from €14/MWh in 2024. Aggravated by the March 2026 spike of €53/MWh (Middle East geopolitical crisis + EU gas storage at historical lows of 29%); regulated stayed stable at €18,69.
2. **ERSE forecasts return of clients to the regulated market in 2026**, under DL 57-B/2022.

## Sources

### MIBGAS (free market wholesale prices)
- [MIBGAS official file access portal](https://www.mibgas.es/en/file-access)
- [MIBGAS_Data_2024.xlsx](https://www.mibgas.es/en/file-access/MIBGAS_Data_2024.xlsx?path=AGNO_2024/XLS)
- [MIBGAS_Data_2025.xlsx](https://www.mibgas.es/en/file-access/MIBGAS_Data_2025.xlsx?path=AGNO_2025/XLS)
- [MIBGAS_Data_2026.xlsx](https://www.mibgas.es/en/file-access/MIBGAS_Data_2026.xlsx?path=AGNO_2026/XLS)

### ERSE — Tarifas e Preços de Gás (regulated CURg cost)
- [TEP Gás 2023-2024 (Quadro 2-3)](https://www.erse.pt/media/h2qlqoc0/tarifas-g-2023-2024.pdf)
- [TEP Gás 2024-2025](https://www.erse.pt/media/ez4p0ogu/tep-g%C3%A1s-2024-2025.pdf)
- [TEP Gás 2025-2026 (Quadro 0-13)](https://www.erse.pt/media/ssbndzo1/tep-g%C3%A1s-2025-2026.pdf)
- [ERSE — main page on gas tariffs and prices](https://www.erse.pt/atividade/regulacao/tarifas-e-precos-gas-natural/)

### ERSE — Boletim Commodities (context and validation)
- [Boletim Commodities 4Q 2025 (Figure 1-8: MIBGAS vs CURg)](https://www.erse.pt/media/jfabvzsd/boletim_commodities_4t2025.pdf)
- [Boletim Commodities 3Q 2025](https://www.erse.pt/media/3rtlr0cp/boletim_commodities_3t2025.pdf)
- [Boletim Commodities 2Q 2025](https://www.erse.pt/media/iqiogwtm/boletim_commodities_2t2025_vs_externa.pdf)
- [Boletim Commodities 1Q 2025](https://www.erse.pt/media/uweax1bm/boletim_commodities_1t2025.pdf)

> *Boletim Commodities 1Q 2026 not yet published by ERSE (expected in coming weeks).*

### Drivers of the March 2026 spike (international sources)
- [Argus Media — TTF gas price spike spills into 2027 and beyond](https://www.argusmedia.com/en/news-and-insights/latest-market-news/2803352-ttf-gas-price-spike-spills-into-2027-and-beyond)
- [Kpler — Weather-driven TTF and Henry Hub strength](https://www.kpler.com/blog/weather-driven-ttf-and-henry-hub-strength-contrasts-with-capped-upside-in-asian-lng)
- [American Gas Association — Natural Gas Market Indicators March 19, 2026](https://www.aga.org/research-policy/resource-library/natural-gas-market-indicators-march-19-2026/)
- [IRU — Early pump price movements seen globally](https://www.iru.org/news-resources/newsroom/more-turmoil-early-pump-price-movements-seen-globally)

EU underground gas storage was at 29.0% on 13 March 2026 (-18,5% YoY, -30,4% vs 5-year average). US-Israel-Iran conflict from late February 2026 halted Qatar LNG production (strikes) and disrupted the Strait of Hormuz.

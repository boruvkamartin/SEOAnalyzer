# SEO Analyzer

CLI aplikace v Pythonu pro analýzu SEO atributů všech stránek z sitemapy a export výsledků do Excel s pokročilými validacemi.

## Funkce

### Základní SEO kontroly
- ✅ Extrakce title, meta description, H1 tagů
- ✅ Open Graph tagy (og:title, og:description, og:image, atd.)
- ✅ Twitter Card tagy
- ✅ Canonical URL
- ✅ Robots meta tag
- ✅ Alt texty u obrázků

### Validace SEO atributů
- ✅ Kontrola délky title (50-60 znaků) - varování pokud mimo optimální rozsah
- ✅ Kontrola délky description (150-160 znaků) - varování pokud mimo optimální rozsah
- ✅ Detekce duplicitních title/description napříč všemi stránkami
- ✅ Označení chybějících kritických SEO prvků (title, description, h1)
- ✅ Validace canonical URL (kontrola, zda odkazuje na správnou stránku)
- ✅ Validace alt textů u obrázků (detekce obrázků bez alt textu)

### Pokročilé SEO kontroly
- ✅ Detekce strukturovaných dat (JSON-LD, Microdata, RDFa)
- ✅ Kontrola hreflang tagů pro vícejazyčné weby
- ✅ Kontrola schema.org markup
- ✅ Kontrola HTTPS

### Kontrola odkazů
- ✅ Kontrola broken links - validace všech odkazů na stránce (404, redirecty)
- ✅ Kontrola broken images

### Reporting
- ✅ Barevné označení v Excelu (chyby červeně, varování žlutě, OK zeleně)
- ✅ Přehledová stránka se shrnutím problémů (počet chyb, varování, OK stránek, top problémy)
- ✅ Detailní data s kompletními informacemi o každé stránce

## Instalace

1. Klonujte nebo stáhněte tento repozitář

2. Nainstalujte závislosti:
```bash
pip install -r requirements.txt
```

## Použití

### Základní použití
```bash
python main.py https://www.dmpagency.cz/
```

### S vlastním výstupním souborem
```bash
python main.py https://www.dmpagency.cz/ --output seo_report.xlsx
```

### S vlastními parametry
```bash
python main.py https://www.dmpagency.cz/ --timeout 15 --workers 10 --delay 0.3
```

### Testovací režim (prvních 10 stránek)
```bash
python main.py https://www.dmpagency.cz/ --limit 10
```

### Bez validace broken links (rychlejší)
```bash
python main.py https://www.dmpagency.cz/ --skip-links
```

### Spuštění pomocí BAT souboru (Windows)
Jednoduše dvojklikněte na `run_seo_analyzer.bat` a následujte instrukce v menu.

## Parametry

- `url` (povinný) - URL webu k analýze (např. https://www.dmpagency.cz/)
- `--output`, `-o` - Výstupní Excel soubor (výchozí: seo_report.xlsx)
- `--timeout` - Timeout pro HTTP požadavky v sekundách (výchozí: 10)
- `--workers` - Počet paralelních workerů pro validaci odkazů (výchozí: 5)
- `--delay` - Zpoždění mezi requesty v sekundách (výchozí: 0.5)
- `--skip-links` - Přeskočit validaci broken links (rychlejší analýza)
- `--limit` - Omezit počet analyzovaných stránek (užitečné pro testování, např. `--limit 10`)

## Výstup

Aplikace vytvoří Excel soubor se dvěma listy:

### 1. Přehled
- Celkový počet stránek
- Počet stránek s chybami/varováními/OK
- Průměrné délky title a description
- Počet duplicitních title/description
- Top problémy (nejčastější chyby)

### 2. Detailní data
Kompletní tabulka se všemi SEO atributy pro každou stránku:
- URL
- Title (s délkou a statusem)
- Meta Description (s délkou a statusem)
- H1
- Open Graph tagy
- Twitter Card tagy
- Canonical URL
- Robots meta tag
- Informace o obrázcích (s/bez alt textu)
- Strukturovaná data
- Hreflang tagy
- Schema.org markup
- HTTPS status
- Broken links count
- Chybějící kritické prvky
- Seznam všech problémů
- Celkový status (error/warning/ok)

Řádky jsou barevně označeny:
- 🔴 Červeně: stránky s chybami
- 🟡 Žlutě: stránky s varováními
- 🟢 Zeleně: OK stránky

## Jak to funguje

1. **Nalezení sitemapy**: Aplikace automaticky najde sitemapu webu (zkusí `/sitemap.xml`, `/sitemap_index.xml`, nebo najde v `robots.txt`)

2. **Parsování sitemapy**: Extrahuje všechny URL ze sitemapy (podporuje i sitemap indexy s více sitemapami)

3. **Scrapování SEO atributů**: Pro každou URL stáhne HTML a extrahuje všechny SEO atributy

4. **Validace**: Provede validace (délka title/description, chybějící prvky, canonical, alt texty, atd.)

5. **Validace broken links** (volitelné): Ověří všechny odkazy a obrázky na stránce

6. **Detekce duplicit**: Najde duplicitní title a description napříč všemi stránkami

7. **Export do Excel**: Vytvoří Excel soubor s přehledovou stránkou a detailními daty

## Požadavky

- Python 3.7+
- requests
- beautifulsoup4
- openpyxl
- tqdm
- lxml

## Poznámky

- Aplikace respektuje rate limiting (výchozí zpoždění 0.5s mezi requesty)
- Pro velké weby může analýza trvat delší dobu
- Validace broken links může být časově náročná - použijte `--skip-links` pro rychlejší analýzu
- Aplikace automaticky zpracuje sitemap indexy (více sitemap v jednom)
- **JavaScript weby**: Pokud web načítá obsah pomocí JavaScriptu (React, Vue, atd.), některé prvky jako H1 mohou být v HTML prázdné. Aplikace to detekuje a označí jako problém. Pro kompletní analýzu JavaScript webů by bylo potřeba použít headless browser (Selenium/Playwright).
- **OG Description fallback**: Pokud stránka nemá OG description, aplikace automaticky použije meta description jako náhradní hodnotu

## Ochrana proti nechtěnému DDoS útoku

Aplikace obsahuje několik ochranných mechanismů, aby zabránila nechtěnému přetížení serveru:

- ✅ **Rate limiting**: Zpoždění mezi requesty (výchozí 0.5s)
- ✅ **Batch processing**: Link validace probíhá v batchích s rate limitingem
- ✅ **Exponential backoff**: Při chybách se zvyšuje zpoždění mezi opakovanými pokusy
- ✅ **Omezení paralelních requestů**: Maximální počet paralelních workerů (výchozí 5)
- ✅ **Cache**: Již ověřené URL se neověřují znovu
- ✅ **Varování při velkém počtu URL**: Aplikace varuje při více než 1000 URL

**Doporučení pro velké weby:**
- Použijte `--limit` pro testování na menším vzorku
- Použijte `--skip-links` pro rychlejší analýzu bez validace odkazů
- Zvažte zvýšení `--delay` na 1.0 nebo více pro velmi citlivé servery
- Sledujte výkon serveru během analýzy

## Licence

Tento projekt je poskytován "tak jak je" bez záruky.

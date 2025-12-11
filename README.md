# SEO Analyzer - Webová aplikace

Webová aplikace pro analýzu SEO atributů všech stránek z sitemapy. Postaveno s Eleventy, TypeScript, Tailwind CSS a nasazeno na Netlify.

## 🚀 Funkce

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
- ✅ **Validace strukturovaných dat** - kontrola platnosti JSON-LD
- ✅ Kontrola hreflang tagů pro vícejazyčné weby
- ✅ Kontrola schema.org markup
- ✅ Kontrola HTTPS

### Rozšířené SEO metriky
- ✅ **Velikost stránky** - kontrola velikosti HTML (varování při > 3MB)
- ✅ **Externí a interní odkazy** - počítání odkazů
- ✅ **Mobile-friendly kontrola** - kontrola viewport meta tagu
- ✅ **Favicon kontrola** - detekce chybějícího faviconu
- ✅ **Redirect typy** - detekce 301 vs 302 redirectů

### Pokročilé kontroly
- ✅ **Sitemap validace** - kontrola validity a struktury sitemapy
- ✅ **robots.txt kontrola** - kontrola existence a obsahu robots.txt
- ✅ Kontrola broken links - validace všech odkazů na stránce (404, redirecty)
- ✅ Kontrola broken images

### UI vylepšení
- ✅ **Real-time progress updates** - zobrazení průběhu analýzy
- ✅ **Filtrování výsledků** - podle statusu, vyhledávání v URL/title
- ✅ **Řazení výsledků** - podle statusu, URL, počtu problémů, title
- ✅ **Detailní zobrazení stránky** - modal s kompletními informacemi
- ✅ **Dashboard a statistiky** - přehledné metriky a top problémy
- ✅ Zobrazení pouze problémových stránek (OK stránky skryté)
- ✅ Barevné označení (chyby červeně, varování žlutě, OK zeleně)
- ✅ Export do Excelu s přehledovou a detailní stránkou

## 📦 Instalace

1. Klonujte nebo stáhněte tento repozitář

2. Nainstalujte závislosti:
```bash
npm install
```

3. **DŮLEŽITÉ**: Pro vývoj použijte Netlify dev server (spustí jak frontend, tak backend funkce):
```bash
npm run dev
```

Aplikace bude dostupná na `http://localhost:8888` (nebo jiný port, který Netlify zobrazí)

**POZOR**: Pokud spustíte jen `eleventy --serve`, Netlify Functions nebudou dostupné a API volání selžou!

## 🏗️ Build

Pro produkční build:
```bash
npm run build
```

## 🌐 Nasazení na Netlify

1. Připojte svůj GitHub/GitLab/Bitbucket repozitář k Netlify

2. Nastavte build settings:
   - Build command: `npm run build`
   - Publish directory: `_site`

3. Netlify automaticky detekuje `netlify.toml` a nasadí aplikaci

Nebo použijte Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

## 💻 Použití

1. Otevřete webovou aplikaci
2. Zadejte URL webu k analýze (např. `https://www.example.com`)
3. Volitelně nastavte parametry:
   - **Timeout**: Timeout pro HTTP požadavky (výchozí: 10s)
   - **Delay**: Zpoždění mezi requesty (výchozí: 0.5s)
   - **Limit**: Omezit počet analyzovaných stránek (volitelné)
   - **Přeskočit validaci broken links**: Pro rychlejší analýzu
4. Klikněte na "Spustit analýzu"
5. Po dokončení analýzy můžete výsledky exportovat do Excelu

## 📊 Výstup

### Webové rozhraní
- **Přehled**: Shrnutí s počtem chyb, varování a OK stránek
- **Tabulka**: Detailní seznam všech stránek s jejich SEO atributy a problémy
- **Barevné označení**:
  - 🔴 Červeně: stránky s chybami
  - 🟡 Žlutě: stránky s varováními
  - 🟢 Zeleně: OK stránky

### Excel export
Excel soubor obsahuje dva listy:

1. **Přehled**
   - Celkový počet stránek
   - Počet stránek s chybami/varováními/OK
   - Průměrné délky title a description
   - Počet duplicitních title/description

2. **Detailní data**
   - Kompletní tabulka se všemi SEO atributy pro každou stránku
   - **Nové sloupce**: Velikost stránky, externí/interní odkazy, mobile-friendly, viewport, favicon, redirect typ
   - Barevné označení řádků podle statusu

## 🛠️ Technologie

- **Eleventy (11ty)**: Statický site generator
- **TypeScript**: Typovaný JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Netlify Functions**: Serverless funkce pro backend
- **Cheerio**: HTML parsing (jako BeautifulSoup v Pythonu)
- **ExcelJS**: Generování Excel souborů
- **node-fetch**: HTTP klient
- **xml2js**: Parsování XML sitemap

## 📝 Jak to funguje

1. **Frontend**: Eleventy generuje statické HTML stránky s Tailwind CSS
2. **Formulář**: Uživatel zadá URL a parametry analýzy
3. **Backend API**: Netlify Function `/api/analyze` provede:
   - Nalezení sitemapy
   - Parsování všech URL ze sitemapy
   - Scrapování SEO atributů každé stránky
   - Validaci broken links (volitelné)
   - Detekci duplicit
4. **Zobrazení výsledků**: Frontend zobrazí výsledky v tabulce
5. **Export**: Netlify Function `/api/export` vygeneruje Excel soubor

## ⚠️ Omezení

- **Netlify Functions timeout**: 
  - **Free tier**: Maximálně 10 sekund pro synchronní funkce
  - **Pro tier**: Maximálně 26 sekund pro synchronní funkce
  - **Lokální vývoj**: 30 sekund (výchozí)
  - Pro dlouhé analýzy použijte **limit stránek** nebo **přeskočte validaci broken links**
  - Pro velmi velké weby zvažte rozdělení analýzy na více kroků
- **Velké weby**: Pro weby s více než 100 stránkami doporučujeme použít limit nebo přeskočit validaci broken links
- **JavaScript weby**: Pokud web načítá obsah pomocí JavaScriptu (React, Vue, atd.), některé prvky jako H1 mohou být v HTML prázdné. Pro kompletní analýzu JavaScript webů by bylo potřeba použít headless browser.

## 🔒 Ochrana proti nechtěnému DDoS útoku

Aplikace obsahuje několik ochranných mechanismů:
- ✅ **Rate limiting**: Zpoždění mezi requesty (výchozí 0.5s)
- ✅ **Batch processing**: Link validace probíhá v batchích
- ✅ **Omezení paralelních requestů**: Maximální počet paralelních workerů (výchozí 5)
- ✅ **Cache**: Již ověřené URL se neověřují znovu
- ✅ **Varování při velkém počtu URL**: Aplikace varuje při více než 1000 URL

## 🐛 Troubleshooting

### Chyba: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

Tato chyba znamená, že API endpoint vrací HTML místo JSON. To se stane, když:
- Netlify Functions nejsou zkompilované - spusťte `npm run build:functions`
- Používáte jen Eleventy dev server místo `netlify dev` - použijte `npm run dev` (který spustí `netlify dev`)

**Řešení**: Vždy používejte `npm run dev` pro vývoj, který automaticky zkompiluje funkce a spustí Netlify dev server.

### Funkce se nespouštějí

- Zkontrolujte, že TypeScript soubory jsou zkompilované do JavaScriptu (`netlify/functions/**/*.js` existují)
- Ověřte, že `netlify.toml` má správně nastavenou `functions` directory
- Zkontrolujte Netlify logs v terminálu nebo dashboardu

### CSS se nenačítá

- Ověřte, že Tailwind CSS je zkompilován (`src/css/styles.css` nebo `_site/css/styles.css` existuje)
- Zkontrolujte, že Eleventy kopíruje CSS soubor (`addPassthroughCopy` v `.eleventy.js`)

## 📄 Licence

Tento projekt je poskytován "tak jak je" bez záruky.

# Instrukce pro nasazení

## Lokální vývoj

1. Nainstalujte závislosti:
```bash
npm install
```

2. Spusťte vývojový server:
```bash
npm run dev
```

Tím se spustí:
- Eleventy dev server na `http://localhost:8080`
- Tailwind CSS watch mode pro automatickou kompilaci CSS

## Build pro produkci

```bash
npm run build
```

Tím se:
1. Zkompiluje Tailwind CSS do `src/css/styles.css`
2. Vygeneruje statické stránky pomocí Eleventy do `_site/`
3. Zkompiluje TypeScript funkce do JavaScriptu

## Nasazení na Netlify

### Automatické nasazení (doporučeno)

1. Připojte repozitář k Netlify:
   - Přihlaste se na [Netlify](https://www.netlify.com/)
   - Klikněte na "New site from Git"
   - Vyberte svůj repozitář
   - Netlify automaticky detekuje nastavení z `netlify.toml`

2. Build settings (měly by být automaticky nastavené):
   - Build command: `npm run build`
   - Publish directory: `_site`
   - Functions directory: `netlify/functions`

### Manuální nasazení pomocí CLI

1. Nainstalujte Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Přihlaste se:
```bash
netlify login
```

3. Inicializujte projekt:
```bash
netlify init
```

4. Nasazení:
```bash
netlify deploy --prod
```

## Struktura projektu

```
.
├── src/                    # Eleventy source files
│   ├── _layouts/          # Layout templates
│   ├── css/               # CSS files (Tailwind input)
│   ├── js/                # JavaScript files
│   └── index.html         # Main page
├── netlify/
│   └── functions/         # Netlify Functions
│       ├── analyze/       # Analyze function
│       ├── export/        # Export function
│       └── utils/         # Shared utilities
├── _site/                 # Generated static site (gitignored)
├── .eleventy.js          # Eleventy config
├── tailwind.config.js    # Tailwind config
├── netlify.toml          # Netlify config
└── package.json          # Dependencies
```

## API Endpoints

Po nasazení budou dostupné následující API endpointy:

- `POST /api/analyze` - Spustí SEO analýzu
- `POST /api/export` - Exportuje výsledky do Excelu

## Troubleshooting

### Funkce se nespouštějí

- Zkontrolujte, že TypeScript soubory jsou zkompilované do JavaScriptu
- Ověřte, že `netlify.toml` má správně nastavenou `functions` directory
- Zkontrolujte Netlify logs v dashboardu

### CSS se nenačítá

- Ověřte, že Tailwind CSS je zkompilován (`src/css/styles.css` existuje)
- Zkontrolujte, že Eleventy kopíruje CSS soubor (`addPassthroughCopy` v `.eleventy.js`)

### Build selhává

- Zkontrolujte Node.js verzi (vyžaduje Node 20+)
- Ověřte, že všechny závislosti jsou nainstalované
- Zkontrolujte Netlify build logs


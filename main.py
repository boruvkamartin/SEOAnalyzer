"""
SEO Analyzer - Hlavní entry point pro CLI aplikaci
"""
import argparse
import sys
from collections import Counter
from typing import List, Dict, Tuple
from tqdm import tqdm

from sitemap_parser import SitemapParser
from seo_scraper import SEOScraper
from link_validator import LinkValidator
from excel_exporter import ExcelExporter



def detect_duplicates(results: List[Dict]) -> Tuple[List[str], List[str]]:
    """
    Detekuje duplicitní title a description napříč všemi stránkami
    
    Args:
        results: Seznam výsledků analýzy
        
    Returns:
        Tuple (duplicitní title, duplicitní description)
    """
    titles = []
    descriptions = []
    
    for result in results:
        title = result.get('title')
        description = result.get('meta_description')
        
        if title:
            titles.append(title)
        if description:
            descriptions.append(description)
    
    # Najít duplicity
    title_counter = Counter(titles)
    description_counter = Counter(descriptions)
    
    duplicate_titles = [title for title, count in title_counter.items() if count > 1]
    duplicate_descriptions = [desc for desc, count in description_counter.items() if count > 1]
    
    return duplicate_titles, duplicate_descriptions


def add_duplicate_warnings(results: List[Dict], duplicate_titles: List[str], duplicate_descriptions: List[str]):
    """
    Přidá varování o duplicitách do výsledků
    
    Args:
        results: Seznam výsledků analýzy
        duplicate_titles: Seznam duplicitních title
        duplicate_descriptions: Seznam duplicitních description
    """
    for result in results:
        title = result.get('title')
        description = result.get('meta_description')
        
        if title in duplicate_titles:
            result['issues'].append(f'Duplicitní title: "{title}"')
            if result['status'] == 'ok':
                result['status'] = 'warning'
        
        if description in duplicate_descriptions:
            result['issues'].append(f'Duplicitní description: "{description}"')
            if result['status'] == 'ok':
                result['status'] = 'warning'


def main():
    """Hlavní funkce aplikace"""
    parser = argparse.ArgumentParser(
        description='SEO Analyzer - Analýza SEO atributů všech stránek z sitemapy',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=""
Příklady použití:
  python main.py https://www.dmpagency.cz/
  python main.py https://www.dmpagency.cz/ --output seo_report.xlsx
  python main.py https://www.dmpagency.cz/ --timeout 15 --workers 10
        """
    )
    
    parser.add_argument(
        'url',
        help='URL webu k analýze (např. https://www.dmpagency.cz/)'
    )
    
    parser.add_argument(
        '--output', '-o',
        default='seo_report.xlsx',
        help='Výstupní Excel soubor (výchozí: seo_report.xlsx)'
    )
    
    parser.add_argument(
        '--timeout',
        type=int,
        default=10,
        help='Timeout pro HTTP požadavky v sekundách (výchozí: 10)'
    )
    
    parser.add_argument(
        '--workers',
        type=int,
        default=5,
        help='Počet paralelních workerů pro validaci odkazů (výchozí: 5)'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=0.5,
        help='Zpoždění mezi requesty v sekundách (výchozí: 0.5)'
    )
    
    parser.add_argument(
        '--skip-links',
        action='store_true',
        help='Přeskočit validaci broken links (rychlejší analýza)'
    )
    
    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help='Omezit počet analyzovaných stránek (užitečné pro testování, např. --limit 10)'
    )
    
    args = parser.parse_args()
    
    # Validace URL
    url = args.url.rstrip('/')
    if not url.startswith(('http://', 'https://')):
        print(f"Chyba: URL musí začínat http:// nebo https://")
        sys.exit(1)
    
    print("=" * 60)
    print("SEO Analyzer")
    print("=" * 60)
    print(f"Analyzovaný web: {url}")
    print(f"Výstupní soubor: {args.output}")
    print(f"Timeout: {args.timeout}s")
    print(f"Workers: {args.workers}")
    print(f"Delay: {args.delay}s")
    if args.limit:
        print(f"Limit: {args.limit} stránek (testovací režim)")
    print("=" * 60)
    print()
    
    try:
        # 1. Nalezení a parsování sitemapy
        print("Krok 1/4: Hledání sitemapy...")
        sitemap_parser = SitemapParser(url, timeout=args.timeout)
        urls = sitemap_parser.get_all_urls()
        
        if not urls:
            print("Chyba: V sitemapě nebyly nalezeny žádné URL")
            sys.exit(1)
        
        # Aplikovat limit, pokud je nastaven
        if args.limit and args.limit > 0:
            urls = urls[:args.limit]
            print(f"⚠️  Omezeno na prvních {len(urls)} stránek (testovací režim)\n")
        
        print(f"Nalezeno {len(urls)} URL k analýze\n")
        
        # Varování při velkém počtu URL
        if len(urls) > 1000:
            print(f"⚠️  VAROVÁNÍ: Nalezeno {len(urls)} URL. Analýza může trvat dlouho a vytvořit velké zatížení serveru.")
            print(f"   Zvažte použití --limit pro testování nebo --skip-links pro rychlejší analýzu.\n")
        
        # 2. Scrapování SEO atributů
        print("Krok 2/4: Scrapování SEO atributů...")
        seo_scraper = SEOScraper(timeout=args.timeout, delay=args.delay)
        results = []
        
        for url_item in tqdm(urls, desc="Analýza stránek", unit="stránka"):
            result = seo_scraper.scrape_url(url_item)
            results.append(result)
        
        print(f"Analyzováno {len(results)} stránek\n")
        
        # 3. Validace broken links (volitelné)
        if not args.skip_links:
            print("Krok 3/4: Validace broken links...")
            # Použít menší delay pro link validaci (0.1s místo 0.5s, protože validujeme více URL)
            link_delay = min(args.delay, 0.1)  # Maximálně 0.1s mezi batchi
            link_validator = LinkValidator(timeout=args.timeout, max_workers=args.workers, delay=link_delay)
            
            for result in tqdm(results, desc="Validace odkazů", unit="stránka"):
                if result.get('error'):
                    continue
                
                # Potřebujeme HTML obsah pro validaci odkazů
                # Znovu stáhneme stránku (nebo můžeme použít cache)
                soup, response = seo_scraper.fetch_page(result['url'])
                if soup:
                    html_content = str(soup)
                    link_validation = link_validator.validate_page_links(html_content, result['url'])
                    
                    result['broken_links_count'] = link_validation['total_broken']
                    result['broken_links_detail'] = {
                        'broken_links': link_validation['broken_links'],
                        'broken_images': link_validation['broken_images']
                    }
                    
                    if link_validation['total_broken'] > 0:
                        result['issues'].append(f"{link_validation['total_broken']} broken links/obrázků")
                        if result['status'] == 'ok':
                            result['status'] = 'warning'
                        if link_validation['total_broken'] > 5:
                            result['status'] = 'error'
        else:
            print("Krok 3/4: Validace broken links přeskočena\n")
            for result in results:
                result['broken_links_count'] = 0
        
        # 4. Detekce duplicit
        print("Krok 4/4: Detekce duplicit...")
        duplicate_titles, duplicate_descriptions = detect_duplicates(results)
        add_duplicate_warnings(results, duplicate_titles, duplicate_descriptions)
        
        if duplicate_titles:
            print(f"Nalezeno {len(duplicate_titles)} duplicitních title")
        if duplicate_descriptions:
            print(f"Nalezeno {len(duplicate_descriptions)} duplicitních description")
        print()
        
        # 5. Export do Excel
        print("Exportování výsledků do Excel...")
        exporter = ExcelExporter()
        exporter.export(results, duplicate_titles, duplicate_descriptions, args.output)
        
        # Shrnutí
        error_count = len([r for r in results if r.get('status') == 'error'])
        warning_count = len([r for r in results if r.get('status') == 'warning'])
        ok_count = len([r for r in results if r.get('status') == 'ok'])
        
        print("\n" + "=" * 60)
        print("Shrnutí analýzy:")
        print("=" * 60)
        print(f"Celkem stránek: {len(results)}")
        print(f"Stránky s chybami: {error_count}")
        print(f"Stránky s varováními: {warning_count}")
        print(f"OK stránky: {ok_count}")
        print("=" * 60)
        
    except KeyboardInterrupt:
        print("\n\nAnalýza byla přerušena uživatelem.")
        sys.exit(1)
    except Exception as e:
        print(f"\nChyba: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()

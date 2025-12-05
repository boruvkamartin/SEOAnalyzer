"""
Sitemap Parser - nalezení a parsování sitemapy z webu
"""
import requests
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse
from typing import List, Set
import time


class SitemapParser:
    """Parser pro nalezení a extrakci URL ze sitemapy"""
    
    def __init__(self, base_url: str, timeout: int = 10):
        """
        Inicializace parseru
        
        Args:
            base_url: Základní URL webu
            timeout: Timeout pro HTTP požadavky
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'SEO Analyzer Bot 1.0'
        })
    
    def find_sitemap(self) -> str:
        """
        Najde sitemapu webu
        
        Zkusí:
        1. /sitemap.xml
        2. /sitemap_index.xml
        3. robots.txt (hledá Sitemap: directive)
        
        Returns:
            URL sitemapy nebo None pokud není nalezena
        """
        # Zkusit standardní cesty
        sitemap_paths = [
            '/sitemap.xml',
            '/sitemap_index.xml',
            '/sitemap1.xml'
        ]
        
        for path in sitemap_paths:
            url = urljoin(self.base_url, path)
            try:
                response = self.session.head(url, timeout=self.timeout, allow_redirects=True)
                if response.status_code == 200:
                    # Ověřit, že je to XML
                    content_type = response.headers.get('Content-Type', '').lower()
                    if 'xml' in content_type:
                        return response.url
            except requests.RequestException:
                continue
        
        # Zkusit najít v robots.txt
        robots_url = urljoin(self.base_url, '/robots.txt')
        try:
            response = self.session.get(robots_url, timeout=self.timeout)
            if response.status_code == 200:
                for line in response.text.split('\n'):
                    line = line.strip()
                    if line.lower().startswith('sitemap:'):
                        sitemap_url = line.split(':', 1)[1].strip()
                        # Ověřit, že sitemapa existuje
                        try:
                            test_response = self.session.head(sitemap_url, timeout=self.timeout)
                            if test_response.status_code == 200:
                                return sitemap_url
                        except requests.RequestException:
                            continue
        except requests.RequestException:
            pass
        
        return None
    
    def parse_sitemap(self, sitemap_url: str) -> Set[str]:
        """
        Parsuje sitemapu a extrahuje všechny URL
        
        Podporuje:
        - Obyčejné sitemapy
        - Sitemap indexy (více sitemap v jednom)
        
        Args:
            sitemap_url: URL sitemapy
            
        Returns:
            Set všech URL nalezených v sitemapě
        """
        all_urls = set()
        visited_sitemaps = set()
        
        def parse_sitemap_recursive(url: str):
            """Rekurzivní parsování sitemapy (pro sitemap indexy)"""
            if url in visited_sitemaps:
                return
            visited_sitemaps.add(url)
            
            try:
                response = self.session.get(url, timeout=self.timeout)
                response.raise_for_status()
                
                # Parsovat XML
                root = ET.fromstring(response.content)
                
                # Namespace pro sitemap XML
                namespace = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
                
                # Zkontrolovat, zda je to sitemap index
                sitemapindex = root.find('sitemap:sitemapindex', namespace)
                if sitemapindex is not None:
                    # Je to sitemap index - rekurzivně parsovat všechny sitemapy
                    for sitemap_elem in root.findall('sitemap:sitemap', namespace):
                        loc_elem = sitemap_elem.find('sitemap:loc', namespace)
                        if loc_elem is not None and loc_elem.text:
                            sitemap_url = loc_elem.text.strip()
                            parse_sitemap_recursive(sitemap_url)
                            time.sleep(0.5)  # Rate limiting
                else:
                    # Obyčejná sitemapa - extrahovat URL
                    for url_elem in root.findall('sitemap:url', namespace):
                        loc_elem = url_elem.find('sitemap:loc', namespace)
                        if loc_elem is not None and loc_elem.text:
                            url = loc_elem.text.strip()
                            all_urls.add(url)
                            
            except requests.RequestException as e:
                print(f"Chyba při načítání sitemapy {url}: {e}")
            except ET.ParseError as e:
                print(f"Chyba při parsování XML sitemapy {url}: {e}")
            except Exception as e:
                print(f"Neočekávaná chyba při parsování sitemapy {url}: {e}")
        
        parse_sitemap_recursive(sitemap_url)
        return all_urls
    
    def get_all_urls(self) -> List[str]:
        """
        Hlavní metoda pro získání všech URL ze sitemapy
        
        Returns:
            Seznam všech URL nalezených v sitemapě
        """
        sitemap_url = self.find_sitemap()
        if not sitemap_url:
            raise ValueError(f"Nepodařilo se najít sitemapu pro {self.base_url}")
        
        print(f"Nalezena sitemapa: {sitemap_url}")
        urls = self.parse_sitemap(sitemap_url)
        print(f"Nalezeno {len(urls)} URL v sitemapě")
        
        return sorted(list(urls))

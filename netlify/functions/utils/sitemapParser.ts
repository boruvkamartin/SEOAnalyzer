import fetch from 'node-fetch';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

export interface SitemapParserOptions {
  timeout?: number;
}

export class SitemapParser {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, options: SitemapParserOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = options.timeout || 10000;
  }

  private async fetchUrl(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SEO Analyzer Bot 1.0'
      },
      timeout: this.timeout
    } as any);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  }

  async findSitemap(): Promise<string | null> {
    const sitemapPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap1.xml'
    ];

    // Try standard paths
    for (const path of sitemapPaths) {
      try {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'SEO Analyzer Bot 1.0'
          },
          timeout: this.timeout
        } as any);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.toLowerCase().includes('xml')) {
            return url;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Try robots.txt
    try {
      const robotsUrl = `${this.baseUrl}/robots.txt`;
      const robotsText = await this.fetchUrl(robotsUrl);
      
      for (const line of robotsText.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith('sitemap:')) {
          const sitemapUrl = trimmed.split(':', 2)[1].trim();
          // Verify it exists
          try {
            const testResponse = await fetch(sitemapUrl, {
              method: 'HEAD',
              headers: {
                'User-Agent': 'SEO Analyzer Bot 1.0'
              },
              timeout: this.timeout
            } as any);
            
            if (testResponse.ok) {
              return sitemapUrl;
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (e) {
      // robots.txt not found or error
    }

    return null;
  }

  private async parseSitemapRecursive(
    sitemapUrl: string,
    allUrls: Set<string>,
    visitedSitemaps: Set<string>
  ): Promise<void> {
    if (visitedSitemaps.has(sitemapUrl)) {
      return;
    }
    visitedSitemaps.add(sitemapUrl);

    try {
      const xmlText = await this.fetchUrl(sitemapUrl);
      const parsed = await parseXML(xmlText) as any;

      // Check if it's a sitemap index
      if (parsed.sitemapindex) {
        const sitemaps = parsed.sitemapindex.sitemap || [];
        for (const sitemap of sitemaps) {
          if (sitemap.loc && sitemap.loc[0]) {
            const nestedUrl = sitemap.loc[0].trim();
            await this.parseSitemapRecursive(nestedUrl, allUrls, visitedSitemaps);
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
          }
        }
      } else if (parsed.urlset) {
        // Regular sitemap
        const urls = parsed.urlset.url || [];
        for (const url of urls) {
          if (url.loc && url.loc[0]) {
            allUrls.add(url.loc[0].trim());
          }
        }
      }
    } catch (error) {
      console.error(`Error parsing sitemap ${sitemapUrl}:`, error);
    }
  }

  async getAllUrls(): Promise<string[]> {
    const sitemapUrl = await this.findSitemap();
    if (!sitemapUrl) {
      throw new Error(`Nepodařilo se najít sitemapu pro ${this.baseUrl}`);
    }

    const allUrls = new Set<string>();
    const visitedSitemaps = new Set<string>();

    await this.parseSitemapRecursive(sitemapUrl, allUrls, visitedSitemaps);

    return Array.from(allUrls).sort();
  }
}


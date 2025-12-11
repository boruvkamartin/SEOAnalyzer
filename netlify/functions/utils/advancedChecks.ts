import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

export interface AdvancedChecksResult {
  sitemap_valid?: boolean;
  sitemap_issues?: string[];
  robots_txt_exists?: boolean;
  robots_txt_content?: string;
  robots_txt_issues?: string[];
  has_404_pages?: boolean;
  redirect_chain?: Array<{ url: string; status: number }>;
}

export class AdvancedChecks {
  private timeout: number;

  constructor(timeout: number = 10000) {
    this.timeout = timeout;
  }

  async checkSitemap(baseUrl: string): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    let valid = true;

    try {
      // Try to find sitemap
      const sitemapPaths = ['/sitemap.xml', '/sitemap_index.xml'];
      let sitemapUrl: string | null = null;

      for (const path of sitemapPaths) {
        try {
          const url = `${baseUrl}${path}`;
          const response = await fetch(url, {
            method: 'HEAD',
            headers: { 'User-Agent': 'SEO Analyzer Bot 1.0' },
            timeout: this.timeout
          } as any);
          
          if (response.ok) {
            sitemapUrl = url;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!sitemapUrl) {
        issues.push('Sitemapa nebyla nalezena na standardních cestách');
        return { valid: false, issues };
      }

      // Validate sitemap XML
      try {
        const response = await fetch(sitemapUrl, {
          headers: { 'User-Agent': 'SEO Analyzer Bot 1.0' },
          timeout: this.timeout
        } as any);
        
        const xmlText = await response.text();
        const parsed = await parseXML(xmlText) as any;

        // Check if it's valid sitemap
        if (!parsed.urlset && !parsed.sitemapindex) {
          issues.push('Sitemapa neobsahuje validní XML strukturu');
          valid = false;
        }

        // Check for common issues
        if (parsed.urlset) {
          const urls = parsed.urlset.url || [];
          if (urls.length === 0) {
            issues.push('Sitemapa je prázdná');
            valid = false;
          }
          
          // Check for lastmod dates
          let hasLastmod = false;
          urls.forEach((url: any) => {
            if (url.lastmod && url.lastmod[0]) {
              hasLastmod = true;
            }
          });
          
          if (!hasLastmod) {
            issues.push('Sitemapa neobsahuje lastmod daty (doporučeno pro SEO)');
          }
        }

      } catch (e) {
        issues.push(`Chyba při parsování sitemapy: ${e}`);
        valid = false;
      }

    } catch (error) {
      issues.push(`Chyba při kontrole sitemapy: ${error}`);
      valid = false;
    }

    return { valid, issues };
  }

  async checkRobotsTxt(baseUrl: string): Promise<{ exists: boolean; content?: string; issues: string[] }> {
    const issues: string[] = [];

    try {
      const robotsUrl = `${baseUrl}/robots.txt`;
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': 'SEO Analyzer Bot 1.0' },
        timeout: this.timeout
      } as any);

      if (!response.ok) {
        issues.push('robots.txt neexistuje nebo není dostupný');
        return { exists: false, issues };
      }

      const content = await response.text();

      // Check for common issues
      if (!content.includes('User-agent')) {
        issues.push('robots.txt neobsahuje User-agent direktivy');
      }

      if (!content.includes('Sitemap:')) {
        issues.push('robots.txt neobsahuje Sitemap direktivu');
      }

      // Check for disallow all
      if (content.includes('Disallow: /') && !content.includes('Allow:')) {
        issues.push('VAROVÁNÍ: robots.txt blokuje všechny crawly (Disallow: /)');
      }

      return { exists: true, content, issues };
    } catch (error) {
      issues.push(`Chyba při kontrole robots.txt: ${error}`);
      return { exists: false, issues };
    }
  }

  async checkRedirectChain(url: string, maxRedirects: number = 5): Promise<Array<{ url: string; status: number }>> {
    const chain: Array<{ url: string; status: number }> = [];
    let currentUrl = url;
    let redirects = 0;

    while (redirects < maxRedirects) {
      try {
        const response = await fetch(currentUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'SEO Analyzer Bot 1.0' },
          timeout: this.timeout,
          redirect: 'manual'
        } as any);

        chain.push({ url: currentUrl, status: response.status });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            currentUrl = new URL(location, currentUrl).href;
            redirects++;
          } else {
            break;
          }
        } else {
          break;
        }
      } catch (error) {
        break;
      }
    }

    return chain;
  }
}


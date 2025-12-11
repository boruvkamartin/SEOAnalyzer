import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface SEOScraperOptions {
  timeout?: number;
  delay?: number;
}

import { ContentMetrics } from './contentAnalyzer';
import { PerformanceMetrics } from './performanceAnalyzer';
import { SEOScoreResult } from './seoScore';

export interface SEOResult {
  url: string;
  title?: string;
  meta_description?: string;
  h1?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_card?: string;
  twitter_title?: string;
  twitter_description?: string;
  canonical?: string;
  robots?: string;
  hreflang?: Array<{ lang: string; url: string }>;
  structured_data?: Array<{ type: string; data: any; valid?: boolean; errors?: string[] }>;
  images_without_alt?: number;
  images_total?: number;
  https?: boolean;
  status: 'ok' | 'warning' | 'error';
  issues: string[];
  error?: string;
  broken_links_count?: number;
  // Extended metrics
  page_size?: number; // in bytes
  external_links_count?: number;
  internal_links_count?: number;
  mobile_friendly?: boolean;
  viewport?: string;
  favicon?: string;
  redirect_type?: number; // 301, 302, etc.
  // New metrics
  content_metrics?: ContentMetrics;
  performance_metrics?: PerformanceMetrics;
  seo_score?: SEOScoreResult;
}

export class SEOScraper {
  private timeout: number;
  private delay: number;

  constructor(options: SEOScraperOptions = {}) {
    this.timeout = options.timeout || 10000;
    this.delay = options.delay || 500;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchPage(url: string): Promise<{ $: cheerio.CheerioAPI; html: string; size: number; redirectType?: number; response?: Response } | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SEO Analyzer Bot 1.0'
        },
        timeout: this.timeout,
        redirect: 'manual'
      } as any);

      // Handle redirects
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          // Follow redirect once
          const redirectResponse = await fetch(location, {
            headers: {
              'User-Agent': 'SEO Analyzer Bot 1.0'
            },
            timeout: this.timeout
          } as any);
          
          if (redirectResponse.ok) {
            const html = await redirectResponse.text();
            const $ = cheerio.load(html);
            return { $, html, size: html.length, redirectType: response.status };
          }
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      return { $, html, size: html.length };
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      return null;
    }
  }

  async scrapeUrl(url: string): Promise<SEOResult> {
    await this.sleep(this.delay);

    const result: SEOResult = {
      url,
      status: 'ok',
      issues: []
    };

    const page = await this.fetchPage(url);
    if (!page) {
      result.status = 'error';
      result.error = 'Nepodařilo se načíst stránku';
      result.issues.push('Nepodařilo se načíst stránku');
      return result;
    }

    const { $, html, size, redirectType } = page;
    
    // Page size
    result.page_size = size;
    if (size > 3 * 1024 * 1024) { // > 3MB
      result.issues.push(`Stránka je příliš velká (${(size / 1024 / 1024).toFixed(2)} MB, doporučeno < 3MB)`);
      if (result.status === 'ok') result.status = 'warning';
    }
    
    // Redirect type
    if (redirectType) {
      result.redirect_type = redirectType;
      if (redirectType === 302) {
        result.issues.push('Používá se dočasný redirect (302), doporučeno 301');
        if (result.status === 'ok') result.status = 'warning';
      }
    }

    // Basic SEO elements
    result.title = $('title').first().text().trim() || undefined;
    result.meta_description = $('meta[name="description"]').attr('content')?.trim() || undefined;
    result.h1 = $('h1').first().text().trim() || undefined;

    // Open Graph
    result.og_title = $('meta[property="og:title"]').attr('content')?.trim() || undefined;
    result.og_description = $('meta[property="og:description"]').attr('content')?.trim() || 
                           result.meta_description; // Fallback to meta description
    result.og_image = $('meta[property="og:image"]').attr('content')?.trim() || undefined;

    // Twitter Card
    result.twitter_card = $('meta[name="twitter:card"]').attr('content')?.trim() || undefined;
    result.twitter_title = $('meta[name="twitter:title"]').attr('content')?.trim() || undefined;
    result.twitter_description = $('meta[name="twitter:description"]').attr('content')?.trim() || undefined;

    // Canonical
    result.canonical = $('link[rel="canonical"]').attr('href')?.trim() || undefined;

    // Robots
    result.robots = $('meta[name="robots"]').attr('content')?.trim() || undefined;

    // Hreflang
    const hreflang: Array<{ lang: string; url: string }> = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      const lang = $(el).attr('hreflang');
      const href = $(el).attr('href');
      if (lang && href) {
        hreflang.push({ lang, url: href });
      }
    });
    if (hreflang.length > 0) {
      result.hreflang = hreflang;
    }

    // Structured data with validation
    const structuredData: Array<{ type: string; data: any; valid?: boolean; errors?: string[] }> = [];
    
    // JSON-LD with validation
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonText = $(el).html();
        if (jsonText) {
          const data = JSON.parse(jsonText);
          const errors: string[] = [];
          let valid = true;
          
          // Basic validation
          if (Array.isArray(data)) {
            data.forEach((item, idx) => {
              if (!item['@type'] && !item['@context']) {
                errors.push(`Položka ${idx + 1}: chybí @type nebo @context`);
                valid = false;
              }
            });
          } else {
            if (!data['@type'] && !data['@context']) {
              errors.push('Chybí @type nebo @context');
              valid = false;
            }
          }
          
          structuredData.push({ 
            type: 'JSON-LD', 
            data,
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
          });
          
          if (!valid) {
            result.issues.push(`Neplatné strukturované data (JSON-LD): ${errors.join(', ')}`);
            if (result.status === 'ok') result.status = 'warning';
          }
        }
      } catch (e) {
        structuredData.push({ 
          type: 'JSON-LD', 
          data: {},
          valid: false,
          errors: ['Neplatný JSON']
        });
        result.issues.push('Neplatné JSON-LD strukturované data');
        if (result.status === 'ok') result.status = 'warning';
      }
    });

    // Microdata (simplified check)
    if ($('[itemscope]').length > 0) {
      structuredData.push({ type: 'Microdata', data: {} });
    }

    // RDFa (simplified check)
    if ($('[typeof]').length > 0) {
      structuredData.push({ type: 'RDFa', data: {} });
    }

    if (structuredData.length > 0) {
      result.structured_data = structuredData;
    }

    // Images
    const images = $('img');
    result.images_total = images.length;
    let imagesWithoutAlt = 0;
    images.each((_, el) => {
      const alt = $(el).attr('alt');
      if (!alt || alt.trim() === '') {
        imagesWithoutAlt++;
      }
    });
    result.images_without_alt = imagesWithoutAlt;

    // Links analysis
    const allLinks = $('a[href]');
    let externalLinks = 0;
    let internalLinks = 0;
    const baseDomain = new URL(url).hostname;
    
    allLinks.each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          if (href.startsWith('http://') || href.startsWith('https://')) {
            const linkUrl = new URL(href);
            if (linkUrl.hostname === baseDomain || linkUrl.hostname.endsWith('.' + baseDomain)) {
              internalLinks++;
            } else {
              externalLinks++;
            }
          } else if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
            internalLinks++;
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
    
    result.external_links_count = externalLinks;
    result.internal_links_count = internalLinks;

    // Mobile-friendly check
    const viewport = $('meta[name="viewport"]').attr('content');
    result.viewport = viewport || undefined;
    result.mobile_friendly = !!viewport;
    
    if (!viewport) {
      result.issues.push('Chybí viewport meta tag (stránka nemusí být mobile-friendly)');
      if (result.status === 'ok') result.status = 'warning';
    }

    // Favicon
    const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').attr('href');
    result.favicon = favicon ? new URL(favicon, url).href : undefined;
    
    if (!favicon) {
      result.issues.push('Chybí favicon');
      if (result.status === 'ok') result.status = 'warning';
    }

    // HTTPS
    result.https = url.startsWith('https://');

    // Validations
    if (!result.title) {
      result.issues.push('Chybí title');
      if (result.status === 'ok') result.status = 'warning';
    } else {
      if (result.title.length < 50) {
        result.issues.push(`Title je příliš krátký (${result.title.length} znaků, doporučeno 50-60)`);
        if (result.status === 'ok') result.status = 'warning';
      } else if (result.title.length > 60) {
        result.issues.push(`Title je příliš dlouhý (${result.title.length} znaků, doporučeno 50-60)`);
        if (result.status === 'ok') result.status = 'warning';
      }
    }

    if (!result.meta_description) {
      result.issues.push('Chybí meta description');
      if (result.status === 'ok') result.status = 'warning';
    } else {
      if (result.meta_description.length < 150) {
        result.issues.push(`Description je příliš krátká (${result.meta_description.length} znaků, doporučeno 150-160)`);
        if (result.status === 'ok') result.status = 'warning';
      } else if (result.meta_description.length > 160) {
        result.issues.push(`Description je příliš dlouhá (${result.meta_description.length} znaků, doporučeno 150-160)`);
        if (result.status === 'ok') result.status = 'warning';
      }
    }

    if (!result.h1) {
      result.issues.push('Chybí H1');
      if (result.status === 'ok') result.status = 'warning';
    }

    if (result.canonical) {
      try {
        const canonicalUrl = new URL(result.canonical, url).href;
        const currentUrl = new URL(url).href;
        if (canonicalUrl !== currentUrl) {
          result.issues.push(`Canonical URL neodpovídá aktuální URL`);
          if (result.status === 'ok') result.status = 'warning';
        }
      } catch (e) {
        result.issues.push('Neplatná canonical URL');
        if (result.status === 'ok') result.status = 'warning';
      }
    }

    if (imagesWithoutAlt > 0) {
      result.issues.push(`${imagesWithoutAlt} obrázků bez alt textu`);
      if (result.status === 'ok') result.status = 'warning';
      if (imagesWithoutAlt > 5) {
        result.status = 'error';
      }
    }

    if (!result.https) {
      result.issues.push('Stránka nepoužívá HTTPS');
      if (result.status === 'ok') result.status = 'warning';
    }

    return result;
  }
}


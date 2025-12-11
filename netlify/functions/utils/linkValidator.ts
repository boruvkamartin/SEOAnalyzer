import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface LinkValidationOptions {
  timeout?: number;
  maxWorkers?: number;
  delay?: number;
}

export interface LinkValidationResult {
  total_broken: number;
  broken_links: Array<{ url: string; status: number; error?: string }>;
  broken_images: Array<{ url: string; status: number; error?: string }>;
}

export class LinkValidator {
  private timeout: number;
  private maxWorkers: number;
  private delay: number;
  private cache: Map<string, { status: number; error?: string }> = new Map();

  constructor(options: LinkValidationOptions = {}) {
    this.timeout = options.timeout || 10000;
    this.maxWorkers = options.maxWorkers || 5;
    this.delay = options.delay || 100;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async validateUrl(url: string): Promise<{ status: number; error?: string }> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'SEO Analyzer Bot 1.0'
        },
        timeout: this.timeout,
        redirect: 'follow'
      } as any);

      const result = { status: response.status };
      this.cache.set(url, result);
      return result;
    } catch (error: any) {
      const result = { status: 0, error: error.message };
      this.cache.set(url, result);
      return result;
    }
  }

  private resolveUrl(href: string, baseUrl: string): string | null {
    try {
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
      }
      if (href.startsWith('//')) {
        return new URL(baseUrl).protocol + href;
      }
      if (href.startsWith('/')) {
        const base = new URL(baseUrl);
        return `${base.protocol}//${base.host}${href}`;
      }
      return new URL(href, baseUrl).href;
    } catch (e) {
      return null;
    }
  }

  async validatePageLinks(html: string, pageUrl: string): Promise<LinkValidationResult> {
    const $ = cheerio.load(html);
    const brokenLinks: Array<{ url: string; status: number; error?: string }> = [];
    const brokenImages: Array<{ url: string; status: number; error?: string }> = [];

    // Validate links
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        const resolved = this.resolveUrl(href, pageUrl);
        if (resolved) {
          links.push(resolved);
        }
      }
    });

    // Validate images
    const images: string[] = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src) {
        const resolved = this.resolveUrl(src, pageUrl);
        if (resolved) {
          images.push(resolved);
        }
      }
    });

    // Validate links in batches
    for (let i = 0; i < links.length; i += this.maxWorkers) {
      const batch = links.slice(i, i + this.maxWorkers);
      const results = await Promise.all(
        batch.map(url => this.validateUrl(url))
      );

      results.forEach((result, index) => {
        const url = batch[index];
        if (result.status === 0 || result.status >= 400) {
          brokenLinks.push({ url, ...result });
        }
      });

      if (i + this.maxWorkers < links.length) {
        await this.sleep(this.delay);
      }
    }

    // Validate images in batches
    for (let i = 0; i < images.length; i += this.maxWorkers) {
      const batch = images.slice(i, i + this.maxWorkers);
      const results = await Promise.all(
        batch.map(url => this.validateUrl(url))
      );

      results.forEach((result, index) => {
        const url = batch[index];
        if (result.status === 0 || result.status >= 400) {
          brokenImages.push({ url, ...result });
        }
      });

      if (i + this.maxWorkers < images.length) {
        await this.sleep(this.delay);
      }
    }

    return {
      total_broken: brokenLinks.length + brokenImages.length,
      broken_links: brokenLinks,
      broken_images: brokenImages
    };
  }
}


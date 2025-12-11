import { Handler } from '@netlify/functions';
import { SitemapParser } from '../utils/sitemapParser';
import { SEOScraper } from '../utils/seoScraper';
import { LinkValidator } from '../utils/linkValidator';
import { AdvancedChecks } from '../utils/advancedChecks';
import { analyzeContent } from '../utils/contentAnalyzer';
import { analyzePerformance, checkResponseHeaders } from '../utils/performanceAnalyzer';
import { calculateSEOScore } from '../utils/seoScore';
import fetch from 'node-fetch';

interface AnalyzeRequest {
  url: string;
  timeout?: number;
  delay?: number;
  limit?: number;
  skipLinks?: boolean;
}

interface AnalyzeResponse {
  results: any[];
  duplicateTitles: string[];
  duplicateDescriptions: string[];
  advancedChecks?: any;
  statistics?: any;
}

const detectDuplicates = (results: any[]): { titles: string[]; descriptions: string[] } => {
  const titles: string[] = [];
  const descriptions: string[] = [];

  results.forEach(result => {
    if (result.title) titles.push(result.title);
    if (result.meta_description) descriptions.push(result.meta_description);
  });

  const titleCounts = new Map<string, number>();
  const descCounts = new Map<string, number>();

  titles.forEach(title => {
    titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
  });

  descriptions.forEach(desc => {
    descCounts.set(desc, (descCounts.get(desc) || 0) + 1);
  });

  const duplicateTitles = Array.from(titleCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([title]) => title);

  const duplicateDescriptions = Array.from(descCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([desc]) => desc);

  return { titles: duplicateTitles, descriptions: duplicateDescriptions };
};

const addDuplicateWarnings = (
  results: any[],
  duplicateTitles: string[],
  duplicateDescriptions: string[]
): void => {
  results.forEach(result => {
    if (result.title && duplicateTitles.includes(result.title)) {
      result.issues.push(`Duplicitní title: "${result.title}"`);
      if (result.status === 'ok') {
        result.status = 'warning';
      }
    }

    if (result.meta_description && duplicateDescriptions.includes(result.meta_description)) {
      result.issues.push(`Duplicitní description: "${result.meta_description}"`);
      if (result.status === 'ok') {
        result.status = 'warning';
      }
    }
  });
};

const getTopIssues = (results: any[]): Array<{ issue: string; count: number }> => {
  const issueCounts = new Map<string, number>();
  
  results.forEach(result => {
    if (result.issues && Array.isArray(result.issues)) {
      result.issues.forEach((issue: string) => {
        // Normalize issue (remove counts)
        const normalizedIssue = issue.replace(/\d+/g, 'X').replace(/X/g, '');
        issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
      });
    }
  });

  return Array.from(issueCounts.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    const body: AnalyzeRequest = JSON.parse(event.body || '{}');

    if (!body.url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'URL je povinná' })
      };
    }

    const url = body.url.replace(/\/$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'URL musí začínat http:// nebo https://' })
      };
    }

    const timeout = body.timeout || 10;
    const delay = body.delay || 0.5;
    const limit = body.limit || null;
    const skipLinks = body.skipLinks || false;

    // Step 1: Find and parse sitemap
    const sitemapParser = new SitemapParser(url, { timeout: timeout * 1000 });
    let urls = await sitemapParser.getAllUrls();

    if (urls.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'V sitemapě nebyly nalezeny žádné URL' })
      };
    }

    if (limit && limit > 0) {
      urls = urls.slice(0, limit);
    }

    // Step 2: Scrape SEO attributes
    const seoScraper = new SEOScraper({
      timeout: timeout * 1000,
      delay: delay * 1000
    });

    const results: any[] = [];
    for (const urlItem of urls) {
      const result = await seoScraper.scrapeUrl(urlItem);
      
      // Add content analysis and performance metrics
      if (!result.error) {
        try {
          const page = await seoScraper.fetchPage(urlItem);
          if (page) {
            // Content analysis
            const contentMetrics = analyzeContent(page.$);
            result.content_metrics = contentMetrics;
            
            // Performance analysis - fetch again for headers (we need fresh response)
            try {
              const perfResponse = await fetch(urlItem, {
                headers: { 'User-Agent': 'SEO Analyzer Bot 1.0' },
                timeout: timeout * 1000
              } as any);
              
              if (perfResponse.ok) {
                const perfMetrics = await analyzePerformance(urlItem, perfResponse as any);
                result.performance_metrics = perfMetrics;
              } else {
                // Fallback - use basic checks from headers if available
                const headerCheck = checkResponseHeaders(perfResponse as any);
                result.performance_metrics = {
                  compression: headerCheck.compression,
                  compressionType: headerCheck.compressionType as any,
                  cacheHeaders: headerCheck.cacheHeaders,
                  cacheControl: headerCheck.cacheControl,
                  minified: false,
                  hasLazyLoading: page.html.includes('loading="lazy"') || page.html.includes('data-lazy')
                };
              }
            } catch (perfError) {
              // If performance check fails, use basic metrics from HTML
              result.performance_metrics = {
                compression: false,
                cacheHeaders: false,
                minified: false,
                hasLazyLoading: page.html.includes('loading="lazy"') || page.html.includes('data-lazy')
              };
            }
            
            // Calculate SEO score
            const seoScore = calculateSEOScore(
              result, 
              contentMetrics, 
              result.performance_metrics
            );
            result.seo_score = seoScore;
          }
        } catch (e) {
          console.error(`Error analyzing content/performance for ${urlItem}:`, e);
        }
      }
      
      results.push(result);
    }

    // Step 3: Validate broken links (optional)
    if (!skipLinks) {
      const linkValidator = new LinkValidator({
        timeout: timeout * 1000,
        maxWorkers: 5,
        delay: Math.min(delay * 1000, 100)
      });

      for (const result of results) {
        if (result.error) continue;

        const page = await seoScraper.fetchPage(result.url);
        if (page) {
          const linkValidation = await linkValidator.validatePageLinks(page.html, result.url);

          result.broken_links_count = linkValidation.total_broken;
          result.broken_links_detail = {
            broken_links: linkValidation.broken_links,
            broken_images: linkValidation.broken_images
          };

          if (linkValidation.total_broken > 0) {
            result.issues.push(`${linkValidation.total_broken} broken links/obrázků`);
            if (result.status === 'ok') {
              result.status = 'warning';
            }
            if (linkValidation.total_broken > 5) {
              result.status = 'error';
            }
          }
        }
      }
    } else {
      results.forEach(result => {
        result.broken_links_count = 0;
      });
    }

    // Step 4: Detect duplicates
    const { titles: duplicateTitles, descriptions: duplicateDescriptions } = detectDuplicates(results);
    addDuplicateWarnings(results, duplicateTitles, duplicateDescriptions);

    // Step 5: Advanced checks (sitemap, robots.txt)
    const advancedChecks = new AdvancedChecks(timeout * 1000);
    const sitemapCheck = await advancedChecks.checkSitemap(url);
    const robotsCheck = await advancedChecks.checkRobotsTxt(url);

    // Step 6: Calculate statistics
    const statistics = {
      totalPages: results.length,
      errorPages: results.filter(r => r.status === 'error').length,
      warningPages: results.filter(r => r.status === 'warning').length,
      okPages: results.filter(r => r.status === 'ok').length,
      avgPageSize: results.filter(r => r.page_size).length > 0
        ? Math.round(results.reduce((sum, r) => sum + (r.page_size || 0), 0) / results.filter(r => r.page_size).length)
        : 0,
      totalExternalLinks: results.reduce((sum, r) => sum + (r.external_links_count || 0), 0),
      totalInternalLinks: results.reduce((sum, r) => sum + (r.internal_links_count || 0), 0),
      mobileFriendlyPages: results.filter(r => r.mobile_friendly).length,
      httpsPages: results.filter(r => r.https).length,
      topIssues: getTopIssues(results)
    };

    const response: AnalyzeResponse = {
      results,
      duplicateTitles,
      duplicateDescriptions,
      advancedChecks: {
        sitemap: sitemapCheck,
        robots: robotsCheck
      },
      statistics
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    console.error('Error in analyze function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: error.message || 'Chyba při analýze',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};


import fetch from 'node-fetch';

export interface PerformanceMetrics {
  compression: boolean;
  compressionType?: 'gzip' | 'brotli' | 'deflate';
  cacheHeaders: boolean;
  cacheControl?: string;
  minified: boolean;
  hasLazyLoading: boolean;
  responseTime?: number; // in milliseconds
}

/**
 * Analyze performance metrics from HTTP response
 */
export async function analyzePerformance(
  url: string,
  response: Response
): Promise<PerformanceMetrics> {
  const metrics: PerformanceMetrics = {
    compression: false,
    cacheHeaders: false,
    minified: false,
    hasLazyLoading: false
  };

  // Check compression
  const contentEncoding = response.headers.get('content-encoding');
  if (contentEncoding) {
    metrics.compression = true;
    if (contentEncoding.includes('br')) {
      metrics.compressionType = 'brotli';
    } else if (contentEncoding.includes('gzip')) {
      metrics.compressionType = 'gzip';
    } else if (contentEncoding.includes('deflate')) {
      metrics.compressionType = 'deflate';
    }
  }

  // Check cache headers
  const cacheControl = response.headers.get('cache-control');
  const expires = response.headers.get('expires');
  if (cacheControl || expires) {
    metrics.cacheHeaders = true;
    if (cacheControl) {
      metrics.cacheControl = cacheControl;
    }
  }

  // Get HTML content to check for minification and lazy loading
  const html = await response.text();
  
  // Check if HTML is minified (simplified check - no whitespace between tags)
  const minifiedPattern = /><[^/]/g;
  const minifiedMatches = html.match(minifiedPattern);
  // If more than 50% of tag boundaries have no whitespace, consider it minified
  const totalTags = (html.match(/</g) || []).length;
  metrics.minified = minifiedMatches && totalTags > 0 
    ? (minifiedMatches.length / totalTags) > 0.5 
    : false;

  // Check for lazy loading (loading="lazy" attribute or lazy loading libraries)
  metrics.hasLazyLoading = 
    html.includes('loading="lazy"') ||
    html.includes('loading="lazy"') ||
    html.includes('data-lazy') ||
    html.includes('lazyload') ||
    html.includes('lozad');

  return metrics;
}

/**
 * Check response headers for performance optimizations
 */
export function checkResponseHeaders(response: Response): {
  compression: boolean;
  compressionType?: string;
  cacheHeaders: boolean;
  cacheControl?: string;
} {
  const contentEncoding = response.headers.get('content-encoding');
  const cacheControl = response.headers.get('cache-control');
  const expires = response.headers.get('expires');

  return {
    compression: !!contentEncoding,
    compressionType: contentEncoding || undefined,
    cacheHeaders: !!(cacheControl || expires),
    cacheControl: cacheControl || undefined
  };
}


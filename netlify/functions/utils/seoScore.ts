import { SEOResult } from './seoScraper';

export interface SEORecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  recommendation: string;
  impact: string;
}

export interface SEOScoreResult {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: SEORecommendation[];
  breakdown: {
    basic: number; // 0-100
    content: number; // 0-100
    technical: number; // 0-100
    performance: number; // 0-100
  };
}

/**
 * Calculate SEO score (0-100) based on various factors
 */
export function calculateSEOScore(result: SEOResult, contentMetrics?: {
  wordCount?: number;
  readability?: number;
  keywordDensity?: number;
}, performanceMetrics?: {
  compression?: boolean;
  cacheHeaders?: boolean;
  minified?: boolean;
}): SEOScoreResult {
  const recommendations: SEORecommendation[] = [];
  let basicScore = 100;
  let contentScore = 100;
  let technicalScore = 100;
  let performanceScore = 100;

  // === BASIC SEO (40 points) ===
  
  // Title (10 points)
  if (!result.title) {
    basicScore -= 10;
    recommendations.push({
      priority: 'high',
      category: 'Základní SEO',
      issue: 'Chybí title tag',
      recommendation: 'Přidejte unikátní title tag pro každou stránku (50-60 znaků)',
      impact: 'Vysoký - title je kritický pro SEO'
    });
  } else {
    if (result.title.length < 30) {
      basicScore -= 5;
      recommendations.push({
        priority: 'high',
        category: 'Základní SEO',
        issue: 'Title je příliš krátký',
        recommendation: `Prodloužte title na 50-60 znaků (aktuálně ${result.title.length})`,
        impact: 'Vysoký - krátký title může negativně ovlivnit CTR'
      });
    } else if (result.title.length > 60) {
      basicScore -= 3;
      recommendations.push({
        priority: 'medium',
        category: 'Základní SEO',
        issue: 'Title je příliš dlouhý',
        recommendation: `Zkraťte title na 50-60 znaků (aktuálně ${result.title.length})`,
        impact: 'Střední - dlouhý title se může zkrátit ve výsledcích vyhledávání'
      });
    }
  }

  // Meta description (10 points)
  if (!result.meta_description) {
    basicScore -= 10;
    recommendations.push({
      priority: 'high',
      category: 'Základní SEO',
      issue: 'Chybí meta description',
      recommendation: 'Přidejte meta description (150-160 znaků)',
      impact: 'Vysoký - description ovlivňuje CTR ve výsledcích vyhledávání'
    });
  } else {
    if (result.meta_description.length < 120) {
      basicScore -= 5;
      recommendations.push({
        priority: 'high',
        category: 'Základní SEO',
        issue: 'Description je příliš krátká',
        recommendation: `Prodloužte description na 150-160 znaků (aktuálně ${result.meta_description.length})`,
        impact: 'Vysoký - krátká description může negativně ovlivnit CTR'
      });
    } else if (result.meta_description.length > 160) {
      basicScore -= 3;
      recommendations.push({
        priority: 'medium',
        category: 'Základní SEO',
        issue: 'Description je příliš dlouhá',
        recommendation: `Zkraťte description na 150-160 znaků (aktuálně ${result.meta_description.length})`,
        impact: 'Střední - dlouhá description se může zkrátit ve výsledcích'
      });
    }
  }

  // H1 (5 points)
  if (!result.h1) {
    basicScore -= 5;
    recommendations.push({
      priority: 'high',
      category: 'Základní SEO',
      issue: 'Chybí H1 tag',
      recommendation: 'Přidejte jeden H1 tag na stránku s hlavním klíčovým slovem',
      impact: 'Vysoký - H1 je důležitý pro strukturu a SEO'
    });
  }

  // Canonical (5 points)
  if (!result.canonical) {
    basicScore -= 3;
    recommendations.push({
      priority: 'medium',
      category: 'Základní SEO',
      issue: 'Chybí canonical URL',
      recommendation: 'Přidejte canonical URL pro prevenci duplicitního obsahu',
      impact: 'Střední - pomáhá předcházet problémům s duplicitním obsahem'
    });
  }

  // HTTPS (5 points)
  if (!result.https) {
    basicScore -= 5;
    recommendations.push({
      priority: 'high',
      category: 'Základní SEO',
      issue: 'Stránka nepoužívá HTTPS',
      recommendation: 'Nainstalujte SSL certifikát a přesměrujte na HTTPS',
      impact: 'Vysoký - HTTPS je ranking faktor a bezpečnostní požadavek'
    });
  }

  // Images alt text (5 points)
  if (result.images_without_alt && result.images_without_alt > 0) {
    const ratio = result.images_without_alt / (result.images_total || 1);
    if (ratio > 0.5) {
      basicScore -= 5;
      recommendations.push({
        priority: 'high',
        category: 'Základní SEO',
        issue: `Více než 50% obrázků bez alt textu (${result.images_without_alt}/${result.images_total})`,
        recommendation: 'Přidejte alt texty ke všem obrázkům',
        impact: 'Vysoký - alt texty jsou důležité pro přístupnost a SEO'
      });
    } else {
      basicScore -= 2;
      recommendations.push({
        priority: 'medium',
        category: 'Základní SEO',
        issue: `${result.images_without_alt} obrázků bez alt textu`,
        recommendation: 'Přidejte alt texty ke všem obrázkům',
        impact: 'Střední - zlepší přístupnost a SEO'
      });
    }
  }

  // === CONTENT (30 points) ===
  
  if (contentMetrics) {
    // Word count (10 points)
    if (contentMetrics.wordCount !== undefined) {
      if (contentMetrics.wordCount < 300) {
        contentScore -= 10;
        recommendations.push({
          priority: 'high',
          category: 'Obsah',
          issue: `Příliš málo textu (${contentMetrics.wordCount} slov)`,
          recommendation: 'Přidejte více kvalitního obsahu (min. 300 slov)',
          impact: 'Vysoký - thin content může negativně ovlivnit SEO'
        });
      } else if (contentMetrics.wordCount < 500) {
        contentScore -= 5;
        recommendations.push({
          priority: 'medium',
          category: 'Obsah',
          issue: `Málo textu (${contentMetrics.wordCount} slov)`,
          recommendation: 'Přidejte více obsahu pro lepší SEO (doporučeno 500+ slov)',
          impact: 'Střední - více obsahu může zlepšit SEO'
        });
      }
    }

    // Readability (10 points)
    if (contentMetrics.readability !== undefined) {
      if (contentMetrics.readability < 30) {
        contentScore -= 10;
        recommendations.push({
          priority: 'medium',
          category: 'Obsah',
          issue: 'Text je obtížně čitelný',
          recommendation: 'Zjednodušte text - používejte kratší věty a jednodušší slova',
          impact: 'Střední - lepší čitelnost zlepšuje uživatelský zážitek'
        });
      } else if (contentMetrics.readability < 50) {
        contentScore -= 5;
        recommendations.push({
          priority: 'low',
          category: 'Obsah',
          issue: 'Text by mohl být čitelnější',
          recommendation: 'Zvažte zjednodušení textu pro lepší čitelnost',
          impact: 'Nízký - mírné zlepšení čitelnosti'
        });
      }
    }

    // Keyword density (10 points)
    if (contentMetrics.keywordDensity !== undefined) {
      if (contentMetrics.keywordDensity < 0.5) {
        contentScore -= 5;
        recommendations.push({
          priority: 'medium',
          category: 'Obsah',
          issue: 'Nízká keyword density',
          recommendation: 'Zvažte přidání více relevantních klíčových slov do obsahu',
          impact: 'Střední - může pomoci s rankingem'
        });
      } else if (contentMetrics.keywordDensity > 3) {
        contentScore -= 10;
        recommendations.push({
          priority: 'high',
          category: 'Obsah',
          issue: 'Příliš vysoká keyword density (keyword stuffing)',
          recommendation: 'Snižte počet klíčových slov - Google penalizuje keyword stuffing',
          impact: 'Vysoký - keyword stuffing může vést k penalizaci'
        });
      }
    }
  }

  // Internal links (bonus)
  if (result.internal_links_count !== undefined) {
    if (result.internal_links_count < 3) {
      contentScore -= 3;
      recommendations.push({
        priority: 'low',
        category: 'Obsah',
        issue: 'Málo interních odkazů',
        recommendation: 'Přidejte více interních odkazů na relevantní stránky',
        impact: 'Nízký - interní odkazy pomáhají s crawlováním a SEO'
      });
    }
  }

  // === TECHNICAL (20 points) ===
  
  // Mobile-friendly (5 points)
  if (!result.mobile_friendly) {
    technicalScore -= 5;
    recommendations.push({
      priority: 'high',
      category: 'Technické SEO',
      issue: 'Stránka není mobile-friendly',
      recommendation: 'Přidejte viewport meta tag a optimalizujte pro mobilní zařízení',
      impact: 'Vysoký - mobile-first indexing vyžaduje mobile-friendly design'
    });
  }

  // Structured data (5 points)
  if (!result.structured_data || result.structured_data.length === 0) {
    technicalScore -= 5;
    recommendations.push({
      priority: 'medium',
      category: 'Technické SEO',
      issue: 'Chybí strukturovaná data',
      recommendation: 'Přidejte strukturovaná data (JSON-LD) pro lepší zobrazení ve výsledcích',
      impact: 'Střední - může zlepšit zobrazení ve výsledcích vyhledávání'
    });
  } else {
    const invalidStructured = result.structured_data.filter(sd => sd.valid === false);
    if (invalidStructured.length > 0) {
      technicalScore -= 3;
      recommendations.push({
        priority: 'medium',
        category: 'Technické SEO',
        issue: 'Neplatná strukturovaná data',
        recommendation: 'Opravte chyby ve strukturovaných datech',
        impact: 'Střední - neplatná strukturovaná data se nebudou zobrazovat'
      });
    }
  }

  // Page size (5 points)
  if (result.page_size && result.page_size > 3 * 1024 * 1024) {
    technicalScore -= 5;
    recommendations.push({
      priority: 'medium',
      category: 'Technické SEO',
      issue: `Stránka je příliš velká (${(result.page_size / 1024 / 1024).toFixed(2)} MB)`,
      recommendation: 'Optimalizujte velikost stránky - odstraňte nepotřebný kód, komprimujte obrázky',
      impact: 'Střední - velká stránka se načítá pomaleji'
    });
  } else if (result.page_size && result.page_size > 2 * 1024 * 1024) {
    technicalScore -= 2;
    recommendations.push({
      priority: 'low',
      category: 'Technické SEO',
      issue: `Stránka je poměrně velká (${(result.page_size / 1024 / 1024).toFixed(2)} MB)`,
      recommendation: 'Zvažte optimalizaci velikosti stránky',
      impact: 'Nízký - mírné zlepšení rychlosti načítání'
    });
  }

  // Redirect type (5 points)
  if (result.redirect_type === 302) {
    technicalScore -= 3;
    recommendations.push({
      priority: 'medium',
      category: 'Technické SEO',
      issue: 'Používá se dočasný redirect (302)',
      recommendation: 'Změňte na trvalý redirect (301) pro lepší SEO',
      impact: 'Střední - 301 redirect je lepší pro SEO'
    });
  }

  // === PERFORMANCE (10 points) ===
  
  if (performanceMetrics) {
    // Compression (3 points)
    if (performanceMetrics.compression === false) {
      performanceScore -= 3;
      recommendations.push({
        priority: 'medium',
        category: 'Performance',
        issue: 'Stránka není komprimována',
        recommendation: 'Nastavte Gzip nebo Brotli kompresi na serveru',
        impact: 'Střední - komprese výrazně zmenší velikost stránky'
      });
    }

    // Cache headers (3 points)
    if (performanceMetrics.cacheHeaders === false) {
      performanceScore -= 2;
      recommendations.push({
        priority: 'low',
        category: 'Performance',
        issue: 'Chybí cache headers',
        recommendation: 'Nastavte vhodné cache headers pro statické soubory',
        impact: 'Nízký - cache zlepší rychlost opakovaných návštěv'
      });
    }

    // Minification (2 points)
    if (performanceMetrics.minified === false) {
      performanceScore -= 2;
      recommendations.push({
        priority: 'low',
        category: 'Performance',
        issue: 'CSS/JS nejsou minifikovány',
        recommendation: 'Minifikujte CSS a JavaScript soubory',
        impact: 'Nízký - minifikace zmenší velikost souborů'
      });
    }
  }

  // Broken links (2 points)
  if (result.broken_links_count && result.broken_links_count > 0) {
    technicalScore -= Math.min(2, result.broken_links_count);
    recommendations.push({
      priority: result.broken_links_count > 5 ? 'high' : 'medium',
      category: 'Technické SEO',
      issue: `${result.broken_links_count} broken links`,
      recommendation: 'Opravte nebo odstraňte broken links',
      impact: result.broken_links_count > 5 ? 'Vysoký' : 'Střední'
    });
  }

  // Calculate final score (weighted average)
  const finalScore = Math.round(
    basicScore * 0.4 + 
    contentScore * 0.3 + 
    technicalScore * 0.2 + 
    performanceScore * 0.1
  );

  // Determine grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (finalScore >= 90) grade = 'A';
  else if (finalScore >= 75) grade = 'B';
  else if (finalScore >= 60) grade = 'C';
  else if (finalScore >= 40) grade = 'D';
  else grade = 'F';

  // Sort recommendations by priority
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return {
    score: Math.max(0, Math.min(100, finalScore)),
    grade,
    recommendations,
    breakdown: {
      basic: Math.max(0, Math.min(100, basicScore)),
      content: Math.max(0, Math.min(100, contentScore)),
      technical: Math.max(0, Math.min(100, technicalScore)),
      performance: Math.max(0, Math.min(100, performanceScore))
    }
  };
}


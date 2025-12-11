import * as cheerio from 'cheerio';

export interface ContentMetrics {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  headingCount: number;
  linkCount: number;
  imageCount: number;
  readability: number; // Flesch Reading Ease (0-100)
  keywordDensity: number; // Percentage
  topKeywords: Array<{ word: string; count: number; density: number }>;
  averageSentenceLength: number;
  averageWordLength: number;
}

/**
 * Analyze content quality metrics
 */
export function analyzeContent($: cheerio.CheerioAPI, targetKeyword?: string): ContentMetrics {
  // Get main content (remove script, style, nav, footer, etc.)
  const $content = $('body').clone();
  $content.find('script, style, nav, footer, header, aside, .nav, .menu, .footer, .header').remove();
  
  const text = $content.text();
  
  // Word count
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  // Character count
  const characterCount = text.length;
  
  // Paragraph count
  const paragraphCount = $content.find('p').length;
  
  // Heading count
  const headingCount = $content.find('h1, h2, h3, h4, h5, h6').length;
  
  // Link count
  const linkCount = $content.find('a').length;
  
  // Image count
  const imageCount = $content.find('img').length;
  
  // Calculate readability (Flesch Reading Ease)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const averageSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  
  // Count syllables (simplified - counts vowel groups)
  let syllableCount = 0;
  words.forEach(word => {
    const wordLower = word.toLowerCase();
    const vowels = wordLower.match(/[aeiouy]+/g);
    if (vowels) {
      syllableCount += vowels.length;
    } else {
      syllableCount += 1; // At least one syllable
    }
  });
  
  const averageSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 0;
  const averageWordLength = wordCount > 0 ? characterCount / wordCount : 0;
  
  // Flesch Reading Ease: 206.835 - (1.015 * ASL) - (84.6 * ASW)
  // ASL = average sentence length, ASW = average syllables per word
  const readability = Math.max(0, Math.min(100, 
    206.835 - (1.015 * averageSentenceLength) - (84.6 * averageSyllablesPerWord)
  ));
  
  // Keyword density analysis
  const wordFreq: { [key: string]: number } = {};
  words.forEach(word => {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
    if (cleanWord.length > 2) { // Ignore very short words
      wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
    }
  });
  
  // Get top keywords
  const sortedKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      density: wordCount > 0 ? (count / wordCount) * 100 : 0
    }));
  
  // Calculate target keyword density if provided
  let keywordDensity = 0;
  if (targetKeyword) {
    const keywordLower = targetKeyword.toLowerCase();
    const keywordCount = words.filter(w => 
      w.toLowerCase().includes(keywordLower)
    ).length;
    keywordDensity = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
  } else if (sortedKeywords.length > 0) {
    // Use top keyword density
    keywordDensity = sortedKeywords[0].density;
  }
  
  return {
    wordCount,
    characterCount,
    paragraphCount,
    headingCount,
    linkCount,
    imageCount,
    readability: Math.round(readability * 10) / 10,
    keywordDensity: Math.round(keywordDensity * 10) / 10,
    topKeywords: sortedKeywords,
    averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
    averageWordLength: Math.round(averageWordLength * 10) / 10
  };
}

/**
 * Check if content is "thin content" (too short)
 */
export function isThinContent(metrics: ContentMetrics): boolean {
  return metrics.wordCount < 300;
}


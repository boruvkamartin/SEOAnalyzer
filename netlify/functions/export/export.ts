import { Handler } from '@netlify/functions';
import ExcelJS from 'exceljs';

interface ExportRequest {
  results: any[];
  duplicateTitles: string[];
  duplicateDescriptions: string[];
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    const body: ExportRequest = JSON.parse(event.body || '{}');

    if (!body.results || !Array.isArray(body.results)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({ message: 'Neplatná data' })
      };
    }

    const workbook = new ExcelJS.Workbook();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Přehled');
    const errorCount = body.results.filter(r => r.status === 'error').length;
    const warningCount = body.results.filter(r => r.status === 'warning').length;
    const okCount = body.results.filter(r => r.status === 'ok').length;

    summarySheet.columns = [
      { header: 'Metrika', key: 'metric', width: 30 },
      { header: 'Hodnota', key: 'value', width: 20 }
    ];

    summarySheet.addRow({ metric: 'Celkem stránek', value: body.results.length });
    summarySheet.addRow({ metric: 'Stránky s chybami', value: errorCount });
    summarySheet.addRow({ metric: 'Stránky s varováními', value: warningCount });
    summarySheet.addRow({ metric: 'OK stránky', value: okCount });
    summarySheet.addRow({ metric: 'Duplicitní title', value: body.duplicateTitles?.length || 0 });
    summarySheet.addRow({ metric: 'Duplicitní description', value: body.duplicateDescriptions?.length || 0 });

    // Calculate averages
    const titles = body.results.filter(r => r.title).map(r => r.title);
    const descriptions = body.results.filter(r => r.meta_description).map(r => r.meta_description);
    const avgTitleLength = titles.length > 0
      ? Math.round(titles.reduce((sum, t) => sum + t.length, 0) / titles.length)
      : 0;
    const avgDescLength = descriptions.length > 0
      ? Math.round(descriptions.reduce((sum, d) => sum + d.length, 0) / descriptions.length)
      : 0;

    summarySheet.addRow({ metric: 'Průměrná délka title', value: avgTitleLength });
    summarySheet.addRow({ metric: 'Průměrná délka description', value: avgDescLength });

    // Style summary sheet
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Details sheet
    const detailsSheet = workbook.addWorksheet('Detailní data');
    detailsSheet.columns = [
      { header: 'Status', key: 'status', width: 12 },
      { header: 'URL', key: 'url', width: 50 },
      { header: 'Title', key: 'title', width: 50 },
      { header: 'Délka title', key: 'title_length', width: 15 },
      { header: 'Meta Description', key: 'meta_description', width: 60 },
      { header: 'Délka description', key: 'desc_length', width: 18 },
      { header: 'H1', key: 'h1', width: 40 },
      { header: 'OG Title', key: 'og_title', width: 40 },
      { header: 'OG Description', key: 'og_description', width: 50 },
      { header: 'OG Image', key: 'og_image', width: 40 },
      { header: 'Canonical', key: 'canonical', width: 40 },
      { header: 'Robots', key: 'robots', width: 20 },
      { header: 'Velikost stránky (KB)', key: 'page_size', width: 18 },
      { header: 'Externí odkazy', key: 'external_links', width: 15 },
      { header: 'Interní odkazy', key: 'internal_links', width: 15 },
      { header: 'Mobile-friendly', key: 'mobile_friendly', width: 15 },
      { header: 'Viewport', key: 'viewport', width: 30 },
      { header: 'Favicon', key: 'favicon', width: 40 },
      { header: 'Redirect type', key: 'redirect_type', width: 15 },
      { header: 'Obrázky bez alt', key: 'images_without_alt', width: 18 },
      { header: 'Celkem obrázků', key: 'images_total', width: 15 },
      { header: 'Broken links', key: 'broken_links_count', width: 15 },
      { header: 'HTTPS', key: 'https', width: 10 },
      { header: 'Problémy', key: 'issues', width: 60 }
    ];

    body.results.forEach(result => {
      const row = detailsSheet.addRow({
        status: result.status === 'error' ? 'Chyba' : result.status === 'warning' ? 'Varování' : 'OK',
        url: result.url,
        title: result.title || '',
        title_length: result.title ? result.title.length : 0,
        meta_description: result.meta_description || '',
        desc_length: result.meta_description ? result.meta_description.length : 0,
        h1: result.h1 || '',
        og_title: result.og_title || '',
        og_description: result.og_description || '',
        og_image: result.og_image || '',
        canonical: result.canonical || '',
        robots: result.robots || '',
        page_size: result.page_size ? Math.round(result.page_size / 1024) : 0,
        external_links: result.external_links_count || 0,
        internal_links: result.internal_links_count || 0,
        mobile_friendly: result.mobile_friendly ? 'Ano' : 'Ne',
        viewport: result.viewport || '',
        favicon: result.favicon || '',
        redirect_type: result.redirect_type || '',
        images_without_alt: result.images_without_alt || 0,
        images_total: result.images_total || 0,
        broken_links_count: result.broken_links_count || 0,
        https: result.https ? 'Ano' : 'Ne',
        issues: result.issues ? result.issues.join('; ') : ''
      });

      // Color code rows
      if (result.status === 'error') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE0E0' }
        };
      } else if (result.status === 'warning') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF8E0' }
        };
      } else {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0FFE0' }
        };
      }
    });

    // Style header row
    detailsSheet.getRow(1).font = { bold: true };
    detailsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Convert buffer to base64 string
    // ExcelJS returns Buffer in Node.js environment
    let base64: string;
    const bufferObj = buffer as any;
    if (Buffer.isBuffer(bufferObj)) {
      base64 = (bufferObj as Buffer).toString('base64');
    } else if (bufferObj instanceof Uint8Array) {
      base64 = Buffer.from(bufferObj).toString('base64');
    } else {
      base64 = Buffer.from(bufferObj as ArrayBuffer).toString('base64');
    }

    const responseHeaders: { [key: string]: string } = {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Disposition': `attachment; filename="seo_report_${new Date().toISOString().split('T')[0]}.xlsx"`
    };

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: base64,
      isBase64Encoded: true
    };
  } catch (error: any) {
    console.error('Error in export function:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        message: error.message || 'Chyba při exportu',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};


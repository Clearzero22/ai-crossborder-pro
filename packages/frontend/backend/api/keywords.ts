// backend/api/keywords.ts
/**
 * Keywords API endpoints
 * Handles keyword scraping from various sources
 */

import { Hono } from 'hono';
import * as xiyouzhaociService from '../services/xiyouzhaociService';

const keywords = new Hono();

// POST /api/keywords/xiyouzhaoci
// Scrape keywords from Xiyouzhaoci for a given ASIN
keywords.post('/xiyouzhaoci', async (c) => {
  try {
    const { asin, headless = true, maxKeywords = 50 } = await c.req.json();

    if (!asin || typeof asin !== 'string') {
      return c.json(
        { success: false, error: 'ASIN is required and must be a string' },
        400,
      );
    }

    // Validate ASIN format (basic check)
    if (!/^[A-Z0-9]{10}$/.test(asin)) {
      return c.json(
        {
          success: false,
          error: 'Invalid ASIN format. ASIN must be 10 alphanumeric characters.',
        },
        400,
      );
    }

    console.log(`[API] Xiyouzhaoci request for ASIN: ${asin}`);

    const result = await xiyouzhaociService.scrapeXiyouzhaociKeywords(asin, {
      headless,
      maxKeywords,
      saveCsv: true,
    });

    return c.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[API] Xiyouzhaoci error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return c.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      500,
    );
  }
});

export default keywords;

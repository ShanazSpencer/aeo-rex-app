// ═══════════════════════════════════════════════════════
// AEO-REX — Website Audit Function
// Fetches website HTML then passes to Anthropic for analysis
// Deploy path: netlify/functions/audit.js
// ═══════════════════════════════════════════════════════

exports.handler = async (event) => {

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const { url, biz, type } = JSON.parse(event.body);

    if (!url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'URL required' }) };
    }

    // ── STEP 1: Fetch the website HTML ──
    let siteContent = '';
    let fetchMethod = 'live';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const siteRes = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AEO-Rex-Audit/1.0; +https://aeo-rex.com)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-GB,en;q=0.9'
        }
      });

      clearTimeout(timeout);

      if (siteRes.ok) {
        const rawHtml = await siteRes.text();

        // Extract meaningful content — strip scripts, styles, strip tags
        siteContent = rawHtml
          // Remove script blocks
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          // Remove style blocks
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          // Remove HTML comments
          .replace(/<!--[\s\S]*?-->/g, '')
          // Extract schema markup before stripping tags
          // Keep JSON-LD intact for schema audit
          .replace(/<\/?(html|body|head|header|footer|nav|main|section|article|div|span|p|h[1-6]|ul|ol|li|a|img|meta|link|table|tr|td|th|form|input|button|label)[^>]*>/gi, ' ')
          // Collapse whitespace
          .replace(/\s+/g, ' ')
          .trim()
          // Limit to first 6000 chars to stay within token limits
          .substring(0, 6000);

        // Also try to extract schema JSON-LD separately
        const schemaMatches = rawHtml.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
        const schemaContent = schemaMatches.join('\n').substring(0, 1500);

        siteContent = `LIVE WEBSITE CONTENT:\n${siteContent}\n\nEXISTING SCHEMA MARKUP FOUND:\n${schemaContent || 'None detected'}`;

      } else {
        fetchMethod = 'fallback';
        siteContent = `Could not fetch site (HTTP ${siteRes.status}). Generating audit based on URL structure and business type.`;
      }

    } catch (fetchErr) {
      // Site blocked fetch, timed out, or CORS issue — use fallback
      fetchMethod = 'fallback';
      siteContent = `Could not fetch site directly (${fetchErr.message}). Generating comprehensive audit based on URL analysis and business type patterns.`;
    }

    // ── STEP 2: Build audit prompt ──
    const prompt = `You are Shanaz's senior AEO specialist at AEO-Rex, UK's first AEO agency. Conduct a thorough AI Visibility Audit.

Website: ${url}
Business: ${biz || 'UK SME'} — Type: ${type || 'business'}
Fetch method: ${fetchMethod}

${siteContent}

Generate a comprehensive, specific audit. If you have live content, reference actual text and issues found. If fallback, be honest but still highly specific to their business type.

## WEBSITE AI VISIBILITY AUDIT — ${url}

### Overall AI Readiness Score: [X]/100
[One sentence explaining the score]

### What We Found On Your Site
[3-4 sentences describing what the site does, who it serves, and your immediate AEO impressions based on the content above]

### Schema Markup Audit
Current schema detected: [list what was found or "None detected"]

Missing schema (critical):
1. [Schema type] — Why critical: [reason] — Fix: [exact JSON-LD snippet or instruction]
2. [Schema type] — Why critical: [reason] — Fix: [exact instruction]
3. [Schema type] — Why critical: [reason] — Fix: [exact instruction]
4. [Schema type] — Why critical: [reason] — Fix: [exact instruction]
5. [Schema type] — Why critical: [reason] — Fix: [exact instruction]

### Content Structure Audit
AI citation gaps found:
1. [Specific gap based on actual content] — Fix: [specific rewrite instruction]
2. [Gap] — Fix: [instruction]
3. [Gap] — Fix: [instruction]
4. [Gap] — Fix: [instruction]
5. [Gap] — Fix: [instruction]

### Voice Search Readiness
1. [Specific voice issue] — Fix: [action]
2. [Issue] — Fix: [action]
3. [Issue] — Fix: [action]

### Google Lens & Visual Search
1. [Image issue] — Fix: [specific filename/alt text instruction]
2. [Issue] — Fix: [action]
3. [Issue] — Fix: [action]

### Conversion Optimisation for AI Traffic
AI-referred visitors convert at 14.2% vs Google's 2.8% — but only if your page is optimised for them:
1. [Specific conversion issue] — Fix: [exact copy or structural change]
2. [Issue] — Fix: [action]
3. [Issue] — Fix: [action]

### Technical AEO Issues
1. [Technical issue] — Priority: [1-5] — Fix: [specific action]
2. [Issue] — Priority: [level] — Fix: [action]
3. [Issue] — Priority: [level] — Fix: [action]
4. [Issue] — Priority: [level] — Fix: [action]
5. [Issue] — Priority: [level] — Fix: [action]

### Your Prioritised Fix List (Best ROI First)
| # | Fix | Impact | Time | Module |
|---|-----|--------|------|--------|
| 1 | [fix] | High | 20 min | Module 2 |
| 2 | [fix] | High | 30 min | Module 3 |
| 3 | [fix] | High | 1 hr | Module 4 |
| 4 | [fix] | Med | 20 min | Module 2 |
| 5 | [fix] | Med | 45 min | Module 3 |
| 6 | [fix] | Med | 2 hrs | Module 4 |
| 7 | [fix] | Med | 30 min | Module 5 |
| 8 | [fix] | Low | 15 min | Module 2 |
| 9 | [fix] | Low | 1 hr | Module 3 |
| 10 | [fix] | Low | 2 hrs | Module 4 |

### 30-Day Implementation Plan
**Week 1 (Quick wins — schema + llms.txt):** [3 specific tasks]
**Week 2 (Content restructure):** [3 specific tasks]
**Week 3 (Authority building):** [3 specific tasks]
**Week 4 (Monitor + optimise):** [3 specific tasks]

### Predicted Score After 30 Days: [X]/100
[One sentence on what changes will have the biggest impact]`;

    // ── STEP 3: Send to Anthropic ──
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await aiRes.json();

    return {
      statusCode: aiRes.status,
      headers,
      body: JSON.stringify({
        ...data,
        fetchMethod // Tell the app whether live or fallback was used
      })
    };

  } catch (error) {
    console.error('Audit function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Audit failed', details: error.message })
    };
  }
};
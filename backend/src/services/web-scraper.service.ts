/**
 * Web Scraper Service
 * Extracts content from web pages using Puppeteer
 */

import puppeteer from 'puppeteer';
import { storageService } from './storage.service';
import { WebPageMetadata } from '../types';
import { logger } from '../config/logger';

export class WebScraperService {
  /**
   * Scrape a web page and extract content
   * @param url URL to scrape
   * @param boardId Board ID
   * @param nodeId Node ID
   * @returns Extracted content and metadata
   */
  async scrapePage(
    url: string,
    boardId: string,
    nodeId: string
  ): Promise<{
    metadata: WebPageMetadata;
    textContent: string;
    screenshotStorageKey: string;
  }> {
    let browser;
    
    try {
      logger.info('Starting web scraping', { url });

      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to page with timeout
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Extract metadata
      const metadata = await page.evaluate(() => {
        const getMetaContent = (name: string): string => {
          const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
          return meta?.getAttribute('content') || '';
        };

        return {
          title: document.title || '',
          description: getMetaContent('description') || getMetaContent('og:description'),
          favicon: document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href || '',
        };
      });

      // Extract main text content
      const textContent = await page.evaluate(() => {
        // Remove script, style, and other non-content elements
        const elementsToRemove = ['script', 'style', 'nav', 'footer', 'header', 'aside'];
        elementsToRemove.forEach(tag => {
          document.querySelectorAll(tag).forEach(el => el.remove());
        });

        // Get text from main content area (try common selectors)
        const mainSelectors = ['main', 'article', '[role="main"]', '.content', '#content'];
        for (const selector of mainSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            return element.textContent?.trim() || '';
          }
        }

        // Fallback to body text
        return document.body.textContent?.trim() || '';
      });

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false, // Just viewport
      });

      // Upload screenshot to S3
      const screenshotUpload = await storageService.uploadFile(
        screenshot,
        'screenshot.png',
        boardId,
        nodeId,
        'screenshot',
        'image/png'
      );

      logger.info('Web page scraped successfully', { url, textLength: textContent.length });

      return {
        metadata: {
          url,
          title: metadata.title,
          description: metadata.description,
          favicon: metadata.favicon,
        },
        textContent,
        screenshotStorageKey: screenshotUpload.key,
      };
    } catch (error) {
      logger.error('Failed to scrape web page', { error, url });
      throw new Error(`Failed to scrape web page: ${error}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Clean and normalize extracted text
   * @param text Raw text
   * @returns Cleaned text
   */
  cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\n\s*\n/g, '\n\n') // Multiple newlines to double newline
      .trim();
  }
}

export const webScraperService = new WebScraperService();

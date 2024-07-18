import puppeteer from "@cloudflare/puppeteer";
import { nanoid } from "nanoid";
import { Bindings } from '../types';
import { ImageService } from './imageService';

export class BrowserService {
  private browserEndpoint: Fetcher;
  private imageService: ImageService;

  constructor(browserEndpoint: Fetcher, imageService: ImageService) {
    this.browserEndpoint = browserEndpoint;
    this.imageService = imageService;
  }

  private async getRandomSession(
    endpoint: puppeteer.BrowserWorker
  ): Promise<string | undefined> {
    const sessions: puppeteer.ActiveSession[] = await puppeteer.sessions(
      endpoint
    );
    console.log(`Sessions: ${JSON.stringify(sessions)}`);
    const sessionIds = sessions
      .filter((v) => !v.connectionId)
      .map((v) => v.sessionId);
  
    if (sessionIds.length === 0) {
      return undefined;
    }
    return sessionIds[Math.floor(Math.random() * sessionIds.length)];
  }
  
  private async getBrowser(
    env: Bindings
  ): Promise<{ browser: puppeteer.Browser; launched: boolean }> {
    let sessionId = await this.getRandomSession(this.browserEndpoint);
    let browser: puppeteer.Browser | undefined;
    let launched = false;
  
    if (sessionId) {
      try {
        browser = await puppeteer.connect(this.browserEndpoint, sessionId);
      } catch (e) {
        console.log(`Failed to connect to ${sessionId}. Error ${e}`);
      }
    }
  
    if (!browser) {
      try {
        browser = await puppeteer.launch(this.browserEndpoint);
        launched = true;
      } catch (e) {
        console.error(`Failed to launch new browser instance. Error: ${e}`);
        throw new Error('Failed to launch browser due to resource limits');
      }
    }
  
    if (!browser) {
      throw new Error('Failed to obtain a browser instance');
    }
  
    console.log(`${launched ? "New" : "Existing"} browser launched`);
    return { browser, launched };
  }
  
  async takeScreenshot(url: string): Promise<string> {
    const crop = true;
    let img: ArrayBuffer | null = null;
    let browser: puppeteer.Browser | null = null;
  
    try {
      const browserResult = await this.getBrowser();
      browser = browserResult.browser;
  
      const page = await browser.newPage();
      await page.goto(url, { timeout: 6000 });
      img = (await page.screenshot({
        timeout: 6000,
        clip: {
          x: 0,
          y: 0,
          width: (await page.viewport())?.width ?? 1280,
          height: 3000,
        },
      })) as Buffer;
  
      if (crop && img !== null) {
        const r2Url = await this.imageService.processAndStoreImage(img);
        return r2Url;
      }
      
      throw new Error("Failed to process or store the image");
    } catch (error) {
      throw new Error(`Error during screenshot or processing: ${error.message}`);
    } finally {
      if (browser) {
        await browser.disconnect();
      }
    }
  }

  async extractText(url: string, env: Bindings): Promise<string> {
    const { browser, launched } = await this.getBrowser(env);
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2" });
      const text = await page.evaluate(() => document.body.innerText);
      return text;
    } catch (error) {
      throw new Error(`Error extracting text: ${error.message}`);
    } finally {
      await browser.disconnect();
    }
  }

  async getUrlInfo(url: string, env: Bindings): Promise<any> {
    const { browser, launched } = await this.getBrowser(env);
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2" });
      
      const info = await page.evaluate(() => {
        return {  
          title: document.title,
          content: document.body.innerText,
          raw_html: document.documentElement.outerHTML,
        };
      });
      
      // Take screenshot and get cover_url
      const r2Url = await this.takeScreenshot(url);
      
      return {
        ...info,
        url: url,
        cover_url: r2Url,
        created_at: new Date(),
        is_removed: false,
        user_id: 0,
        has_vector_summary: false,
      };
    } catch (error) {
      throw new Error(`Error getting URL info: ${error.message}`);
    } finally {
      await browser.disconnect();
    }
  }
}
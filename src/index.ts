import { Hono } from "hono";
import puppeteer from "@cloudflare/puppeteer";
import { nanoid } from "nanoid";
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { articles } from './db/schema';

type Bindings = {
  ADVX_BROWSER: Fetcher;
  KV: KVNamespace;
  SERVICE_NAME: string;
  BUCKET: R2Bucket;
  IMGPROC: Fetcher;
  QUEUE: Queue;
  DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.text("Advx24 API");
});

async function getRandomSession(
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

async function getBrowser(
  env: Bindings
): Promise<{ browser: puppeteer.Browser; launched: boolean }> {
  let sessionId = await getRandomSession(env.ADVX_BROWSER);
  let browser: puppeteer.Browser;
  let launched = false;

  if (sessionId) {
    try {
      browser = await puppeteer.connect(env.ADVX_BROWSER, sessionId);
    } catch (e) {
      console.log(`Failed to connect to ${sessionId}. Error ${e}`);
    }
  }

  if (!browser) {
    browser = await puppeteer.launch(env.ADVX_BROWSER);
    launched = true;
  }
  console.log(`${launched ? "New" : "Existing"} browser launched`);
  return { browser, launched };
}

app.get("/api/url-screenshot", async (c) => {
  const url = c.req.query("url");
  const crop = true;

  if (!url) {
    return c.text("Please add a ?url=https://example.com/ parameter", 400);
  }

  const normalizedUrl = new URL(url).toString();
  let img: ArrayBuffer | null = null;
  let browser: puppeteer.Browser | null = null;

  try {
    const browserResult = await getBrowser(c.env);
    browser = browserResult.browser;

    const page = await browser.newPage();
    await page.goto(normalizedUrl, { timeout: 30000 });
    img = (await page.screenshot({
      timeout: 30000,
      clip: {
        x: 0,
        y: 0,
        width: (await page.viewport())?.width ?? 1280,
        height: 3000,
      },
    })) as Buffer;

    if (crop && img !== null) {
      const response = await c.env.IMGPROC.fetch(
        "https://imgproc.workers.dev/image-resize",
        {
          method: "POST",
          body: img,
          headers: {
            "Content-Type": "image/jpeg",
          },
        }
      );

      if (response.ok) {
        img = await response.arrayBuffer();
      } else {
        const errorText = await response.text();
        throw new Error(`Image processing failed: ${errorText}`);
      }
    }
    // store to R2
    const r2Key = `screenshots/${nanoid()}.jpg`;
    await c.env.BUCKET.put(r2Key, img);
    // return new Response(img, {
    //   headers: {
    //     "content-type": "image/jpeg",
    //   },
    // });
    return new Response(
      "https://pub-73a62c9ac6aa4e91ad159b48b360cc20.r2.dev/" + r2Key,
      {
        headers: {
          "content-type": "text/html",
        },
      }
    );
  } catch (error) {
    return c.text(
      `Error during screenshot or processing: ${error.message}`,
      500
    );
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
});

app.get("/api/url-extract", async (c) => {
  const url = c.req.query("url");

  if (!url) {
    return c.text("Please add a ?url=https://example.com/ parameter", 400);
  }

  const normalizedUrl = new URL(url).toString();
  const { browser, launched } = await getBrowser(c.env);

  try {
    const page = await browser.newPage();
    await page.goto(normalizedUrl, { waitUntil: "networkidle0" });
    const text = await page.evaluate(() => document.body.innerText);
    return c.text(text);
  } catch (error) {
    return c.text(`Error extracting text: ${error.message}`, 500);
  } finally {
    await browser.disconnect();
  }
});

app.get("/api/url-info", async (c) => {
  const url = c.req.query("url");
  const crop = true;

  if (!url) {
    return c.text("Please add a ?url=https://example.com/ parameter", 400);
  }

  const normalizedUrl = new URL(url).toString();
  let img: ArrayBuffer | null = null;
  let browser: puppeteer.Browser | null = null;

  try {
    const browserResult = await getBrowser(c.env);
    browser = browserResult.browser;

    const page = await browser.newPage();
    await page.goto(normalizedUrl, { 
      timeout: 30000,
      waitUntil: "networkidle0",
    });
    const raw_html = await page.content();
    const title = await page.title();
    const text = await page.evaluate(() => document.body.innerText);
    img = (await page.screenshot({
      timeout: 30000,
      clip: {
        x: 0,
        y: 0,
        width: (await page.viewport())?.width ?? 1280,
        height: 3000,
      },
    })) as Buffer;

    if (crop && img !== null) {
      const response = await c.env.IMGPROC.fetch(
        "https://imgproc.workers.dev/image-resize",
        {
          method: "POST",
          body: img,
          headers: {
            "Content-Type": "image/jpeg",
          },
        }
      );

      if (response.ok) {
        img = await response.arrayBuffer();
      } else {
        const errorText = await response.text();
        throw new Error(`Image processing failed: ${errorText}`);
      }
    }

    // store to R2
    const r2Key = `screenshots/${nanoid()}.jpg`;
    await c.env.BUCKET.put(r2Key, img);
    const r2Url = "https://pub-73a62c9ac6aa4e91ad159b48b360cc20.r2.dev/" + r2Key;

    const data = {
      url: normalizedUrl,
      raw_html: raw_html,
      content: text,
      cover_url: r2Url,
      title: title,
      created_at: new Date(),
      is_removed: false,
    };

    // Store data in PostgreSQL using Drizzle ORM
    const db = getDB(c);
    const result = await db.insert(articles).values(data).returning();

    return c.json(result[0]);
  } catch (error) {
    return c.text(
      `Error during processing: ${error.message}`,
       500
    );
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
});

app.post("/api/url-batch-processing", async (c) => {
  const tasks = await c.req.json();
  
  if (!Array.isArray(tasks)) {
    return c.json({ error: "Invalid input. Expected an array of tasks." }, 400);
  }

  for (const task of tasks) {
    if (!task.id || !task.url) {
      return c.json({ error: "Invalid task format. Each task must have 'id' and 'url' properties." }, 400);
    }

    await c.env.QUEUE.send(task);
  }

  return c.json({ message: `${tasks.length} tasks queued successfully` });
});

app.post("/api/url-batch-importing", async (c) => {
  const urls = await c.req.json();
  console.log(urls);
  return c.text("ok");
});

app.get("/api/test-db-write", async (c) => {
  const db = getDB(c);
  console.log(c.env.DATABASE_URL);
  const result = await db.insert(articles).values({
    url: "https://example.com",
    raw_html: "<html><body></body></html>",
    content: "Example content",
    cover_url: "https://example.com/cover.jpg",
    title: "Example title",
    created_at: new Date(),
  }).returning();
  return c.json(result[0]);
});

function getDB(c: Context) {
  const pool = new Pool({
    connectionString: c.env.DATABASE_URL,
  });
  return drizzle(pool);
}

export default {
  fetch: app.fetch,
  async queue(batch, env) {
    for (const message of batch.messages) {
      const task = message.body;
      console.log(task);
    }
  }
}
import { Context } from 'hono';
import { Bindings } from '../types';
import { createServices } from '../services';

export async function urlScreenshotHandler(c: Context<{ Bindings: Bindings }>) {
  const url = c.req.query("url");
  if (!url) {
    return c.text("Please add a ?url=https://example.com/ parameter", 400);
  }

  const services = createServices(c.env);
  try {
    const screenshotUrl = await services.browserService.takeScreenshot(url);
    return c.text(screenshotUrl);
  } catch (error) {
    return c.text(`Failed to take URL screenshot: ${error.message}`, 500);
  }
}

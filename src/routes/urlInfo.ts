import { Context } from 'hono';
import { Bindings } from '../types';
import { createServices } from '../services';

export async function urlInfoHandler(c: Context<{ Bindings: Bindings }>) {
  const url = c.req.query("url");
  if (!url) {
    return c.text("Please add a ?url=https://example.com/ parameter", 400);
  }

  const services = createServices(c.env);
  try {
    const info = await services.browserService.getUrlInfo(url, c.env);
    const result = await services.databaseService.saveArticle(info);
    return c.json(result);
  } catch (error) {
    return c.text(`Error during processing: ${error.message}`, 500);
  }
}
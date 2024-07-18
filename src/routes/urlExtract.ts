import { Context } from 'hono';
import { Bindings } from '../types';
import { createServices } from '../services';

export async function urlExtractHandler(c: Context<{ Bindings: Bindings }>) {
  const url = c.req.query("url");
  if (!url) {
    return c.text("Please add a ?url=https://example.com/ parameter", 400);
  }
  const services = createServices(c.env);
  try {
    const text = await services.browserService.extractText(url);
    console.log(1)
    return c.text(text);
  } catch (error) {
    return c.text(`Error extracting text: ${error.message}`, 500);
  }
}
import { Context } from 'hono';
import { Bindings } from '../types';

export async function urlImportingHandler(c: Context<{ Bindings: Bindings }>) {
  const urls = await c.req.json();
  console.log(urls);
  return c.text("ok");
}
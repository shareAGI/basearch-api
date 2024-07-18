import { Context } from 'hono';
import { Bindings } from '../types';
import { createServices } from '../services';

export async function testDbWriteHandler(c: Context<{ Bindings: Bindings }>) {
  const services = createServices(c.env);
  const result = await services.databaseService.testWrite();
  return c.json(result);
}
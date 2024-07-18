import { Context } from 'hono';
import { Bindings } from '../types';
import { createServices } from '../services';

export async function urlBatchProcessingHandler(c: Context<{ Bindings: Bindings }>) {
  const tasks = await c.req.json();
  
  if (!Array.isArray(tasks)) {
    return c.json({ error: "Invalid input. Expected an array of tasks." }, 400);
  }

  const services = createServices(c.env);
  for (const task of tasks) {
    if (!task.id || !task.url) {
      return c.json({ error: "Invalid task format. Each task must have 'id' and 'url' properties." }, 400);
    }

    await services.queueProcessorService.queueTask(task);
  }

  return c.json({ message: `${tasks.length} tasks queued successfully` });
}
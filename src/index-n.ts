import { Hono } from "hono";
import { setupRoutes } from './routes';
import { createServices } from './services';
import { Bindings } from './types';

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("Advx24 API"));

setupRoutes(app);

export default {
  fetch: app.fetch,
  async queue(batch, env) {
    const services = createServices(env);
    for (const message of batch.messages) {
      const task = message.body;
      try {
        const info = await services.browserService.getUrlInfo(task.url, env);
        info.title = task.title || info.title;
        info.created_at = new Date(task.created_at);
        await services.databaseService.saveArticle(info);
        message.ack();
        console.log(`Processed task: ${task.id}`);
      } catch (error) {
        message.retry();
        console.error(`Error processing task ${task.id}: ${error.message}`);
      }
    }
    await fetch('https://advx.verse.eu.org/v1/emb/process');
  }
}
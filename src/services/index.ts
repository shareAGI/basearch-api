import { BrowserService } from './browserService';
import { DatabaseService } from './databaseService';
import { ImageService } from './imageService';
import { QueueProcessorService } from './queueProcessorService';
import { UncapturedProcessService } from './uncapturedProcessService';
import { Bindings } from '../types';

export function createServices(env: Bindings) {
  const databaseService = new DatabaseService(env.DATABASE_URL);
  const imageService = new ImageService(env.IMGPROC, env.BUCKET);
  const browserService = new BrowserService(env.ADVX_BROWSER, imageService);
  const queueProcessorService = new QueueProcessorService(env.QUEUE);
  const uncapturedProcessService = new UncapturedProcessService(
    browserService,
    imageService,
    queueProcessorService
  );

  return {
    databaseService,
    browserService,
    imageService,
    queueProcessorService,
    uncapturedProcessService
  };
}
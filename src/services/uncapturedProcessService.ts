import { BrowserService } from './browserService';
import { ImageService } from './imageService';
import { QueueProcessorService } from './queueProcessorService';

export class UncapturedProcessService {
  private browserService: BrowserService;
  private imageService: ImageService;
  private queueProcessorService: QueueProcessorService;

  constructor(
    browserService: BrowserService,
    imageService: ImageService,
    queueProcessorService: QueueProcessorService
  ) {
    this.browserService = browserService;
    this.imageService = imageService;
    this.queueProcessorService = queueProcessorService;
  }

  async process(url: string, title: string, created_at: Date): Promise<void> {
    const task = {
      id: Date.now().toString(),
      url,
      title,
      created_at: created_at.toISOString(),
    };

    await this.queueProcessorService.queueTask(task);
  }
}
export class QueueProcessorService {
    private queue: Queue;
  
    constructor(queue: Queue) {
      this.queue = queue;
    }
  
    async queueTask(task: any) {
      await this.queue.send(task);
    }
  
    async processTask(task: any) {
      console.log(task);
      // Implementation for processing task
      // ...
    }
  }
import { nanoid } from "nanoid";
import { Bindings } from '../types';

export class ImageService {
  private imgproc: Fetcher;
  private bucket: R2Bucket;

  constructor(imgproc: Fetcher, bucket: R2Bucket) {
    this.imgproc = imgproc;
    this.bucket = bucket;
  }

  async processAndStoreImage(img: ArrayBuffer): Promise<string> {
    const response = await this.imgproc.fetch(
      "https://imgproc.workers.dev/image-resize",
      {
        method: "POST",
        body: img,
        headers: {
          "Content-Type": "image/jpeg",
        },
      }
    );
  
    if (response.ok) {
      img = await response.arrayBuffer();
    } else {
      const errorText = await response.text();
      throw new Error(`Image processing failed: ${errorText}`);
    }
  
    const r2Key = `screenshots/${nanoid()}.jpg`;
    await this.bucket.put(r2Key, img);
    return `https://pub-73a62c9ac6aa4e91ad159b48b360cc20.r2.dev/${r2Key}`;
  }
}
import { Hono } from "hono";
import { Bindings } from '../types';
import { urlScreenshotHandler } from './urlScreenshot';
import { urlExtractHandler } from './urlExtract';
import { urlInfoHandler } from './urlInfo';
import { urlBatchProcessingHandler } from './urlBatchProcessing';
import { urlImportingHandler } from './urlImporting';
import { testDbWriteHandler } from './testDbWrite';
import { bookmarksHandler } from './bookmarks';

export function setupRoutes(app: Hono<{ Bindings: Bindings }>) {
  app.get("/api/url-screenshot", urlScreenshotHandler);
  app.get("/api/url-extract", urlExtractHandler);
  app.get("/api/url-info", urlInfoHandler);
  app.post("/api/url-batch-processing", urlBatchProcessingHandler);
  app.post("/api/url-importing", urlImportingHandler);
  app.get("/api/test-db-write", testDbWriteHandler);
  app.all("/api/bookmarks", bookmarksHandler);
}
import { Context } from "hono";
import { Bindings } from "../types";
import { createServices } from "../services";

export async function bookmarksHandler(c: Context<{ Bindings: Bindings }>) {
  const services = createServices(c.env);

  switch (c.req.method) {
    case "GET":
      return await handleGet(c, services);
    case "POST":
      return await handlePost(c, services);
    case "PUT":
      return await handlePut(c, services);
    case "DELETE":
      return await handleDelete(c, services);
    default:
      return c.text("Method not allowed", 405);
  }
}

async function handleGet(
  c: Context<{ Bindings: Bindings }>,
  services: ReturnType<typeof createServices>
) {
  const query = c.req.query("query");
  const detailed = c.req.query("detailed") === "true";

  if (query) {
    // Forward the request to the external API
    const response = await fetch(
      `http://47.237.16.22:8000/v1/emb/search_sim_articles?query=${encodeURIComponent(
        query
      )}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return c.json(
        { error: "Error fetching from external API" },
        response.status
      );
    }

    const data = await response.json();
    return c.json(data);
  } else {
    // Fetch bookmarks from the database
    const bookmarks = await services.databaseService.getAllBookmarks();

    const filteredBookmarks = bookmarks.map((bookmark) => {
      const baseBookmark = {
        url: bookmark.url,
        title: bookmark.title,
        created_at: bookmark.created_at,
        cover_url: bookmark.cover_url,
        ...(detailed ? { summary: bookmark.summary } : {}),
      };

      if (detailed && bookmark.aspect_ratio) {
        const mappedRatio = mapAspectRatio(bookmark.aspect_ratio);
        return {
          ...baseBookmark,
          ...(detailed ? { aspect_ratio: mappedRatio } : {}),
        };
      }

      return baseBookmark;
    });

    return c.json(filteredBookmarks);
  }
}

function mapAspectRatio(ratio: number): number {
  const minInput = 0.5; // Minimum aspect ratio
  const maxInput = 2; // Maximum aspect ratio
  const minOutput = 1;
  const maxOutput = 1.5;

  // Clamp the input ratio to the valid range
  const clampedRatio = Math.max(minInput, Math.min(maxInput, ratio));

  // Linear interpolation
  return (
    minOutput +
    ((clampedRatio - minInput) * (maxOutput - minOutput)) /
      (maxInput - minInput)
  );
}

async function handlePost(
  c: Context<{ Bindings: Bindings }>,
  services: ReturnType<typeof createServices>
) {
  const bookmarks = await c.req.json();
  if (!Array.isArray(bookmarks)) {
    return c.json(
      { error: "Invalid input. Expected an array of bookmarks." },
      400
    );
  }

  const results = [];
  for (const bookmark of bookmarks) {
    try {
      // Ensure created_at is a Date type
      if (typeof bookmark.created_at === "string") {
        bookmark.created_at = new Date(bookmark.created_at);
      } else if (!(bookmark.created_at instanceof Date)) {
        bookmark.created_at = new Date();
      }

      if (bookmark.raw_html && bookmark.content) {
        // Case A: Full content provided
        const result = await services.databaseService.saveArticle(bookmark);
        results.push(result);
      } else {
        // Case B: Only URL, title, and created_at provided
        await services.uncapturedProcessService.process(
          bookmark.url,
          bookmark.title,
          bookmark.created_at
        );
        results.push({
          message: `Task queued for processing: ${bookmark.url}`,
        });
      }
    } catch (error) {
      if (error.code === "23505") {
        // Unique violation error code
        results.push({ error: `Duplicate URL: ${bookmark.url}` });
      } else {
        results.push({ error: `Error processing bookmark: ${error.message}` });
      }
    }
  }
  await fetch('http://47.237.16.22:8000/v1/emb/process');
  return c.json(results);
}

async function handlePut(
  c: Context<{ Bindings: Bindings }>,
  services: ReturnType<typeof createServices>
) {
  const { url, ...updateData } = await c.req.json();
  if (!url) {
    return c.json({ error: "URL is required for updating a bookmark." }, 400);
  }
  //   ensure created_at is a Date type
  if (typeof updateData.created_at === "string") {
    updateData.created_at = new Date(updateData.created_at);
  } else if (!(updateData.created_at instanceof Date)) {
    updateData.created_at = new Date();
  }
  try {
    const result = await services.databaseService.updateBookmark(
      url,
      updateData
    );

    await fetch("http://47.237.16.22:8000/v1/emb/process");

    return c.json(result);
  } catch (error) {
    return c.json({ error: `Error updating bookmark: ${error.message}` }, 500);
  }
}

async function handleDelete(
  c: Context<{ Bindings: Bindings }>,
  services: ReturnType<typeof createServices>
) {
  const { url } = await c.req.json();
  if (!url) {
    return c.json({ error: "URL is required for deleting a bookmark." }, 400);
  }

  try {
    const result = await services.databaseService.deleteBookmark(url);
    return c.json(result);
  } catch (error) {
    return c.json({ error: `Error deleting bookmark: ${error.message}` }, 500);
  }
}

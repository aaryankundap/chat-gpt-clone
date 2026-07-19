import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

// Created once at module load — reused across every tool call instead of
// being re-instantiated per request.
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

/**
 * AI SDK tool that lets the model search the live web via Tavily.
 * Used by the model whenever it needs current information beyond its
 * training data (news, prices, recent events, anything time-sensitive).
 */
export const webSearchTool = tool({
  description:
    "Search the live web for current information (news, prices, facts after the model's training cutoff, anything time-sensitive). Use this whenever the user asks about something recent or you're not confident your knowledge is current.",
  inputSchema: z.object({
    query: z.string().describe("A concise search query"),
  }),
  execute: async ({ query }) => {
    try {
      const data = await tvly.search(query, {
        maxResults: 5,
        includeAnswer: true,
      });

      return {
        answer: data.answer ?? null,
        results: data.results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content?.slice(0, 500),
        })),
      };
    } catch (err) {
      // Never throw out of execute() — return a structured error so the
      // model can gracefully tell the user the search failed instead of
      // the whole stream erroring out.
      return {
        error: err instanceof Error ? err.message : "Unknown search error",
      };
    }
  },
});
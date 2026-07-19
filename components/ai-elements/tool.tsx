"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ToolUIPart } from "ai";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  Loader2Icon,
  SearchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";

/** Root collapsible container for a single tool call/result. */
export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      "not-prose mb-3 w-full max-w-full rounded-lg border bg-card",
      className
    )}
    {...props}
  />
);

/** Maps a tool part's streaming state to a label + icon + badge variant. */
const STATE_META: Record<
  ToolUIPart["state"],
  { label: string; icon: ReactNode; variant: "secondary" | "outline" | "destructive" }
> = {
  "input-streaming": {
    label: "Preparing search…",
    icon: <Loader2Icon className="size-3 animate-spin" />,
    variant: "secondary",
  },
  "input-available": {
    label: "Searching…",
    icon: <Loader2Icon className="size-3 animate-spin" />,
    variant: "secondary",
  },
  "output-available": {
    label: "Search complete",
    icon: <CheckCircle2Icon className="size-3" />,
    variant: "outline",
  },
  "output-error": {
    label: "Search failed",
    icon: <XCircleIcon className="size-3" />,
    variant: "destructive",
  },
};

/** Header row — click to expand/collapse. Shows tool name, live status, and a chevron. */
export type ToolHeaderProps = HTMLAttributes<HTMLButtonElement> & {
  type: string;
  state: ToolUIPart["state"];
};

export const ToolHeader = ({ type, state, className, ...props }: ToolHeaderProps) => {
  const meta = STATE_META[state];

  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/50",
        className
      )}
      {...props}
    >
      <span className="flex items-center gap-2 text-muted-foreground">
        <SearchIcon className="size-3.5" />
        <span className="font-medium text-foreground">{type.replace(/^tool-/, "")}</span>
      </span>
      <span className="flex items-center gap-2">
        <Badge variant={meta.variant} className="gap-1">
          {meta.icon}
          {meta.label}
        </Badge>
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
      </span>
    </CollapsibleTrigger>
  );
};

/** Expandable body wrapping the input/output sections. */
export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn("space-y-2 border-t px-3 py-2 text-sm", className)}
    {...props}
  />
);

/** Renders the raw input the model sent the tool (e.g. the search query). */
export type ToolInputProps = HTMLAttributes<HTMLDivElement> & {
  input: unknown;
};

export const ToolInput = ({ input, className, ...props }: ToolInputProps) => (
  <div className={cn("space-y-1", className)} {...props}>
    <p className="text-xs font-medium text-muted-foreground">Query</p>
    <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
      {typeof input === "string" ? input : JSON.stringify(input, null, 2)}
    </pre>
  </div>
);

/** Renders the tool's output — search results list, or the error message. */
export type ToolOutputProps = HTMLAttributes<HTMLDivElement> & {
  output?: unknown;
  errorText?: string;
};

type SearchResult = { title?: string; url?: string; snippet?: string };
type SearchOutput = { answer?: string | null; results?: SearchResult[]; error?: string };

export const ToolOutput = ({ output, errorText, className, ...props }: ToolOutputProps) => {
  if (errorText) {
    return (
      <div
        className={cn(
          "rounded-md bg-destructive/10 p-2 text-xs text-destructive",
          className
        )}
        {...props}
      >
        {errorText}
      </div>
    );
  }

  if (!output) return null;

  const data = output as SearchOutput;

  if (data.error) {
    return (
      <div
        className={cn(
          "rounded-md bg-destructive/10 p-2 text-xs text-destructive",
          className
        )}
        {...props}
      >
        {data.error}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {data.answer ? (
        <p className="text-xs text-muted-foreground">{data.answer}</p>
      ) : null}

      {data.results?.length ? (
        <ul className="space-y-2">
          {data.results.map((r, i) => (
            <li key={r.url ?? i} className="rounded-md border p-2">
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-primary hover:underline"
              >
                {r.title || r.url}
              </a>
              {r.snippet ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {r.snippet}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
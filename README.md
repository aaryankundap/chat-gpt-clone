# ChaiGPT — Web Search Tool Calling & Chat Branching

An extension of the [chai-gpt-build](https://github.com/Aestheticsuraj234/chai-gpt-build) project, adding two production-style features on top of the existing Next.js + AI SDK + Prisma chat app:

1. **AI Tool Calling** — the model can search the live web mid-conversation and stream the results back before answering.
2. **Chat Branching** — fork a new, independent conversation from any past message, while keeping the original untouched.

## Live Deployment

- App: `<your deployed URL>`
- Demo video: `<your video link>`

## Tech Stack

- **Framework**: Next.js (App Router), React, TypeScript
- **AI**: Vercel AI SDK v5 (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`), OpenAI (`gpt-4o-mini` by default)
- **Web search**: Tavily (`@tavily/core`)
- **Database**: PostgreSQL + Prisma
- **Auth**: Clerk
- **UI**: shadcn/ui on `@base-ui/react`, Tailwind, `ai-elements`
- **Data fetching**: TanStack Query

## Getting Started

### 1. Clone and install
```bash
git clone <this-repo-url>
cd chai-gpt-build
bun install
```

### 2. Environment variables

Create `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://..."

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Tavily (web search)
TAVILY_API_KEY="tvly-..."
```

### 3. Set up the database
```bash
bunx prisma migrate dev
```

### 4. Run
```bash
bun run dev
```

## Feature 1 — AI Tool Calling (Web Search)

**How it works:** `app/api/chat/route.ts` registers a `webSearch` tool on `streamText()`. The model decides — per turn, based on the tool's description and a system-prompt nudge — whether the user's question needs current information. If it does, the model emits a tool call, the tool hits the Tavily API, and the result is streamed back to the model, which then generates its final answer using that data. `stopWhen: stepCountIs(5)` is what allows this "call tool → read result → answer" loop to happen in one turn instead of the stream ending right after the tool call.

**Where it lives:**
| Piece | File |
|---|---|
| Tool definition | `features/ai/tools/web-search.ts` |
| Wiring into the model | `app/api/chat/route.ts` |
| UI rendering (collapsible search card) | `components/ai-elements/tool.tsx` |
| Part-type switch in the message list | `features/conversation/components/chat-messages.tsx` |

**Design decisions worth knowing:**
- **No new database tables for tool calls.** The AI SDK's `UIMessage.parts` array already includes tool-call/tool-result parts alongside text parts, and `Message.parts` (a `Json` column) already stores that whole array. Wiring in a tool required zero schema changes — persistence came for free.
- **`execute()` never throws.** Search failures (bad API key, network error, non-2xx response) are caught and returned as `{ error: "..." }` instead of throwing, so a failed search surfaces as a visible error state in the tool card rather than crashing the whole stream.
- **The model decides when to search**, per the assignment spec — there's no keyword-matching or rule-based trigger. This is intentional and matches "allow the LLM to decide when to call the tool."

## Feature 2 — Chat Branching

**How it works:** A branch is not a separate concept from a conversation — it *is* a `Conversation` row, linked to its parent via a self-relation, seeded with a copy of the parent's messages up to the message you branched from. Branching from a message copies all prior messages (shared history), then the new conversation evolves independently from that point on.

**Schema (`prisma/schema.prisma`):**
```prisma
rootConversationId    String? // shared across every branch in a tree; null on the root itself
parentConversationId  String? // direct parent
branchPointMessageId  String? // which message this branch forked from

parent   Conversation?  @relation("ConversationBranches", fields: [parentConversationId], references: [id], onDelete: SetNull)
branches Conversation[] @relation("ConversationBranches")
```

**Where it lives:**
| Piece | File |
|---|---|
| Create branch / list tree | `features/conversation/actions/branch-actions.ts` |
| Client hooks | `features/conversation/hooks/use-branches.ts` |
| "Branch from here" hover action | `features/conversation/components/chat-messages.tsx` |
| Branch tree popover (switch/rename/delete) | `features/conversation/components/branch-nav.tsx` |

**Design decisions worth knowing:**
- **`rootConversationId` is denormalized onto every branch**, not just `parentConversationId`. This means finding "every conversation in this tree" is one flat `WHERE rootConversationId = X` query, instead of recursively walking `parentConversationId` up and down on every page load.
- **Rename/delete reuse the existing `updateConversation`/`deleteConversation` actions and `useUpdateConversation`/`useDeleteConversation` hooks** — no branch-specific rename/delete logic was written, since a branch is just a conversation.
- **Deleting a parent doesn't cascade-delete its branches** (`onDelete: SetNull`, not `Cascade`) — deleting the original conversation a branch came from shouldn't silently destroy conversations someone is actively using; the branch just loses its parent pointer.

## Project Structure

```
app/
  api/chat/route.ts          # streaming chat endpoint + tool wiring
  (root)/c/[id]/page.tsx     # conversation page
components/
  ai-elements/                # tool.tsx, message.tsx, conversation.tsx, loader.tsx
  ui/                          # shadcn primitives
features/
  ai/
    tools/web-search.ts       # Tavily-backed webSearch tool
    utils/model.ts
    actions/chat-store.ts     # loadChatMessages / saveChatMessages
  conversation/
    actions/
      conversation-actions.ts # CRUD for conversations
      branch-actions.ts       # createBranch / listBranchTree
    hooks/
      use-conversation.ts
      use-branches.ts
    components/
      app-sidebar.tsx
      conversation-view.tsx
      chat-messages.tsx
      branch-nav.tsx
prisma/
  schema.prisma
```

## Known limitations / possible follow-ups

- Web search results aren't cached — repeating a similar query mid-conversation re-hits the Tavily API each time.
- Branch rename uses a native `window.prompt` (matches the existing sidebar's rename UX) rather than an inline dialog.
- Branch delete has no confirmation step (matches the existing sidebar's delete UX, which is also a single click).

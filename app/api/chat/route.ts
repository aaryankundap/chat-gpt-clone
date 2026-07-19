import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
import { getChatModel } from "@/features/ai/utils/model";
import { webSearchTool } from "@/features/ai/tools/web-search";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import {
    convertToModelMessages,
    createIdGenerator,
    createUIMessageStreamResponse,
    stepCountIs,
    streamText,
    toUIMessageStream,
    type UIMessage,
} from "ai";

/**
 * POST /api/chat — Streams an AI assistant reply for a conversation.
 *
 * Validates auth and ownership, persists the user message, then streams the
 * assistant response via the AI SDK — optionally invoking the web search
 * tool mid-generation. Final messages (including tool calls/results) are
 * saved when the stream ends.
 */
export async function POST(req: Request) {
    await auth.protect();

    const { message, id }: { message: UIMessage, id: string } = await req.json();

    if (!message || !id) {
        return new Response("Missing message or conversation id", { status: 400 });
    }

    const user = await requireUser();

    const conversation = await prisma.conversation.findFirst({
        where: {
            id,
            userId: user.id
        }
    });

    if (!conversation) {
        return new Response("Conversation not found", { status: 404 });
    }

    const previousMessages = await loadChatMessages(id);

    const alreadySaved = previousMessages.some(
        (storedMessage) => storedMessage.id === message.id
    )

    const messages = alreadySaved ? previousMessages : [...previousMessages, message];

    if (!alreadySaved) {
        await saveChatMessages(id, [message]);
    }

    const result = streamText({
        model: getChatModel(conversation.model),
        system:
    conversation.systemPrompt ??
    `You are ChaiGpt, a helpful assistant. You have access to a webSearch tool — use it whenever the user asks about something recent, time-sensitive, or that you aren't confident about from memory.

    When writing mathematical expressions:
    - Always use LaTeX with $...$ for inline math and $$...$$ for block/display math — never \\( \\) or \\[ \\].
    - For a key formula being defined (not intermediate steps), wrap it in \\boxed{...} inside a $$...$$ block, e.g. $$\\boxed{f_r = \\frac{1}{2\\pi\\sqrt{LC}}}$$.
    - After a boxed formula, list each variable's meaning as a bullet, in the form "**symbol** = meaning (unit)".
    - Use bold for key terms and short section headers when a topic has multiple parts (e.g. definitions, derivation, related formulas).`,  
        messages: await convertToModelMessages(messages),
        tools: { webSearch: webSearchTool },
        // Without this, the stream ends right after a tool call resolves —
        // the model would never get a turn to actually answer using the
        // search results. stepCountIs(5) lets it: call the tool, read the
        // result, and generate a final answer (with headroom for a second
        // search if the model decides it needs one).
        stopWhen: stepCountIs(5),
    });

    result.consumeStream();

    return createUIMessageStreamResponse({
        stream: toUIMessageStream({
            stream: result.stream,
            originalMessages: messages,
            generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
            onEnd: async ({ messages: finalMessages }) => {
                try {
                    await saveChatMessages(id, finalMessages, { updateTitle: false })
                } catch (error) {
                    console.error(error);
                }
            }
        })
    })
}
"use client";

import { isTextUIPart, type UIMessage } from "ai";
import type { ChatStatus } from "ai";
import { GitBranchIcon } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
  MessageToolbar,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { useCreateBranch } from "@/features/conversation/hooks/use-branches";

type ChatMessagesProps = {
  conversationId: string;
  messages: UIMessage[];
  status: ChatStatus;
};

/**
 * Renders the conversation message list — markdown text parts, tool calls
 * (e.g. web search), a per-message "branch from here" action, and a
 * loading indicator.
 */
export function ChatMessages({
  conversationId,
  messages,
  status,
}: ChatMessagesProps) {
  const isWaiting =
    status === "submitted" && messages.at(-1)?.role === "user";

  const createBranch = useCreateBranch();
  const lastMessageId = messages.at(-1)?.id;

  return (
    <Conversation>
      <ConversationContent className="py-8">
        {messages.map((message) => {
          // Don't allow branching from a message that's still streaming —
          // there's no stable content to copy into the branch yet.
          const isStreamingNow =
            message.id === lastMessageId && status !== "ready";

          return (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, index) => {
                  if (isTextUIPart(part)) {
                    return (
                      <MessageResponse key={`${message.id}-text-${index}`}>
                        {part.text}
                      </MessageResponse>
                    );
                  }

                  // Static tool part for our single "webSearch" tool.
                  // (If you add more tools later, switch on part.type here.)
                  if (part.type === "tool-webSearch") {
                    return (
                      <Tool
                        key={`${message.id}-tool-${index}`}
                        defaultOpen={part.state === "output-error"}
                      >
                        <ToolHeader type={part.type} state={part.state} />
                        <ToolContent>
                          {part.input ? <ToolInput input={part.input} /> : null}
                          {part.state === "output-available" ? (
                            <ToolOutput output={part.output} />
                          ) : null}
                          {part.state === "output-error" ? (
                            <ToolOutput errorText={part.errorText} />
                          ) : null}
                        </ToolContent>
                      </Tool>
                    );
                  }

                  return null;
                })}
              </MessageContent>

              {!isStreamingNow ? (
                <MessageToolbar className="opacity-0 transition-opacity group-hover:opacity-100">
                  <MessageActions>
                    <MessageAction
                      tooltip="Branch from here"
                      label="Branch from here"
                      disabled={createBranch.isPending}
                      onClick={() =>
                        createBranch.mutate({
                          conversationId,
                          messageId: message.id,
                        })
                      }
                    >
                      <GitBranchIcon className="size-3.5" />
                    </MessageAction>
                  </MessageActions>
                </MessageToolbar>
              ) : null}
            </Message>
          );
        })}

        {isWaiting ? (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
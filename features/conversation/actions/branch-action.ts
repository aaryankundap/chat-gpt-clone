"use server";

import { assertOwnsConversation } from "@/features/conversation/actions/conversation-action";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/** A single node in a branch tree, as returned to the branch navigation UI. */
export type BranchTreeItem = {
    id: string;
    title: string;
    parentConversationId: string | null;
    branchPointMessageId: string | null;
    createdAt: Date;
};

/**
 * Creates a new conversation branched off `conversationId` at `messageId`.
 *
 * Copies every message up to and including `messageId` into the new
 * conversation, so the branch shares history up to that point but can
 * diverge independently from there on.
 *
 * @param conversationId - The conversation being branched from.
 * @param messageId - The message to branch from; history up to and
 * including this message is copied into the new branch.
 * @throws {Error} When the conversation or message is not found, or not
 * owned by the current user.
 */
export async function createBranch(conversationId: string, messageId: string) {
    const user = await requireUser();
    await assertOwnsConversation(conversationId, user.id);

    const source = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!source) {
        throw new Error("Conversation not found");
    }

    const cutIndex = source.messages.findIndex((m) => m.id === messageId);

    if (cutIndex === -1) {
        throw new Error("Message not found in conversation");
    }

    const messagesToCopy = source.messages.slice(0, cutIndex + 1);

    const branch = await prisma.conversation.create({
        data: {
            userId: user.id,
            title: `${source.title} (branch)`,
            model: source.model,
            systemPrompt: source.systemPrompt,
            rootConversationId: source.rootConversationId ?? source.id,
            parentConversationId: source.id,
            branchPointMessageId: messageId,
            messages: {
                create: messagesToCopy.map((m) => ({
                    role: m.role,
                    status: m.status,
                    content: m.content,
                    parts: m.parts ?? undefined,
                    metadata: m.metadata ?? undefined,
                })),
            },
        },
    });

    revalidatePath("/");
    return branch;
}

/**
 * Lists every conversation in the same branch tree as `conversationId`
 * (the root conversation plus every branch that shares its root), for
 * rendering a branch navigation UI.
 *
 * @param conversationId - Any conversation within the tree (root or branch).
 * @throws {Error} When the conversation is not found or not owned by the
 * current user.
 */
export async function listBranchTree(conversationId: string): Promise<BranchTreeItem[]> {
    const user = await requireUser();
    const current = await assertOwnsConversation(conversationId, user.id);

    const rootId = current.rootConversationId ?? current.id;

    return prisma.conversation.findMany({
        where: {
            userId: user.id,
            OR: [{ id: rootId }, { rootConversationId: rootId }],
        },
        select: {
            id: true,
            title: true,
            parentConversationId: true,
            branchPointMessageId: true,
            createdAt: true,
        },
        orderBy: { createdAt: "asc" },
    });
}
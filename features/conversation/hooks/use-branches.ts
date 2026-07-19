"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
    createBranch,
    listBranchTree,
} from "@/features/conversation/actions/branch-action";
import { queryKeys } from "../utils/query-keys";

/**
 * Fetches every conversation in the same branch tree as `conversationId`
 * (the root plus all of its branches), for the branch navigation UI.
 */
export function useBranchTree(conversationId?: string) {
    return useQuery({
        queryKey: queryKeys.branches.tree(conversationId ?? ""),
        queryFn: () => listBranchTree(conversationId as string),
        enabled: Boolean(conversationId),
    });
}

/**
 * Mutation hook to branch a conversation from a specific message and
 * navigate to the newly created branch.
 */
export function useCreateBranch() {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: ({
            conversationId,
            messageId,
        }: {
            conversationId: string;
            messageId: string;
        }) => createBranch(conversationId, messageId),
        onSuccess: (branch) => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });
            // Invalidate the tree under whichever id the branch resolved to
            // (its root), so both the source conversation's and the new
            // branch's tree views pick up the new node.
            void queryClient.invalidateQueries({
                queryKey: queryKeys.branches.tree(
                    branch.rootConversationId ?? branch.id
                ),
            });
            router.push(`/c/${branch.id}`);
            toast.success("Branch created");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Could not create branch");
        },
    });
}
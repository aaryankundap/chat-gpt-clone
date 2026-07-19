"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  GitBranchIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useBranchTree } from "@/features/conversation/hooks/use-branches";
import {
  useDeleteConversation,
  useUpdateConversation,
} from "@/features/conversation/hooks/use-conversation";
import type { BranchTreeItem } from "@/features/conversation/actions/branch-action";

type BranchNavProps = {
  conversationId: string;
};

/** Turns the flat tree list into parentId -> children[] for recursive rendering. */
function groupByParent(items: BranchTreeItem[]) {
  const map = new Map<string | null, BranchTreeItem[]>();
  for (const item of items) {
    const key = item.parentConversationId;
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }
  return map;
}

/**
 * Popover showing the full branch tree for the current conversation —
 * switch between branches, rename, or delete any of them. Renders nothing
 * if the conversation has no branches (tree of size 1).
 */
export function BranchNav({ conversationId }: BranchNavProps) {
  const { data: tree } = useBranchTree(conversationId);

  const byParent = useMemo(() => groupByParent(tree ?? []), [tree]);
  const roots = byParent.get(null) ?? [];

  if (!tree || tree.length <= 1) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <GitBranchIcon className="size-3.5" />
            {tree.length} branches
          </Button>
        }
      />
      <PopoverContent align="start" className="w-72 p-2">
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
          Branch tree
        </p>
        <div className="flex flex-col gap-0.5">
          {roots.map((node) => (
            <BranchNode
              key={node.id}
              node={node}
              depth={0}
              activeId={conversationId}
              byParent={byParent}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BranchNode({
  node,
  depth,
  activeId,
  byParent,
}: {
  node: BranchTreeItem;
  depth: number;
  activeId: string;
  byParent: Map<string | null, BranchTreeItem[]>;
}) {
  const children = byParent.get(node.id) ?? [];
  const isActive = node.id === activeId;

  const updateConversation = useUpdateConversation();
  const deleteConversation = useDeleteConversation(
    isActive ? node.id : undefined
  );

  /** Prompts for a new title and persists it. */
  function handleRename() {
    const next = window.prompt("Rename branch", node.title);
    if (!next || next.trim() === node.title) return;
    updateConversation.mutate({ id: node.id, title: next });
  }

  return (
    <div>
      <div
        className={cn(
          "group/branch flex items-center gap-1 rounded-md pr-1",
          isActive && "bg-accent"
        )}
        style={{ paddingLeft: depth * 14 }}
      >
        <Link
          href={`/c/${node.id}`}
          className={cn(
            "min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-sm hover:bg-accent",
            isActive && "font-medium"
          )}
        >
          {node.title}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover/branch:opacity-100"
              />
            }
          >
            <MoreHorizontalIcon className="size-3.5" />
            <span className="sr-only">Branch actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem onClick={handleRename}>
              <PencilIcon />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => deleteConversation.mutate(node.id)}
            >
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {children.map((child) => (
        <BranchNode
          key={child.id}
          node={child}
          depth={depth + 1}
          activeId={activeId}
          byParent={byParent}
        />
      ))}
    </div>
  );
}
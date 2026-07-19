-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "branchPointMessageId" TEXT,
ADD COLUMN     "parentConversationId" TEXT,
ADD COLUMN     "rootConversationId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_rootConversationId_idx" ON "Conversation"("rootConversationId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_parentConversationId_fkey" FOREIGN KEY ("parentConversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

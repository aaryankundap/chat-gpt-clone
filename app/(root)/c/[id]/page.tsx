import { loadChatMessages } from "@/features/ai/actions/chat-store";
import { getConversation } from "@/features/conversation/actions/conversation-action";
import { ConversationView } from "@/features/conversation/components/conversation-view";
import { notFound } from "next/navigation";
import React from "react";

type ConversationPageProps = {
    params: Promise<{id : string}>;
};

const page = async({params}:ConversationPageProps)=>{
    const {id}=await params;

    try {
        await getConversation(id)
    }
    catch(error){
        notFound()
    }

    const initialMessage = await loadChatMessages(id);



    return (
        <ConversationView
        key={id}
        conversationId={id}
        initialMessages={initialMessage}
        />
    )
}

export default page
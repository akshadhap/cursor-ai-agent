import { ConversationsView } from "@/chatbot/modules/dashboard/ui/views/conversations-view";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { ConversationIdView } from "@/chatbot/modules/dashboard/ui/views/conversation-id-view";

const Page = async ({
  params,
}: {
  params: Promise<{
    conversationId: string;
  }>;
}) => {
  const { conversationId } = await params;

  return <ConversationIdView conversationId= {conversationId as Id<"conversations">} />
};

export default Page;
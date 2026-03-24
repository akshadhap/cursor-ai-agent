import Image from "next/image";
import { PageHeader } from "@/components/page-header";

export const ConversationsView = () => {
  return (
    <div className="flex h-full flex-1 flex-col gap-y-4 bg-muted">
      <PageHeader title="Conversations" description="View and manage conversations" />

      <div className="flex flex-1 items-center justify-center gap-x-2">
        <Image alt="Logo" height={40} width={40} src="/logo.png" />
        <p className="font-semibold text-lg">View your conversations here</p>
      </div>
    </div>
  );
};

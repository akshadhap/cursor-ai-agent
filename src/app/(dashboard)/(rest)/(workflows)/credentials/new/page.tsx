import { CredentialForm } from "@/features/credentials/components/credential";
import { requireAuth } from "@/lib/auth-utils";
import { CredentialType } from "@/generated/prisma";
import { SearchParams } from "nuqs";

type Props = {
  searchParams: Promise<SearchParams>;
};

const Page = async ({ searchParams }: Props) => {
  await requireAuth();
  const params = await searchParams;
  const preSelectedType = params.type as CredentialType | undefined;

  return (
    <div className="p-4 md:px-10 md:py-6 h-full">
      <div className="mx-auto max-w-screen-md w-full flex flex-col gap-y-8 h-full">
        <CredentialForm preSelectedType={preSelectedType} />
      </div>
    </div>
  );
}

export default Page;


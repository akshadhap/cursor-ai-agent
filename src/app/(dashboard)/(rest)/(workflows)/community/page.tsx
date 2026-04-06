// src/app/(dashboard)/(rest)/community/page.tsx
import { requireAuth } from "@/lib/auth-utils";
import { CommunityClient } from "./community-client";

const Page = async () => {
  // server-side auth check
  await requireAuth();

  return <CommunityClient />;
};

export default Page;

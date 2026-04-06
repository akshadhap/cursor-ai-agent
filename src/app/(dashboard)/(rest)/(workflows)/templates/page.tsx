// src/app/(dashboard)/(rest)/templates/page.tsx
import { requireAuth } from "@/lib/auth-utils";
import { TemplatesClient } from "./templates-client";

const Page = async () => {
  // server-side auth check (same as workflows/credentials pages)
  await requireAuth();

  return <TemplatesClient />;
};

export default Page;

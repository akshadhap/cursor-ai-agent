import { requireAuth } from "@/lib/auth-utils";

const Layout = async ({ children }: { children: React.ReactNode; }) => {
  await requireAuth();

  return <>{children}</>;
};

export default Layout;

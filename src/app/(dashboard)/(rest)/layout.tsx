"use client";

import { AppHeader } from "@/components/app-header";
import { usePathname } from "next/navigation";

const Layout = ({ children }: { children: React.ReactNode; }) => {
  const pathname = usePathname();
  const isLandingPage = pathname.endsWith('-landing');
  const hideHeader = pathname === "/admin/billing" || pathname === "/admin/catalogue";

  return (
    <>
      {!isLandingPage && !hideHeader && <AppHeader />}
      <main className="flex-1">{children}</main>
    </>
  );
};

export default Layout;

"use client"

import { AppSidebar } from "@/components/app-sidebar";
import { AuthTokenSync } from "@/components/AuthTokenSync";
import { SyncSessionToTokenStore } from "@/components/SyncSessionToTokenStore";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation";


const Layout = ({ children }: { children: React.ReactNode; }) => {
  const pathname = usePathname();
  const hideSidebar = pathname === "/admin/billing" || pathname === "/admin/catalogue";

  return (
    <SidebarProvider defaultOpen={false}>
      <SyncSessionToTokenStore />
      {!hideSidebar && <AppSidebar />}
      <SidebarInset className="bg-accent/20">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;

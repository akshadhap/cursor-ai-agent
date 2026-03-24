"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const AppHeader = () => {
  const pathname = usePathname();
  const isLandingPage = pathname.endsWith('-landing');

  return (
    <header className={cn(
      "sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b px-4",
      isLandingPage ? "bg-black border-white/10" : "bg-background"
    )}>
      {!isLandingPage && <SidebarTrigger />}
      <div className="ml-auto flex items-center gap-2">
      </div>
    </header>
  );
};

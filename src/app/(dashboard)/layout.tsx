"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { HeaderBar } from "@/components/layout/header-bar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useServerConfig } from "@/hooks/use-server-config";
import { useCallback } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useServerConfig();

  const handleMoveClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent("r2-move-request"));
  }, []);

  const handleShareClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent("r2-share-request"));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <HeaderBar />
      <SidebarProvider className="!min-h-0 flex-1 overflow-hidden relative [&_[data-slot=sidebar-container]]:!fixed [&_[data-slot=sidebar-container]]:!top-11 [&_[data-slot=sidebar-container]]:!h-[calc(100svh-2.75rem)]">
        <AppSidebar />
        <SidebarInset>
          <AppHeader
            onMoveClick={handleMoveClick}
            onShareClick={handleShareClick}
          />
          <main className="flex-1 overflow-auto">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

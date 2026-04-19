"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { formatBucketName } from "@/lib/file-utils";
import { useAppStore } from "@/stores/app-store";
import { BarChart3, Folder, Link2 } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export function AppSidebar() {
  const { buckets } = useAppStore();
  const params = useParams();
  const pathname = usePathname();
  const currentBucket = params.bucket as string | undefined;
  const isSharesPage = pathname === "/shares";
  const isAnalyticsPage = pathname.startsWith("/analytics");

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="flex-row items-center px-2 pt-2 pb-0">
        <SidebarTrigger className="text-text-tertiary hover:text-text-primary" />
      </SidebarHeader>
      <SidebarContent className="px-2 pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-label">
            Buckets
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {buckets.map((bucket) => {
                const active = currentBucket === bucket.name;
                return (
                  <SidebarMenuItem key={bucket.name}>
                    <SidebarMenuButton
                      isActive={active}
                      render={<Link href={`/${bucket.name}`} />}
                      className={`gap-2.5 rounded-[10px] px-3 py-[7px] text-[15px] transition-[background-color] duration-150 ${
                        active
                          ? "bg-sidebar-active text-text-primary font-medium hover:bg-sidebar-active-hover"
                          : "text-text-primary font-normal hover:bg-sidebar-hover"
                      }`}
                    >
                      <Folder className="h-4 w-4 text-icon-folder" />
                      <span>{formatBucketName(bucket.name)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {buckets.length === 0 && (
                <div className="px-3 py-2 text-[13px] text-text-secondary">
                  No buckets found
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isSharesPage}
                  render={<Link href="/shares" />}
                  className={`gap-2.5 rounded-[10px] px-3 py-[7px] text-[15px] transition-[background-color] duration-150 ${
                    isSharesPage
                      ? "bg-sidebar-active text-text-primary font-medium hover:bg-sidebar-active-hover"
                      : "text-text-primary font-normal hover:bg-sidebar-hover"
                  }`}
                >
                  <Link2 className="h-4 w-4 text-text-secondary" />
                  <span>Shared Links</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isAnalyticsPage}
                  render={<Link href="/analytics" />}
                  className={`gap-2.5 rounded-[10px] px-3 py-[7px] text-[15px] transition-[background-color] duration-150 ${
                    isAnalyticsPage
                      ? "bg-sidebar-active text-text-primary font-medium hover:bg-sidebar-active-hover"
                      : "text-text-primary font-normal hover:bg-sidebar-hover"
                  }`}
                >
                  <BarChart3 className="h-4 w-4 text-text-secondary" />
                  <span>Analytics</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}


import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, Brain, ChartNoAxesCombined, Settings, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

export const NAV = [
  { to: "/", label: "Journal", icon: BookOpen, match: (p: string) => p === "/" || p.startsWith("/session") },
  { to: "/techniques", label: "Techniques", icon: Swords, match: (p: string) => p.startsWith("/techniques") || p.startsWith("/review") },
  { to: "/progress", label: "Progress", icon: ChartNoAxesCombined, match: (p: string) => p.startsWith("/progress") },
  { to: "/coach", label: "Coach", icon: Brain, match: (p: string) => p.startsWith("/coach") },
  { to: "/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/settings") },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2 px-2">
      <span className="squircle flex size-8 items-center justify-center bg-primary text-primary-foreground text-label">ML</span>
      <span className="text-title">Mat Log</span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="hidden md:flex">
        <SidebarHeader className="py-4">
          <Wordmark />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton isActive={item.match(pathname)} tooltip={item.label} className="rounded-full" render={<NavLink to={item.to} />}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="px-4 py-4 text-text-faint text-xs group-data-[collapsible=icon]:hidden">Local only. Your data never leaves this device.</SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <main className="mx-auto w-full max-w-4xl px-4 pt-4 pb-28 md:px-8 md:pt-10 md:pb-16">{children}</main>
        <MobileNav pathname={pathname} />
      </SidebarInset>
    </SidebarProvider>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden pointer-events-none">
      <div className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-full bg-surface p-1.5">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={cn(
                "flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              <span className={cn(active ? "block" : "hidden")}>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

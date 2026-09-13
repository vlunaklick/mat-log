import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { CalendarCheck, Route, BookOpen, Brain, ChartNoAxesCombined, LogOut, Settings, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/main";
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

async function handleSignOut() {
  await authClient.signOut();
  queryClient.clear();
}

// `mobile: false` items stay in the desktop sidebar; on phones they are reached from Diario (Progreso) and Hoy (Perfil).
export const NAV = [
  { to: "/", label: "Hoy", icon: CalendarCheck, mobile: true, match: (p: string) => p === "/" },
  { to: "/journal", label: "Diario", icon: BookOpen, mobile: true, match: (p: string) => p.startsWith("/journal") || p.startsWith("/session") || p.startsWith("/drafts") },
  { to: "/coach", label: "Coach", icon: Brain, mobile: true, match: (p: string) => p.startsWith("/coach") },
  { to: "/techniques", label: "Técnicas", icon: Swords, mobile: true, match: (p: string) => p.startsWith("/techniques") || p.startsWith("/review") || p.startsWith("/explore") },
  { to: "/gameplan", label: "Mi juego", icon: Route, mobile: true, match: (p: string) => p.startsWith("/gameplan") },
  { to: "/progress", label: "Progreso", icon: ChartNoAxesCombined, mobile: false, match: (p: string) => p.startsWith("/progress") },
  { to: "/settings", label: "Perfil", icon: Settings, mobile: false, match: (p: string) => p.startsWith("/settings") },
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
                    <SidebarMenuButton isActive={item.match(pathname)} tooltip={item.label} className="rounded-full" render={<NavLink to={item.to} end={item.to === "/"} />}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="px-2 py-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Salir" className="rounded-full" onClick={handleSignOut}>
                <LogOut />
                <span>Salir</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
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
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden pointer-events-none">
      <div className="pointer-events-auto flex w-full max-w-lg items-center justify-between gap-1 rounded-full bg-surface p-1">
        {NAV.filter((item) => item.mobile || item.match(pathname)).map((item) => {
          const active = item.match(pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-13 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors duration-150",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-5" />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

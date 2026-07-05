import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  Package,
  Receipt,
  ShieldCheck,
  Send,
  Tags,
  BarChart3,
  Settings,
  Bed,
  AlertTriangle,
  Pill,
  Package2,
  FlaskConical,
  Image,
  CreditCard,
  FileText,
  Layers,
  ChevronLeft,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useStore } from "@/lib/store";
import { getSession } from "@/lib/auth/authService";
import { resolveAccessUser, userCanAccessPage } from "@/lib/pageAccess";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Appointments", url: "/appointments", icon: Calendar },
];
const opsItems = [
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Billing", url: "/billing", icon: Receipt },
  { title: "PhilHealth", url: "/philhealth", icon: ShieldCheck },
  { title: "eClaims Monitoring", url: "/eclaims-monitoring", icon: Send },
  { title: "PhilHealth Case Rates", url: "/pricelist", icon: Tags },
];
const clinicalItems = [
  { title: "Admission", url: "/admission", icon: Bed },
  { title: "Emergency Room", url: "/er", icon: AlertTriangle },
  { title: "OPD", url: "/opd", icon: Stethoscope },
  { title: "Pharmacy", url: "/pharmacy", icon: Pill },
  { title: "Supplies", url: "/supplies", icon: Package2 },
  { title: "Laboratory", url: "/laboratory", icon: FlaskConical },
  { title: "Radiology", url: "/radiology", icon: Image },
  { title: "Miscellaneous", url: "/miscellaneous", icon: Layers },
  { title: "Cashier", url: "/cashier", icon: CreditCard },
  { title: "Medical Records", url: "/medical-records", icon: FileText },
];
const adminItems = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

const labelMotion = (iconOnly: boolean) =>
  cn(
    "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out",
    iconOnly ? "pointer-events-none w-0 max-w-0 min-w-0 opacity-0" : "max-w-[12rem] opacity-100"
  );

export function AppSidebar() {
  const { contentExpanded, sidebarHovered, setSidebarHovered, toggleSidebar } = useSidebar();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { logout, state: store } = useStore();

  // KEEP: main-dashboard expand. See .cursor/rules/sidebar-dashboard-expand.mdc
  // Expand mode + not hovered: icon rail in-flow (dashboard connected).
  // Expand mode + hovered: full sidebar overlays (dashboard behind).
  const iconOnly = contentExpanded && !sidebarHovered;
  const overlayExpanded = contentExpanded && sidebarHovered;
  const sidebarWidth = iconOnly ? "var(--sidebar-width-icon)" : "var(--sidebar-width)";

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const sessionUser = getSession()?.user;
  const authedUserDetail = store.users.find(
    (u) => u.username.toLowerCase() === store.authedUser?.toLowerCase()
  );
  const accessUser = resolveAccessUser(store, sessionUser);
  const fullName =
    sessionUser?.fullName || authedUserDetail?.fullName || store.authedUser || "User";
  const role = sessionUser?.role || authedUserDetail?.role || "Staff";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const filterItems = <T extends { url: string }>(items: T[]) =>
    items.filter((item) => userCanAccessPage(accessUser, item.url));

  const visibleMain = filterItems(mainItems);
  const visibleOps = filterItems(opsItems);
  const visibleClinical = filterItems(clinicalItems);
  const visibleAdmin = filterItems(adminItems);

  const renderGroup = (label: string, items: typeof mainItems) => {
    if (items.length === 0) return null;
    return (
    <SidebarGroup className={cn(iconOnly ? "w-auto items-center px-0 py-1" : "p-2")}>
      <SidebarGroupLabel
        className={cn(
          "transition-[max-height,opacity,margin,padding] duration-300 ease-in-out",
          iconOnly ? "pointer-events-none max-h-0 m-0 overflow-hidden p-0 opacity-0" : "max-h-8 opacity-100"
        )}
      >
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent className={cn(iconOnly && "flex flex-col items-center")}>
        <SidebarMenu className={cn(iconOnly && "items-center")}>
          {items.map((item) => (
            <SidebarMenuItem
              key={item.url}
              className={cn(iconOnly && "flex w-full justify-center")}
            >
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
                className={cn(
                  iconOnly &&
                    "!mx-auto !flex !size-8 !min-w-8 !max-w-8 !items-center !justify-center !gap-0 !p-0"
                )}
              >
                <Link
                  to={item.url}
                  className={cn(
                    "flex items-center",
                    iconOnly ? "size-8 justify-center gap-0" : "w-full gap-2"
                  )}
                  title={item.title}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {!iconOnly && (
                    <span className={labelMotion(false)}>{item.title}</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
    );
  };

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden bg-sidebar transition-[width,box-shadow] duration-300 ease-in-out will-change-[width]",
        // Only overlay when fully expanded on hover; icon rail stays in-flow (connected).
        overlayExpanded && "fixed inset-y-0 left-0 z-30 shadow-xl"
      )}
      style={{ width: sidebarWidth }}
      onMouseEnter={() => {
        if (contentExpanded) setSidebarHovered(true);
      }}
      onMouseLeave={() => {
        if (contentExpanded) setSidebarHovered(false);
      }}
    >
      <Sidebar collapsible="none" className="h-full w-full">
        <SidebarHeader>
          <div
            className={cn(
              "flex items-center py-3 transition-[padding,justify-content] duration-300 ease-in-out",
              iconOnly ? "justify-center px-0" : "justify-between gap-2 px-3"
            )}
          >
            <div
              className={cn(
                "flex min-w-0 flex-col transition-[max-width,opacity] duration-300 ease-in-out",
                iconOnly ? "pointer-events-none max-w-0 overflow-hidden opacity-0" : "max-w-[12rem] opacity-100"
              )}
            >
              <span className="truncate text-sm font-semibold leading-tight text-white">
                {store.hospital.name}
              </span>
              <span className="mt-0.5 text-xs font-medium text-slate-400">Admin Panel</span>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={
                contentExpanded ? "Restore default layout" : "Expand main dashboard"
              }
              title={contentExpanded ? "Restore default layout" : "Expand main dashboard"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-300 transition-transform duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <span
                className={cn(
                  "inline-flex transition-transform duration-300 ease-in-out",
                  contentExpanded && "rotate-180"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </span>
            </button>
          </div>
        </SidebarHeader>
        <SidebarContent className={cn(iconOnly && "items-center")}>
          {renderGroup("Main", visibleMain)}
          {renderGroup("Operations", visibleOps)}
          {renderGroup("Hospital Services", visibleClinical)}
          {renderGroup("Administration", visibleAdmin)}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border bg-sidebar-accent/10">
          <div
            className={cn(
              "flex flex-col transition-[padding,align-items,gap] duration-300 ease-in-out",
              iconOnly ? "items-center gap-3 px-0 py-3" : "gap-3 p-3"
            )}
          >
            <div
              className={cn(
                "flex items-center transition-[gap] duration-300 ease-in-out",
                iconOnly ? "gap-0" : "gap-3"
              )}
            >
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full bg-[#1b5e20] font-bold text-white transition-[width,height,font-size] duration-300 ease-in-out",
                  iconOnly ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
                )}
                title={iconOnly ? `${fullName} (${role})` : undefined}
              >
                {initials}
              </div>
              <div
                className={cn(
                  "flex min-w-0 flex-col transition-[max-width,opacity] duration-300 ease-in-out",
                  iconOnly ? "max-w-0 overflow-hidden opacity-0" : "max-w-[10rem] opacity-100"
                )}
              >
                <span className="truncate text-sm font-semibold leading-snug text-white">
                  {fullName}
                </span>
                <span className="mt-0.5 truncate text-xs leading-none text-slate-400">{role}</span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className={cn(
                "flex cursor-pointer items-center text-slate-400 transition-[gap] duration-300 ease-in-out focus:outline-none",
                iconOnly ? "gap-0" : "mt-1 w-fit gap-1.5 text-xs font-medium"
              )}
            >
              {iconOnly ? (
                <LogOut className="h-4 w-4 shrink-0" />
              ) : (
                <>
                  <span>←</span>
                  <span className={labelMotion(false)}>Sign out</span>
                </>
              )}
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}

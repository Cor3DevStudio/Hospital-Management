import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  Navigate,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider, useStore } from "../lib/store";
import { mergeDatabaseIntoState } from "../lib/services/syncService";
import { pauseAutoSync, resumeAutoSync } from "../lib/services/autoSyncService";
import { fetchAuthSessionData } from "../lib/services/userService";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { firstAllowedPage, resolveAccessUser, userCanAccessPage } from "@/lib/pageAccess";
import { getSession } from "@/lib/auth/authService";
import { SunMoon } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hospital CMS — Administrator" },
      {
        name: "description",
        content: "Hospital management system: patients, appointments, billing, PhilHealth eClaims.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <AppShell />
        <Toaster richColors position="top-right" />
      </StoreProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { state, setState } = useStore();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!state.authedUser) return;

    let cancelled = false;
    void (async () => {
      try {
        const { users, clinicalPayload, clinicalUpdatedAt } = await fetchAuthSessionData();
        if (cancelled) return;
        const preferDatabase = Boolean(clinicalUpdatedAt);
        pauseAutoSync();
        setState((current) =>
          mergeDatabaseIntoState(
            { ...current, users: users.length > 0 ? users : current.users },
            clinicalPayload,
            { preferDatabase },
          ),
        );
        resumeAutoSync();
      } catch {
        // Offline — keep local users/session
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.authedUser, setState]);

  // Public routes (no app shell / auth required)
  if (pathname === "/login" || pathname === "/register" || pathname.startsWith("/api/")) {
    return <Outlet />;
  }
  if (!state.authedUser) return <Navigate to="/login" />;

  return (
    <SidebarProvider defaultOpen>
      <AuthenticatedLayout />
    </SidebarProvider>
  );
}

function AuthenticatedLayout() {
  const { state } = useStore();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const sessionUser = getSession()?.user;
  const accessUser = resolveAccessUser(state, sessionUser);

  const homePath = firstAllowedPage(accessUser);

  if (!accessUser) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading your access profile…
      </div>
    );
  }

  if (pathname === "/") {
    return <Navigate to={homePath} />;
  }

  if (!userCanAccessPage(accessUser, pathname)) {
    return <Navigate to={homePath} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-card/80 px-3 backdrop-blur">
          <span className="text-sm font-medium text-muted-foreground">Administrator Console</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { setDarkMode, isDark } = useStore();
  return (
    <button
      onClick={() => setDarkMode(!isDark)}
      className="rounded p-1 hover:bg-muted flex items-center gap-2"
    >
      <SunMoon className="h-5 w-5" />
    </button>
  );
}

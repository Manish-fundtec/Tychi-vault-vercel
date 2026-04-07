import { NavLink, Outlet } from "react-router-dom";
import { Database, GitCompareArrows, Mail, Settings, Upload, Users } from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/vault/inbox", label: "Inbox", icon: Upload },
  { to: "/vault/filing", label: "Filing Cabinet", icon: Database },
  { to: "/vault/email", label: "Setup Email", icon: Mail },
  { to: "/vault/accounts", label: "Setup Accounts", icon: Users },
  { to: "/vault/mappings", label: "Mappings", icon: GitCompareArrows },
  { to: "/vault/settings", label: "Settings", icon: Settings, disabled: true }
];
export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-60 shrink-0 border-r border-border bg-[hsl(var(--sidebar))] px-4 py-6">
        <div className="mb-8 rounded-2xl bg-[hsl(var(--sidebar-muted))] px-3 py-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Tychi</p>
          <div className="mt-1 flex items-center justify-between">
            <h1 className="text-base font-semibold leading-none text-[hsl(var(--sidebar-foreground))]">Vault</h1>
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">Prod</span>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.disabled ? "#" : item.to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  "text-muted-foreground hover:bg-[hsl(var(--sidebar-muted))] hover:text-foreground",
                  isActive && !item.disabled && "bg-[hsl(var(--sidebar-muted))] text-foreground",
                  item.disabled && "pointer-events-none opacity-40"
                )
              }
            >
              <item.icon className="h-4 w-4 opacity-80 group-hover:opacity-100" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-10 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
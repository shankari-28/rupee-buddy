import { Link, useLocation } from "react-router-dom";
import { Home, Plus, History, User, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/add", icon: Plus, label: "Add" },
  { path: "/advisor", icon: Brain, label: "Advisor" },
  { path: "/history", icon: History, label: "History" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", path === "/add" && "h-6 w-6")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

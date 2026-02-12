import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Clipboard, FolderOpen, Gavel, Sparkles, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Clipboard", path: "/", icon: Clipboard },
  { label: "Rules", path: "/rules", icon: Gavel },
  { label: "Folders", path: "/folders", icon: FolderOpen },
  { label: "Predictions", path: "/predictions", icon: Sparkles },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function AppNav() {
  const [location] = useLocation();
  return (
    <div className="w-full border-b border-border/50 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500" />
          <div>
            <p className="text-sm font-semibold">ClipSync</p>
            <p className="text-xs text-muted-foreground">Clipboard Sync Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.path;
            return (
              <Button
                key={item.path}
                asChild
                variant={active ? "secondary" : "ghost"}
                size="sm"
                className={cn("gap-2", active && "text-foreground")}
              >
                <Link href={item.path}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

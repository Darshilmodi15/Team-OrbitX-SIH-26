import React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/lib/orca/theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "dropdown" | "pills";
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = "icon",
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === "pills") {
    return (
      <div className={cn("inline-flex items-center rounded-lg border border-border bg-card p-1 text-xs", className)}>
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors cursor-pointer",
            theme === "light"
              ? "bg-secondary text-secondary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Sun className="size-3.5" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors cursor-pointer",
            theme === "dark"
              ? "bg-secondary text-secondary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Moon className="size-3.5" />
          <span>Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors cursor-pointer",
            theme === "system"
              ? "bg-secondary text-secondary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Monitor className="size-3.5" />
          <span>System</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={resolvedTheme === "dark" ? "Switch to Light theme (Daylight)" : "Switch to Dark theme (Moonlit)"}
      aria-label="Toggle Theme"
      className={cn(
        "relative inline-flex size-10 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105 active:scale-95 cursor-pointer shadow-sm",
        className
      )}
    >
      {/* Animated Sun & Moon Icons */}
      <Sun
        className={cn(
          "size-4.5 text-amber-300 transition-all duration-500 ease-out transform",
          resolvedTheme === "dark"
            ? "rotate-90 scale-0 opacity-0 absolute"
            : "rotate-0 scale-100 opacity-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
        )}
      />
      <Moon
        className={cn(
          "size-4.5 text-sky-200 transition-all duration-500 ease-out transform",
          resolvedTheme === "dark"
            ? "rotate-0 scale-100 opacity-100 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
            : "-rotate-90 scale-0 opacity-0 absolute"
        )}
      />
    </button>
  );
};

"use client";

import { useState, useCallback, useEffect } from "react";
import { Bell, Search, Menu, LogOut, Settings, KeyRound, Moon, Sun, Monitor, Repeat } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/store/authStore";
import { useWalletStore } from "@/lib/store/walletStore";
import { useRouter } from "next/navigation";
import { useNotify } from "@/lib/hooks/useNotify";

interface TopbarProps {
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
  title?: string;
  unreadNotificationCount?: number;
}

export const Topbar = ({ onMenuClick, isMenuOpen, title, unreadNotificationCount = 0 }: TopbarProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const notify = useNotify();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const notificationLabel =
    unreadNotificationCount > 0
      ? `Notifications (${unreadNotificationCount} unread)`
      : "Notifications";

  const handleLogout = useCallback(() => {
    logout();
    notify.success("Logged out successfully");
    router.push("/auth/login");
  }, [logout, notify, router]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDark = isMounted && resolvedTheme === "dark";

  const themeIcon = !isMounted ? null : theme === "system"
    ? <Monitor className="h-4.5 w-4.5" />
    : isDark
      ? <Sun className="h-4.5 w-4.5" />
      : <Moon className="h-4.5 w-4.5" />;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "MC";

  const walletNetwork = useWalletStore((s) => s.network);
  const setNetwork = useWalletStore((s) => s.setNetwork);
  const isTestnet = walletNetwork === 'testnet';
  const isDev = process.env.NODE_ENV === 'development';

  const handleToggleNetwork = useCallback(() => {
    setNetwork(isTestnet ? 'public' : 'testnet');
  }, [isTestnet, setNetwork]);

  return (
    <header
      role="banner"
      className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm shadow-muted/50"
    >
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]"
          onClick={onMenuClick}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle mobile menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {title && (
          <h1 className="text-lg font-semibold tracking-tight hidden md:block text-foreground">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3 flex-1 justify-end">


        {/* Network Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/50 text-xs font-medium">
          <span
            className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-400' : 'bg-green-500'}`}
            aria-hidden="true"
          />
          <span className="text-foreground">
            {isTestnet ? 'Testnet' : 'Mainnet'}
          </span>
          {isDev && (
            <button
              onClick={handleToggleNetwork}
              className="ml-1 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Switch to ${isTestnet ? 'Mainnet' : 'Testnet'}`}
              title={`Switch to ${isTestnet ? 'Mainnet' : 'Testnet'}`}
            >
              <Repeat className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={notificationLabel}
          className="relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl min-h-[44px] min-w-[44px]"
        >
          <Bell className="h-4.5 w-4.5" />
          <span aria-hidden="true" className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-background"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Select theme"
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl min-h-[44px] min-w-[44px]"
            >
              {themeIcon}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-border">
            <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer rounded-lg">
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer rounded-lg">
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer rounded-lg">
              <Monitor className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="relative min-h-[44px] min-w-[44px] rounded-xl p-0 hover:bg-muted"
                aria-expanded={isDropdownOpen}
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage
                    src="/avatars/01.png"
                    alt={user?.name ?? "User"}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent
            className="w-56 border-border shadow-dropdown rounded-xl mt-1"
            align="end"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1 py-1">
                <p className="text-sm font-semibold text-foreground leading-none">
                  {user?.name ?? "Merchant User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  {user?.email ?? "merchant@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-muted" />
            <DropdownMenuItem
              className="flex items-center gap-2 text-muted-foreground cursor-pointer rounded-lg"
              onClick={() => router.push("/settings")}
            >
              <Settings className="w-4 h-4" /> Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 text-muted-foreground cursor-pointer rounded-lg"
              onClick={() => router.push("/developers")}
            >
              <KeyRound className="w-4 h-4" /> API Keys
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-muted" />
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

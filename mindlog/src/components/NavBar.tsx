"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { useState } from "react";

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("mindlog_user_email");
    localStorage.removeItem("mindlog_user_id");
    router.push("/auth/login");
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/home" className="text-xl text-foreground">
            MindLog
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/home"
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive("/home")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/30"
              }`}
            >
              Home
            </Link>
            <Link
              href="/journal"
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive("/journal")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/30"
              }`}
            >
              Journal
            </Link>
            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive("/dashboard")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/30"
              }`}
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-10 h-10 rounded-full bg-secondary/40 text-secondary-foreground flex items-center justify-center hover:bg-secondary/60 transition-colors"
          >
            <User className="w-5 h-5" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border py-2 z-10">
              <button className="w-full px-4 py-2 text-left text-foreground hover:bg-muted/30 flex items-center gap-2 transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-foreground hover:bg-muted/30 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

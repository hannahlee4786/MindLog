"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import NavBar from "@/components/NavBar";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
        router.push("/auth/login");
      }
    };

    verifyAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <Dashboard />
    </div>
  );
}

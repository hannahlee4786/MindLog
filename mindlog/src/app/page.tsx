"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const userEmail = localStorage.getItem("mindlog_user_email");
    if (userEmail) {
      router.push("/home");
    } else {
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">MindLog</h1>
        <p className="text-gray-600 mt-2">Loading...</p>
      </div>
    </div>
  );
}

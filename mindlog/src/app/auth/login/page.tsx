"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!email || !password) {
        setError("Please fill in all fields");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Store user info in localStorage for quick access
      localStorage.setItem("mindlog_user_email", data.user.email);
      localStorage.setItem("mindlog_user_id", data.user.id);
      localStorage.setItem("mindlog_user_name", data.user.display_name);

      // Redirect to home
      router.push("/home");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl w-full">
        {/* Left Side - Branding */}
        <div className="flex flex-col justify-center">
          <h1 className="text-5xl font-bold text-foreground mb-4">MindLog</h1>
          <p className="text-xl text-foreground/70 mb-8">
            Stress-aware journaling that meets you where you are.
          </p>
          <ul className="space-y-4 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">•</span>
              <span>10-second daily stress snapshot via your webcam</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">•</span>
              <span>AI companion that responds to how you actually feel</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">•</span>
              <span>Patterns, themes, and progress over time</span>
            </li>
          </ul>
          <p className="text-sm text-foreground/50 mt-8">
            <strong>Privacy & data use</strong> — Your webcam is only used once per day for stress snapshots. No video is stored.
          </p>
        </div>

        {/* Right Side - Login Form */}
        <div className="bg-card rounded-lg shadow-xl p-8 border border-border">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Welcome back
          </h2>
          <p className="text-muted-foreground mb-6">Sign in to continue your journey</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-border bg-input-background text-foreground placeholder-muted-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-border bg-input-background text-foreground placeholder-muted-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-3">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-2 px-4 rounded-lg transition mt-6"
            >
              {isLoading ? "Signing in..." : "Continue"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                href="/auth/signup"
                className="text-primary hover:text-primary/90 font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const errors: typeof validationErrors = {};

    if (!displayName.trim()) {
      errors.displayName = "Display name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email format";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      // Store user info in localStorage for quick access
      localStorage.setItem("mindlog_user_email", data.user.email);
      localStorage.setItem("mindlog_user_id", data.user.id);
      localStorage.setItem("mindlog_user_name", data.user.display_name);

      // Redirect to home on success
      router.push("/home");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Signup error:", err);
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
              <span>AI-guided conversations tailored to your stress level</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">•</span>
              <span>Music recommendations based on your mood</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">•</span>
              <span>Track patterns and get personalized insights</span>
            </li>
          </ul>
        </div>

        {/* Right Side - Form */}
        <div className="flex flex-col justify-center">
          <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-6">Create Account</h2>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors bg-input-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    validationErrors.displayName
                      ? "border-destructive"
                      : "border-border"
                  }`}
                  placeholder="John Doe"
                />
                {validationErrors.displayName && (
                  <p className="mt-1 text-xs text-destructive">
                    {validationErrors.displayName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors bg-input-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    validationErrors.email
                      ? "border-destructive"
                      : "border-border"
                  }`}
                  placeholder="you@example.com"
                />
                {validationErrors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors bg-input-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    validationErrors.password
                      ? "border-destructive"
                      : "border-border"
                  }`}
                  placeholder="At least 8 characters"
                />
                {validationErrors.password && (
                  <p className="mt-1 text-xs text-destructive">
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors bg-input-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    validationErrors.confirmPassword
                      ? "border-destructive"
                      : "border-border"
                  }`}
                  placeholder="Confirm your password"
                />
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-destructive">
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? "Creating Account..." : "Sign Up"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-primary hover:text-primary/90 font-medium transition-colors"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

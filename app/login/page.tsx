"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Brand } from "@/components/brand";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function LoginPageClient({ searchIdentity }: { searchIdentity: string | null }) {
  const router = useRouter();
  const [identity, setIdentity] = useState(searchIdentity ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string>("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!identity.trim()) {
      setError("Please enter your username or phone number.");
      setLoading(false);
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const isPhone = /^[\+]?[0-9]{7,15}$/.test(identity.trim());

      if (isPhone) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: identity.trim(),
        });
        if (otpError) {
          setError("Invalid credentials. Please check your phone number and try again.");
        } else {
          setSuccess("OTP sent! Please check your phone for the verification code.");
        }
      } else {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: identity.trim(),
          password: password.trim(),
        });

        if (authError) {
          setError("Invalid credentials. Please check your email and password.");
          setLoading(false);
          return;
        }

        if (authData?.session) {
          const token = authData.session.access_token;

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, role, status")
            .eq("id", authData.user?.id)
            .single();

          if (!profile) {
            setError("Profile not found. Please contact your administrator.");
            setLoading(false);
            return;
          }

          sessionStorage.setItem(
            "sb_session",
            JSON.stringify({
              token,
              user: {
                id: authData.user.id,
                email: authData.user.email,
                phone: authData.user.phone,
                fullName: profile.full_name,
                role: profile.role,
                status: profile.status,
              },
            })
          );

          const roleRoutes: Record<string, string> = {
            admin: "/dashboard",
            loan_officer: "/dashboard",
            field_officer: "/clients",
            savings_member: "/savings",
          };

          const redirectPath = roleRoutes[profile.role as keyof typeof roleRoutes] ?? "/dashboard";
          router.push(redirectPath);
        }
      }
    } catch (err: any) {
      setError(err.message ?? "An unexpected error occurred during sign-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    sessionStorage.setItem(
      "sb_session",
      JSON.stringify({
        token: "demo-token",
        user: {
          id: "demo-user",
          email: "demo@sbc.local",
          phone: "",
          fullName: "Demo User",
          role: "admin" as const,
          status: "active",
        },
      })
    );
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 500);
  };

  return (
    <div className="login-shell">
      <div className="login-grid">
        <section className="login-panel">
          <Brand />
          <div style={{ marginTop: 24 }}>
            <span className="eyebrow">Portal Access</span>
            <h1>Welcome back.</h1>
            <p>Sign in with your credentials to access the SBC loan management dashboard.</p>
          </div>

          {error && (
            <div className="callout" style={{ marginTop: 18, background: "rgba(255,111,125,0.12)", borderColor: "rgba(255,111,125,0.16)", color: "#ffadb6" }}>
              {error}
            </div>
          )}

          {success && (
            <div className="callout" style={{ marginTop: 18 }}>
              {success}
            </div>
          )}

          <form className="login-form" onSubmit={handleSignIn} noValidate>
            <div className="field">
              <label htmlFor="identity">Username or Email or Phone</label>
              <input
                id="identity"
                placeholder="admin@example.com or 07xxxxxxxx"
                type="text"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                placeholder="Enter password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-primary" type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
              <button className="btn-secondary" type="button" onClick={handleDemoLogin} disabled={loading}>
                Demo
              </button>
            </div>
          </form>

          <p className="table-muted" style={{ marginTop: 16, fontSize: 0.85 }}>
            Don't have an account? Contact your administrator to set one up.
          </p>
        </section>

        <aside className="login-side">
          <span className="eyebrow">Migration status</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.3rem", marginBottom: 12 }}>
            Safer, cleaner, ready for live callbacks.
          </h2>
          <p className="table-muted">
            The current PHP system remains untouched while this modern shell is built out. Your dashboards, transactions, Supabase database scripts, and M-PESA routes now have a proper home.
          </p>
          <div className="highlight-list" style={{ marginTop: 24 }}>
            <div className="highlight-item">
              <strong>Full bootstrap SQL</strong>
              <p className="table-muted">Use `database/fullupdate.sql` in the Supabase SQL editor.</p>
            </div>
            <div className="highlight-item">
              <strong>Incremental SQL discipline</strong>
              <p className="table-muted">Every future schema change should get its own file in `database/updates/`.</p>
            </div>
          </div>
          <div className="cta-row" style={{ marginTop: 24 }}>
            <Link className="btn-secondary" href="/dashboard">
              Back to dashboard preview
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ identity?: string }> }) {
  return (
    <LoginPageWrapper searchParams={searchParams} />
  );
}

function LoginPageWrapper({ searchParams: searchParamsPromise }: { searchParams: Promise<{ identity?: string }> }) {
  // Resolve the search params synchronously from the Promise
  const [searchIdentity, setSearchIdentity] = useState<string | null>(null);

  // Use React.use to unwrap the promise (works in client components)
  // This avoids useSearchParams() which requires Suspense
  const sp = searchParamsPromise as any;
  const _identity = sp?.identity ?? null;

  return <LoginPageClient searchIdentity={_identity} />;
}

export const dynamic = "force-dynamic";
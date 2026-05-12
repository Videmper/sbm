"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Brand } from "@/components/brand";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

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
    setSuccess("");
    setLoading(true);

    if (!identity.trim()) {
      setError("Please enter your email or phone number.");
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

          if (profile.status === "inactive") {
            setError("Your account has been deactivated. Please contact your administrator.");
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

  return (
    <div className="login-shell">
      <div className="login-grid">
        <section className="login-panel">
          <Brand />
          <div style={{ marginTop: 24 }}>
            <span className="eyebrow">Portal Access</span>
            <h1>Welcome back.</h1>
            <p style={{ marginTop: 8 }}>
              Sign in with your credentials to access the SBC loan management dashboard.
            </p>
          </div>

          {error && (
            <div className="callout callout-error" style={{ marginTop: 18 }}>
              <AlertCircle size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
              {error}
            </div>
          )}

          {success && (
            <div className="callout callout-info" style={{ marginTop: 18 }}>
              {success}
            </div>
          )}

          <form className="login-form" onSubmit={handleSignIn} noValidate>
            <div className="field">
              <label htmlFor="identity">Email or Phone Number</label>
              <input
                id="identity"
                placeholder="admin@sbc.co.ke or 07xxxxxxxx"
                type="text"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                disabled={loading}
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="btn-primary" type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} style={{ marginRight: 8 }} />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>

          <p className="table-muted" style={{ marginTop: 20, fontSize: 0.85 }}>
            Don't have an account? Contact your administrator to set one up.
          </p>
        </section>

        <aside className="login-side">
          <div style={{ padding: "24px 0" }}>
            <span className="eyebrow">Secure Access</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", marginBottom: 16 }}>
              SBC Modern Core
            </h2>
            <p className="table-muted" style={{ marginBottom: 24 }}>
              A production-ready microfinance management platform for savings and credit cooperatives.
              Built with enterprise-grade security and Kenyan financial workflows.
            </p>

            <div className="highlight-list" style={{ marginTop: 0 }}>
              <div className="highlight-item">
                <strong>Role-Based Access</strong>
                <p className="table-muted">Administrators, loan officers, field officers, and members each have tailored dashboards.</p>
              </div>
              <div className="highlight-item">
                <strong>M-PESA Integration</strong>
                <p className="table-muted">Direct Daraja API integration for real-time payment processing and reconciliation.</p>
              </div>
              <div className="highlight-item">
                <strong>PostgreSQL Database</strong>
                <p className="table-muted">Supabase-backed with triggers, views, and audit trails for full data integrity.</p>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <Link className="btn-secondary" href="/settings" style={{ width: "100%", textAlign: "center" }}>
                System Status
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ identity?: string }> }) {
  return <LoginPageWrapper searchParams={searchParams} />;
}

function LoginPageWrapper({ searchParams: searchParamsPromise }: { searchParams: Promise<{ identity?: string }> }) {
  const [searchIdentity, setSearchIdentity] = useState<string | null>(null);

  useEffect(() => {
    const extractIdentity = async () => {
      const sp = await searchParamsPromise;
      const _identity = sp?.identity ?? null;
      setSearchIdentity(_identity);
    };

    extractIdentity();
  }, [searchParamsPromise]);

  return <LoginPageClient searchIdentity={searchIdentity} />;
}

export const dynamic = "force-dynamic";
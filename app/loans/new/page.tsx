"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { ArrowLeft, Send, AlertTriangle } from "lucide-react";

interface ClientOption {
  id: string;
  fullName: string;
  memberNo: string;
}

export default function NewLoanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [formData, setFormData] = useState({
    clientId: "",
    clientName: "",
    category: "business",
    amountRequested: "",
    amountApproved: "",
    purpose: "",
    termWeeks: "12",
    loanPeriodDays: "84",
    repaymentFrequency: "weekly",
    repaymentPlan: "weekly",
    interestRate: "0.03",
    processingFee: "1000",
    insuranceFee: "500",
    collateralJointFee: "0",
  });

  const handleSearchClients = async (query: string) => {
    setSearchTerm(query);
    if (query.length < 2) {
      setClients([]);
      return;
    }
    try {
      const res = await fetch(`/api/clients?q=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.data ?? []);
        setShowSearch(true);
      }
    } catch {
      setClients([]);
    }
  };

  const selectClient = (client: ClientOption) => {
    setFormData((prev) => ({ ...prev, clientId: client.id, clientName: client.fullName }));
    setClients([]);
    setSearchTerm(client.fullName);
    setShowSearch(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: formData.clientId,
          category: formData.category,
          amount_requested: Number(formData.amountRequested),
          amount_approved: Number(formData.amountApproved) || Number(formData.amountRequested),
          purpose: formData.purpose,
          term_weeks: Number(formData.termWeeks),
          loan_period_days: Number(formData.loanPeriodDays),
          repayment_frequency: formData.repaymentFrequency,
          repayment_plan: formData.repaymentPlan,
          interest_rate: Number(formData.interestRate),
          processing_fee: Number(formData.processingFee),
          insurance_fee: Number(formData.insuranceFee),
          collateral_joint_registration_fee: Number(formData.collateralJointFee),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create loan");

      setSuccess(`Loan application created successfully!`);
      setTimeout(() => router.push("/loans"), 2000);
    } catch (err: any) {
      setError(err.message ?? "Failed to create loan application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="New Loan Application" description="Create a new loan application for a member." badge="Loans" currentPath="/loans">
      <button className="btn-secondary" onClick={() => router.push("/loans")} style={{ marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 8 }}>
        <ArrowLeft size={16} /> Back to Loans
      </button>

      <SectionCard title="Loan Application Form">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          {error && <div className="callout callout-error">{error}</div>}
          {success && <div className="callout callout-success">{success}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="sim-input-group" style={{ position: "relative" }}>
              <label>Client *</label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleSearchClients(e.target.value)}
                onFocus={() => setShowSearch(true)}
                placeholder="Search member by name..."
                required
              />
              {showSearch && clients.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                  background: "var(--bg-panel)", border: "1px solid var(--line)", borderRadius: 12,
                  maxHeight: 200, overflowY: "auto", boxShadow: "var(--shadow-lg)",
                }}>
                  {clients.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => selectClient(c)}
                      style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--line)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <strong>{c.fullName}</strong>
                      <div className="table-muted">{c.memberNo}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input type="hidden" name="clientId" value={formData.clientId} required />

            <div className="sim-input-group">
              <label>Category</label>
              <select name="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="business">Business</option>
                <option value="agriculture">Agriculture</option>
                <option value="education">Education</option>
                <option value="emergency">Emergency</option>
                <option value="salary">Salary</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div className="sim-input-group">
              <label>Amount Requested (KES) *</label>
              <input type="number" name="amountRequested" value={formData.amountRequested} onChange={(e) => setFormData({ ...formData, amountRequested: e.target.value })} placeholder="e.g. 50000" required min={0} step={1000} />
            </div>
            <div className="sim-input-group">
              <label>Amount Approved (KES)</label>
              <input type="number" name="amountApproved" value={formData.amountApproved} onChange={(e) => setFormData({ ...formData, amountApproved: e.target.value })} placeholder="Leave blank = requested" min={0} step={1000} />
            </div>
            <div className="sim-input-group">
              <label>Purpose</label>
              <input type="text" name="purpose" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} placeholder="Loan purpose" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div className="sim-input-group">
              <label>Term (Weeks)</label>
              <input type="number" name="termWeeks" value={formData.termWeeks} onChange={(e) => setFormData({ ...formData, termWeeks: e.target.value })} min={1} />
            </div>
            <div className="sim-input-group">
              <label>Loan Period (Days)</label>
              <input type="number" name="loanPeriodDays" value={formData.loanPeriodDays} onChange={(e) => setFormData({ ...formData, loanPeriodDays: e.target.value })} min={1} />
            </div>
            <div className="sim-input-group">
              <label>Repayment Frequency</label>
              <select name="repaymentFrequency" value={formData.repaymentFrequency} onChange={(e) => setFormData({ ...formData, repaymentFrequency: e.target.value as any })}>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="biweekly">Bi-weekly</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
            <div className="sim-input-group">
              <label>Interest Rate (%)</label>
              <input type="number" name="interestRate" value={Number(formData.interestRate) * 100} onChange={(e) => setFormData({ ...formData, interestRate: (Number(e.target.value) / 100).toString() })} step={0.1} min={0} />
            </div>
            <div className="sim-input-group">
              <label>Processing Fee (KES)</label>
              <input type="number" name="processingFee" value={formData.processingFee} onChange={(e) => setFormData({ ...formData, processingFee: e.target.value })} min={0} />
            </div>
            <div className="sim-input-group">
              <label>Insurance Fee (KES)</label>
              <input type="number" name="insuranceFee" value={formData.insuranceFee} onChange={(e) => setFormData({ ...formData, insuranceFee: e.target.value })} min={0} />
            </div>
            <div className="sim-input-group">
              <label>Collateral/Joint Fee (KES)</label>
              <input type="number" name="collateralJointFee" value={formData.collateralJointFee} onChange={(e) => setFormData({ ...formData, collateralJointFee: e.target.value })} min={0} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button className="btn-primary" type="submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Submitting…" : "Submit Loan Application"}
            </button>
            <button className="btn-secondary" type="button" onClick={() => setFormData({
              clientId: "", clientName: "", category: "business", amountRequested: "", amountApproved: "",
              purpose: "", termWeeks: "12", loanPeriodDays: "84", repaymentFrequency: "weekly",
              repaymentPlan: "weekly", interestRate: "0.03", processingFee: "1000", insuranceFee: "500", collateralJointFee: "0",
            })}>
              Clear Form
            </button>
          </div>
        </form>
      </SectionCard>
    </AppShell>
  );
}
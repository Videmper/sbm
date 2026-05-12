"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { createClient } from "@/lib/supabase";
import { UserPlus, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    altPhone: "",
    email: "",
    idNumber: "",
    dob: "",
    gender: "male",
    maritalStatus: "Single",
    county: "",
    businessName: "",
    businessType: "",
    businessLocation: "",
    address: "",
    savingsOnly: false,
    loanOfficerId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: dbError } = await supabase
        .from("clients")
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          alt_phone: formData.altPhone || null,
          email: formData.email || null,
          id_number: formData.idNumber || null,
          dob: formData.dob || null,
          gender: formData.gender,
          marital_status: formData.maritalStatus,
          county: formData.county || null,
          business_name: formData.businessName || null,
          business_type: formData.businessType || null,
          business_location: formData.businessLocation || null,
          address: formData.address || null,
          savings_only: formData.savingsOnly,
          loan_officer_id: formData.loanOfficerId || null,
          status: "active",
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setSuccess(`Member "${data.full_name}" (${data.member_no}) registered successfully!`);
      setFormData({
        firstName: "", lastName: "", phone: "", altPhone: "", email: "",
        idNumber: "", dob: "", gender: "male", maritalStatus: "Single",
        county: "", businessName: "", businessType: "", businessLocation: "",
        address: "", savingsOnly: false, loanOfficerId: "",
      });

      setTimeout(() => router.push("/clients"), 2000);
    } catch (err: any) {
      setError(err.message ?? "Failed to register member.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Register Member"
      description="Add a new member to the SBC system."
      badge="New Member"
      currentPath="/register"
    >
      <button
        className="btn-secondary"
        onClick={() => router.push("/clients")}
        style={{ marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        <ArrowLeft size={16} /> Back to Members
      </button>

      <SectionCard title="Member Information">
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          {error && (
            <div className="callout callout-error">
              {error}
            </div>
          )}

          {success && (
            <div className="callout callout-success">
              {success}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="sim-input-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                id="firstName" name="firstName" required
                value={formData.firstName} onChange={handleChange}
                placeholder="Enter first name"
              />
            </div>
            <div className="sim-input-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                id="lastName" name="lastName" required
                value={formData.lastName} onChange={handleChange}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="sim-input-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                id="phone" name="phone" required
                value={formData.phone} onChange={handleChange}
                placeholder="07xxxxxxxx"
              />
            </div>
            <div className="sim-input-group">
              <label htmlFor="altPhone">Alternative Phone</label>
              <input
                id="altPhone" name="altPhone"
                value={formData.altPhone} onChange={handleChange}
                placeholder="Alternative contact number"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="sim-input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email" name="email" type="email"
                value={formData.email} onChange={handleChange}
                placeholder="member@example.com"
              />
            </div>
            <div className="sim-input-group">
              <label htmlFor="idNumber">ID Number</label>
              <input
                id="idNumber" name="idNumber"
                value={formData.idNumber} onChange={handleChange}
                placeholder="National ID number"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="sim-input-group">
              <label htmlFor="dob">Date of Birth</label>
              <input id="dob" name="dob" type="date" value={formData.dob} onChange={handleChange} />
            </div>
            <div className="sim-input-group">
              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="sim-input-group">
              <label htmlFor="maritalStatus">Marital Status</label>
              <select id="maritalStatus" name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widow">Widow</option>
                <option value="Widower">Widower</option>
              </select>
            </div>
            <div className="sim-input-group">
              <label htmlFor="county">County</label>
              <input
                id="county" name="county"
                value={formData.county} onChange={handleChange}
                placeholder="e.g. Nairobi"
              />
            </div>
          </div>

          <h3 style={{ marginTop: 8, fontSize: "1rem", color: "var(--text-secondary)" }}>Business Details</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="sim-input-group">
              <label htmlFor="businessName">Business Name</label>
              <input
                id="businessName" name="businessName"
                value={formData.businessName} onChange={handleChange}
                placeholder="Business or shop name"
              />
            </div>
            <div className="sim-input-group">
              <label htmlFor="businessType">Business Type</label>
              <input
                id="businessType" name="businessType"
                value={formData.businessType} onChange={handleChange}
                placeholder="e.g. Retail, Agriculture"
              />
            </div>
          </div>

          <div className="sim-input-group">
            <label htmlFor="businessLocation">Business Location</label>
            <input
              id="businessLocation" name="businessLocation"
              value={formData.businessLocation} onChange={handleChange}
              placeholder="Where the business operates"
            />
          </div>

          <div className="sim-input-group">
            <label htmlFor="address">Home Address</label>
            <input
              id="address" name="address"
              value={formData.address} onChange={handleChange}
              placeholder="Home address"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="sim-input-group">
              <label htmlFor="loanOfficerId">Loan Officer ID</label>
              <input
                id="loanOfficerId" name="loanOfficerId"
                value={formData.loanOfficerId} onChange={handleChange}
                placeholder="Assigned loan officer"
              />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              name="savingsOnly"
              checked={formData.savingsOnly}
              onChange={handleChange}
            />
            <span>Savings Only Member</span>
          </label>

          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? "Registering…" : "Register Member"}
          </button>
        </form>
      </SectionCard>
    </AppShell>
  );
}
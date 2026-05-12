import { formatCompactNumber, formatCurrency } from "@/lib/format";
import { mockClients, mockDashboard, mockLoans, mockReports, mockSavings, mockSettings, mockSync, mockTransactions } from "@/lib/mock-data";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  ClientRecord,
  DashboardSnapshot,
  GetClientsParams,
  GetLoansParams,
  GetSavingsParams,
  GetTransactionsParams,
  LoanRecord,
  PagedResult,
  PaymentBreakdownRecord,
  ReportsSnapshot,
  SavingsRecord,
  SettingsSnapshot,
  SyncSnapshot,
  TransactionRecord,
} from "@/lib/types";

function normalizeClientName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Unnamed member";
}

// ============================================================
// Dashboard
// ============================================================

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  if (!isSupabaseConfigured()) {
    return mockDashboard;
  }

  const supabase = createSupabaseAdminClient();

  const [
    clientsCountResult,
    activeLoansResult,
    overdueLoansResult,
    savingsResult,
    clientsResult,
    loansResult,
    txResult,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("loans").select("id, amount_approved, amount_requested, status", { count: "exact" }),
    supabase.from("loans").select("id", { count: "exact", head: true }).eq("status", "defaulted"),
    supabase.from("savings_ledger").select("amount, transaction_type"),
    supabase.from("clients").select("id, member_no, first_name, last_name, phone, business_name, county, savings_only, created_at").limit(4),
    supabase.from("loans").select("id, amount_approved, amount_requested, status, repayment_frequency, due_date, category, clients(first_name, last_name)").limit(4),
    supabase.from("mpesa_transactions").select("id, amount, mpesa_receipt_number, transaction_date, payer_phone, result_desc").order("transaction_date", { ascending: false }).limit(4),
  ]);

  const activePortfolio = (activeLoansResult.data ?? []).reduce((sum, loan) => {
    const status = String(loan.status ?? "");
    if (!["active", "approved"].includes(status)) {
      return sum;
    }
    return sum + Number(loan.amount_approved ?? loan.amount_requested ?? 0);
  }, 0);

  const heldSavings = (savingsResult.data ?? []).reduce((sum, row) => {
    const sign = row.transaction_type === "withdrawal" ? -1 : 1;
    return sum + sign * Number(row.amount ?? 0);
  }, 0);

  const clients: ClientRecord[] = (clientsResult.data ?? []).map((client) => ({
    id: String(client.id),
    memberNo: String(client.member_no ?? "N/A"),
    fullName: normalizeClientName(client.first_name, client.last_name),
    phone: String(client.phone ?? "N/A"),
    businessName: String(client.business_name ?? "No business name"),
    county: String(client.county ?? "Unassigned"),
    status: "active",
    savingsOnly: Boolean(client.savings_only),
    joinedAt: String(client.created_at ?? new Date().toISOString()),
  }));

  const loans: LoanRecord[] = (loansResult.data ?? []).map((loan) => ({
    id: String(loan.id),
    clientId: "",
    clientName: normalizeClientName(
      (loan.clients as { first_name?: string | null } | null)?.first_name,
      (loan.clients as { last_name?: string | null } | null)?.last_name,
    ),
    category: String(loan.category ?? "Other"),
    principal: Number(loan.amount_approved ?? loan.amount_requested ?? 0),
    balance: Number(loan.amount_approved ?? loan.amount_requested ?? 0),
    status: (loan.status ?? "pending") as LoanRecord["status"],
    repaymentFrequency: (loan.repayment_frequency ?? "weekly") as LoanRecord["repaymentFrequency"],
    repaymentPlan: (loan.repayment_frequency ?? "weekly") as LoanRecord["repaymentPlan"],
    dueDate: String(loan.due_date ?? new Date().toISOString()),
    termWeeks: 12,
    loanPeriodDays: 30,
    interestRate: 0,
    interestAmount: 0,
    processingFee: 0,
    insuranceFee: 0,
    penaltyRate: 0.02,
    totalDeductions: 0,
    totalRepayment: 0,
    netDisbursed: 0,
    fundsTransferFee: 0,
    dailyContribution: 0,
    savingsAmount: 0,
    collateralJointFee: 0,
    unpaidShares: 0,
    unpaidSavings: 0,
    workflowStatus: "disbursed",
    paymentBreakdowns: [],
  }));

  const recentTransactions: TransactionRecord[] = (txResult.data ?? []).map((row) => ({
    id: String(row.id),
    source: "mpesa",
    clientName: String(row.payer_phone ?? "M-PESA payer"),
    amount: Number(row.amount ?? 0),
    method: "M-PESA",
    reference: String(row.mpesa_receipt_number ?? "N/A"),
    recordedAt: String(row.transaction_date ?? new Date().toISOString()),
    notes: String(row.result_desc ?? "Callback captured"),
  }));

  return {
    metrics: [
      {
        label: "Clients on Book",
        value: formatCompactNumber(clientsCountResult.count ?? 0),
        helper: "Members ready for modern operations",
        tone: "emerald",
      },
      {
        label: "Live Portfolio",
        value: formatCurrency(activePortfolio),
        helper: "Approved and active loans",
        tone: "blue",
      },
      {
        label: "Held Savings",
        value: formatCurrency(heldSavings),
        helper: "Current savings ledger net balance",
        tone: "amber",
      },
      {
        label: "Watch List",
        value: String(overdueLoansResult.count ?? 0),
        helper: "Defaulted cases requiring action",
        tone: "rose",
      },
    ],
    alerts: [
      "Connected to Supabase with live counts.",
      "M-PESA callbacks will appear here once Daraja credentials are configured.",
      "Legacy sync remains available for phased migration.",
    ],
    clients: clients.length > 0 ? clients : mockClients,
    loans: loans.length > 0 ? loans : mockLoans,
    recentTransactions: recentTransactions.length > 0 ? recentTransactions : mockTransactions,
  };
}

// ============================================================
// Clients
// ============================================================

export async function getClientsSnapshot(params?: GetClientsParams): Promise<PagedResult<ClientRecord>> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const offset = (page - 1) * limit;
  const searchQuery = params?.query?.trim() ?? "";

  if (!isSupabaseConfigured()) {
    let data = mockClients;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = mockClients.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.memberNo.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      );
    }
    const total = data.length;
    const paged = data.slice(offset, offset + limit);
    return { data: paged, total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 };
  }

  const supabase = createSupabaseAdminClient();

// Build query
  let query = supabase
    .from("clients")
    .select("id, member_no, first_name, last_name, phone, business_name, county, savings_only, created_at", { count: "exact" });

  if (searchQuery) {
    query = query.or(`full_name.ilike.%${searchQuery}%,member_no.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
  }

  const { data: allData, count: totalCount, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("getClientsSnapshot error:", error);
    let fallback = mockClients;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      fallback = mockClients.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.memberNo.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      );
    }
    const total = fallback.length;
    const paged = fallback.slice(offset, offset + limit);
    return { data: paged, total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 };
  }

  const total = totalCount ?? 0;
  const clients: ClientRecord[] = (allData ?? []).map((client) => ({
    id: String(client.id),
    memberNo: String(client.member_no ?? "N/A"),
    fullName: normalizeClientName(client.first_name, client.last_name),
    phone: String(client.phone ?? "N/A"),
    businessName: String(client.business_name ?? "No business name"),
    county: String(client.county ?? "Unassigned"),
    status: "active",
    savingsOnly: Boolean(client.savings_only),
    joinedAt: String(client.created_at ?? new Date().toISOString()),
  }));

  return {
    data: clients,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: offset + limit < total,
    hasPrev: page > 1,
  };
}

// ============================================================
// Client Detail
// ============================================================

export async function getClientById(clientId: string): Promise<ClientRecord | null> {
  if (!isSupabaseConfigured()) {
    return mockClients.find((c) => c.id === clientId) ?? null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, member_no, first_name, last_name, phone, business_name, county, savings_only, created_at")
    .eq("id", clientId)
    .single();

  if (error || !data) {
    console.error("getClientById error:", error);
    return mockClients.find((c) => c.id === clientId) ?? null;
  }

  return {
    id: String(data.id),
    memberNo: String(data.member_no ?? "N/A"),
    fullName: normalizeClientName(data.first_name, data.last_name),
    phone: String(data.phone ?? "N/A"),
    businessName: String(data.business_name ?? "No business name"),
    county: String(data.county ?? "Unassigned"),
    status: "active",
    savingsOnly: Boolean(data.savings_only),
    joinedAt: String(data.created_at ?? new Date().toISOString()),
  };
}

// ============================================================
// Loans
// ============================================================

export async function getLoansSnapshot(params?: GetLoansParams): Promise<PagedResult<LoanRecord>> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const offset = (page - 1) * limit;
  const searchQuery = params?.query?.trim() ?? "";
  const statusFilter = params?.status;
  const categoryFilter = params?.category;
  const clientIdFilter = params?.clientId;

  if (!isSupabaseConfigured()) {
    let data = mockLoans;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = mockLoans.filter(
        (l) =>
          l.clientName.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      data = data.filter((l) => l.status === statusFilter);
    }
    if (categoryFilter) {
      data = data.filter((l) => l.category === categoryFilter);
    }
    const total = data.length;
    const paged = data.slice(offset, offset + limit);
    return { data: paged, total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 };
  }

  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("loans")
    .select("id, client_id, amount_approved, amount_requested, status, repayment_frequency, repayment_plan, due_date, category, term_weeks, loan_period_days, interest_rate, interest_amount, processing_fee, insurance_fee, penalty_rate, total_deductions, total_repayment, net_disbursed, funds_transfer_fee, daily_contribution, savings_amount, collateral_joint_registration_fee, unpaid_shares, unpaid_savings, workflow_status, clients(first_name, last_name)", { count: "exact" });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (categoryFilter) {
    query = query.eq("category", categoryFilter);
  }
if (clientIdFilter) {
    query = query.eq("client_id", clientIdFilter);
  }
  if (searchQuery) {
    query = query.or(`clients.first_name.ilike.%${searchQuery}%,clients.last_name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
  }

  const { data: allData, count: totalCount, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("getLoansSnapshot error:", error);
    let fallback = mockLoans;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      fallback = mockLoans.filter(
        (l) =>
          l.clientName.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      fallback = fallback.filter((l) => l.status === statusFilter);
    }
    const total = fallback.length;
    const paged = fallback.slice(offset, offset + limit);
    return { data: paged, total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 };
  }

  const total = totalCount ?? 0;
  const loans: LoanRecord[] = await Promise.all(
    (allData ?? []).map(async (loan) => {
      const principal = Number(loan.amount_approved ?? loan.amount_requested ?? 0);

      // Fetch actual payment breakdowns to compute balance = principal - sum(loan_amount)
      let balance = principal;
      const breakdowns: PaymentBreakdownRecord[] = [];

      if (loan.id) {
        const breakdownResult = await supabase
          .from("loan_payment_breakdowns")
          .select("id, loan_id, client_id, payment_date, receipt_number, payment_method, source_channel, total_amount, loan_amount, savings_amount, rounded_bucket_amount, notes")
          .eq("loan_id", loan.id);

        if (!breakdownResult.error && breakdownResult.data) {
          const totalPaid = breakdownResult.data.reduce((sum, b) => sum + Number(b.loan_amount ?? 0), 0);
          balance = principal - totalPaid;

          breakdowns.push(...breakdownResult.data.map((b) => ({
            id: String(b.id),
            loanId: String(b.loan_id ?? ""),
            clientId: String(b.client_id ?? ""),
            paymentDate: String(b.payment_date ?? ""),
            receiptNumber: b.receipt_number ?? undefined,
            paymentMethod: b.payment_method ?? undefined,
            sourceChannel: String(b.source_channel ?? "manual"),
            totalAmount: Number(b.total_amount ?? 0),
            loanAmount: Number(b.loan_amount ?? 0),
            savingsAmount: Number(b.savings_amount ?? 0),
            roundedBucketAmount: Number(b.rounded_bucket_amount ?? 0),
            notes: b.notes ?? undefined,
          })));
        }
      }

      return {
        id: String(loan.id),
        clientId: String(loan.client_id ?? ""),
        clientName: normalizeClientName(
          (loan.clients as { first_name?: string | null } | null)?.first_name,
          (loan.clients as { last_name?: string | null } | null)?.last_name,
        ),
        category: String(loan.category ?? "Other"),
        principal,
        balance: Math.max(balance, 0),
        status: (loan.status ?? "pending") as LoanRecord["status"],
        repaymentFrequency: (loan.repayment_frequency ?? "weekly") as LoanRecord["repaymentFrequency"],
        repaymentPlan: (loan.repayment_plan ?? "weekly") as LoanRecord["repaymentPlan"],
        dueDate: String(loan.due_date ?? new Date().toISOString()),
        termWeeks: Number(loan.term_weeks ?? 12),
        loanPeriodDays: Number(loan.loan_period_days ?? 30),
        interestRate: Number(loan.interest_rate ?? 0),
        interestAmount: Number(loan.interest_amount ?? 0),
        processingFee: Number(loan.processing_fee ?? 0),
        insuranceFee: Number(loan.insurance_fee ?? 0),
        penaltyRate: Number(loan.penalty_rate ?? 0.02),
        totalDeductions: Number(loan.total_deductions ?? 0),
        totalRepayment: Number(loan.total_repayment ?? 0),
        netDisbursed: Number(loan.net_disbursed ?? 0),
        fundsTransferFee: Number(loan.funds_transfer_fee ?? 0),
        dailyContribution: Number(loan.daily_contribution ?? 0),
        savingsAmount: Number(loan.savings_amount ?? 0),
        collateralJointFee: Number(loan.collateral_joint_registration_fee ?? 0),
        unpaidShares: Number(loan.unpaid_shares ?? 0),
        unpaidSavings: Number(loan.unpaid_savings ?? 0),
        workflowStatus: (loan.workflow_status ?? "to_be_visited") as LoanRecord["workflowStatus"],
        paymentBreakdowns: breakdowns,
      };
    })
  );

  return {
    data: loans,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: offset + limit < total,
    hasPrev: page > 1,
  };
}

// ============================================================
// Loan by ID
// ============================================================

export async function getLoanById(loanId: string): Promise<LoanRecord | null> {
  if (!isSupabaseConfigured()) {
    return mockLoans.find((l) => l.id === loanId) ?? null;
  }

  const supabase = createSupabaseAdminClient();
  const { data: loan, error } = await supabase
    .from("loans")
    .select("id, client_id, amount_approved, amount_requested, status, repayment_frequency, repayment_plan, due_date, category, term_weeks, loan_period_days, interest_rate, interest_amount, processing_fee, insurance_fee, penalty_rate, total_deductions, total_repayment, net_disbursed, funds_transfer_fee, daily_contribution, savings_amount, collateral_joint_registration_fee, unpaid_shares, unpaid_savings, workflow_status")
    .eq("id", loanId)
    .single();

  if (error || !loan) {
    console.error("getLoanById error:", error);
    return mockLoans.find((l) => l.id === loanId) ?? null;
  }

  const principal = Number(loan.amount_approved ?? loan.amount_requested ?? 0);

  // Compute balance from payment breakdowns
  let balance = principal;
  const breakdowns: PaymentBreakdownRecord[] = [];

  const breakdownResult = await supabase
    .from("loan_payment_breakdowns")
    .select("id, loan_id, client_id, payment_date, receipt_number, payment_method, source_channel, total_amount, loan_amount, savings_amount, rounded_bucket_amount, notes")
    .eq("loan_id", loanId);

  if (!breakdownResult.error && breakdownResult.data) {
    const totalPaid = breakdownResult.data.reduce((sum, b) => sum + Number(b.loan_amount ?? 0), 0);
    balance = principal - totalPaid;

    breakdowns.push(...breakdownResult.data.map((b) => ({
      id: String(b.id),
      loanId: String(b.loan_id ?? ""),
      clientId: String(b.client_id ?? ""),
      paymentDate: String(b.payment_date ?? ""),
      receiptNumber: b.receipt_number ?? undefined,
      paymentMethod: b.payment_method ?? undefined,
      sourceChannel: String(b.source_channel ?? "manual"),
      totalAmount: Number(b.total_amount ?? 0),
      loanAmount: Number(b.loan_amount ?? 0),
      savingsAmount: Number(b.savings_amount ?? 0),
      roundedBucketAmount: Number(b.rounded_bucket_amount ?? 0),
      notes: b.notes ?? undefined,
    })));
  }

  // Fetch client name
  let clientName = "Unknown";
  if (loan.client_id) {
    const clientResult = await supabase
      .from("clients")
      .select("first_name, last_name")
      .eq("id", loan.client_id)
      .single();
    if (!clientResult.error && clientResult.data) {
      clientName = normalizeClientName(clientResult.data.first_name, clientResult.data.last_name);
    }
  }

  return {
    id: String(loan.id),
    clientId: String(loan.client_id ?? ""),
    clientName,
    category: String(loan.category ?? "Other"),
    principal,
    balance: Math.max(balance, 0),
    status: (loan.status ?? "pending") as LoanRecord["status"],
    repaymentFrequency: (loan.repayment_frequency ?? "weekly") as LoanRecord["repaymentFrequency"],
    repaymentPlan: (loan.repayment_plan ?? "weekly") as LoanRecord["repaymentPlan"],
    dueDate: String(loan.due_date ?? new Date().toISOString()),
    termWeeks: Number(loan.term_weeks ?? 12),
    loanPeriodDays: Number(loan.loan_period_days ?? 30),
    interestRate: Number(loan.interest_rate ?? 0),
    interestAmount: Number(loan.interest_amount ?? 0),
    processingFee: Number(loan.processing_fee ?? 0),
    insuranceFee: Number(loan.insurance_fee ?? 0),
    penaltyRate: Number(loan.penalty_rate ?? 0.02),
    totalDeductions: Number(loan.total_deductions ?? 0),
    totalRepayment: Number(loan.total_repayment ?? 0),
    netDisbursed: Number(loan.net_disbursed ?? 0),
    fundsTransferFee: Number(loan.funds_transfer_fee ?? 0),
    dailyContribution: Number(loan.daily_contribution ?? 0),
    savingsAmount: Number(loan.savings_amount ?? 0),
    collateralJointFee: Number(loan.collateral_joint_registration_fee ?? 0),
    unpaidShares: Number(loan.unpaid_shares ?? 0),
    unpaidSavings: Number(loan.unpaid_savings ?? 0),
    workflowStatus: (loan.workflow_status ?? "to_be_visited") as LoanRecord["workflowStatus"],
    paymentBreakdowns: breakdowns,
  };
}

// ============================================================
// Savings
// ============================================================

export async function getSavingsSnapshot(params?: GetSavingsParams): Promise<PagedResult<SavingsRecord>> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const offset = (page - 1) * limit;
  const searchQuery = params?.searchQuery?.trim() ?? "";

  if (!isSupabaseConfigured()) {
    let data = mockSavings;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = mockSavings.filter((s) => s.clientName.toLowerCase().includes(q));
    }
    const total = data.length;
    const paged = data.slice(offset, offset + limit);
    return { data: paged, total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 };
  }

  const supabase = createSupabaseAdminClient();

// Use the member_portfolio_balances view for savings data
  let query = supabase
    .from("member_portfolio_balances")
    .select("client_id, member_no, full_name, mandatory_savings, mandatory_shares, multiplier_balance, withdrawable_balance", { count: "exact" });

  if (searchQuery) {
    query = query.or(`full_name.ilike.%${searchQuery}%,member_no.ilike.%${searchQuery}%`);
  }

  const { data: allData, count: totalCount, error } = await query
    .order("full_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("getSavingsSnapshot error:", error);
    let fallback = mockSavings;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      fallback = mockSavings.filter((s) => s.clientName.toLowerCase().includes(q));
    }
    const total = fallback.length;
    const paged = fallback.slice(offset, offset + limit);
    return { data: paged, total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 };
  }

  const total = totalCount ?? 0;
  const savings: SavingsRecord[] = (allData ?? []).map((row) => ({
    id: String(row.client_id ?? row.member_no ?? crypto.randomUUID()),
    clientId: String(row.client_id ?? ""),
    clientName: String(row.full_name ?? "Unknown"),
    mandatory: Number(row.mandatory_savings ?? 0),
    mandatoryShares: Number(row.mandatory_shares ?? 0),
    multiplier: Number(row.multiplier_balance ?? 0),
    withdrawable: Number(row.withdrawable_balance ?? 0),
    updatedAt: new Date().toISOString(),
  }));

  return {
    data: savings,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: offset + limit < total,
    hasPrev: page > 1,
  };
}

// ============================================================
// Transactions
// ============================================================

export async function getTransactionsSnapshot(params?: GetTransactionsParams): Promise<PagedResult<TransactionRecord>> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 25;
  const offset = (page - 1) * limit;
  const searchQuery = params?.query?.trim() ?? "";

  if (!isSupabaseConfigured()) {
    let data = mockTransactions;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = mockTransactions.filter(
        (t) =>
          t.clientName.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q)
      );
    }
    const total = data.length;
    const paged = data.slice(offset, offset + limit);
    return { data: paged, total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 };
  }

  const supabase = createSupabaseAdminClient();

let query = supabase
    .from("mpesa_transactions")
    .select("id, amount, mpesa_receipt_number, transaction_date, payer_phone, result_desc, status", { count: "exact" });

  if (searchQuery) {
    query = query.or(`mpesa_receipt_number.ilike.%${searchQuery}%,payer_phone.ilike.%${searchQuery}%`);
  }

  const { data: allData, count: totalCount, error } = await query
    .order("transaction_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("getTransactionsSnapshot error:", error);
    let fallback = mockTransactions;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      fallback = mockTransactions.filter(
        (t) =>
          t.clientName.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q)
      );
    }
    const total = fallback.length;
    const paged = fallback.slice(offset, offset + limit);
    return { data: paged, total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 };
  }

  const total = totalCount ?? 0;
  const transactions: TransactionRecord[] = (allData ?? []).map((row) => ({
    id: String(row.id),
    source: "mpesa",
    clientName: String(row.payer_phone ?? "M-PESA payer"),
    amount: Number(row.amount ?? 0),
    method: "M-PESA",
    reference: String(row.mpesa_receipt_number ?? "N/A"),
    recordedAt: String(row.transaction_date ?? new Date().toISOString()),
    notes: String(row.result_desc ?? "Captured from callback"),
  }));

  return {
    data: transactions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: offset + limit < total,
    hasPrev: page > 1,
  };
}

// ============================================================
// Reports
// ============================================================

export async function getReportsSnapshot(): Promise<ReportsSnapshot> {
  if (!isSupabaseConfigured()) {
    return mockReports;
  }

  const supabase = createSupabaseAdminClient();

  // Active portfolio: sum of amount_approved for active/approved loans
const portfolioResult = await supabase
    .from("loans")
    .select("amount_approved, amount_requested, status, client_id", { count: "exact", head: false });

  const allLoans = portfolioResult.data ?? [];
  const activePortfolio = allLoans
    .filter((l) => ["active", "approved"].includes(String(l.status ?? "")))
    .reduce((sum, l) => sum + Number(l.amount_approved ?? l.amount_requested ?? 0), 0);

  // Savings breakdown from member_portfolio_balances view
  const savingsResult = await supabase.from("member_portfolio_balances").select("mandatory_savings, mandatory_shares, multiplier_balance, withdrawable_balance");
  const savingsRows = savingsResult.data ?? [];
  const totalMandatory = savingsRows.reduce((sum, r) => sum + Number(r.mandatory_savings ?? 0), 0);
  const totalShares = savingsRows.reduce((sum, r) => sum + Number(r.mandatory_shares ?? 0), 0);
  const totalMultiplier = savingsRows.reduce((sum, r) => sum + Number(r.multiplier_balance ?? 0), 0);
  const totalWithdrawable = savingsRows.reduce((sum, r) => sum + Number(r.withdrawable_balance ?? 0), 0);
  const memberSavings = totalMandatory + totalShares + totalMultiplier + totalWithdrawable;

  // Purpose pool: sum of all purpose_pool_allocations
  const purposePoolResult = await supabase
    .from("purpose_pool_allocations")
    .select("amount", { count: "exact", head: false });
  const purposePool = (purposePoolResult.data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  // Collections today
  const today = new Date().toISOString().split("T")[0];
  const collectionsResult = await supabase
    .from("mpesa_transactions")
    .select("amount", { count: "exact", head: false })
    .gte("transaction_date", today);
  const collectionToday = (collectionsResult.data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  // Loan status breakdown
  const statusCounts: Record<string, number> = {};
  for (const loan of allLoans) {
    const s = String(loan.status ?? "pending");
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

// Top clients by loan amount - use client_id to fetch names separately
  let top5: { name: string; totalLoans: number; outstanding: number }[] = [];

  if (allLoans.length > 0) {
    const uniqueClientIds = [...new Set(allLoans.map(l => l.client_id).filter(Boolean))];
    const clientNamesResult = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .in("id", uniqueClientIds as string[]);

    const clientNamesMap: Record<string, string> = {};
    if (!clientNamesResult.error && clientNamesResult.data) {
      for (const c of clientNamesResult.data) {
        clientNamesMap[c.id] = normalizeClientName(c.first_name, c.last_name);
      }
    }

    const clientTotals: Record<string, { name: string; totalLoans: number; outstanding: number }> = {};
    for (const id of Object.keys(clientNamesMap)) {
      clientTotals[id] = { name: clientNamesMap[id], totalLoans: 0, outstanding: 0 };
    }

    for (const loan of allLoans) {
      const clientId = loan.client_id;
      if (clientId && clientTotals[clientId]) {
        const princ = Number(loan.amount_approved ?? loan.amount_requested ?? 0);
        clientTotals[clientId].totalLoans += princ;
        if (["active", "approved"].includes(String(loan.status ?? ""))) {
          clientTotals[clientId].outstanding += princ;
        }
      }
    }

    top5 = Object.values(clientTotals)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5);
  }

  return {
    activePortfolio,
    memberSavings,
    purposePool,
    collectionToday,
    loanBreakdown: {
      active: statusCounts["active"] ?? 0,
      approved: statusCounts["approved"] ?? 0,
      pending: statusCounts["pending"] ?? 0,
      defaulted: statusCounts["defaulted"] ?? 0,
      completed: statusCounts["completed"] ?? 0,
    },
    savingsBreakdown: {
      mandatory: totalMandatory,
      shares: totalShares,
      multiplier: totalMultiplier,
      withdrawable: totalWithdrawable,
    },
    topClients: top5,
  };
}

// ============================================================
// Sync
// ============================================================

export async function getSyncSnapshot(): Promise<SyncSnapshot> {
  if (!isSupabaseConfigured()) {
    return mockSync;
  }

  const supabase = createSupabaseAdminClient();
  const [callbacksResult, runsResult] = await Promise.all([
    supabase.from("mpesa_callback_logs").select("id, processed", { count: "exact" }),
    supabase.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(10),
  ]);

  const callbacks = callbacksResult.data ?? [];

  return {
    lastSyncLabel: runsResult.data?.[0]?.details ?? "Supabase is connected. No sync run has been logged yet.",
    pendingCallbacks: callbacks.filter((item) => !item.processed).length,
    processedCallbacks: callbacks.filter((item) => item.processed).length,
    runs:
      runsResult.data?.map((run) => ({
        id: String(run.id),
        jobName: String(run.job_name ?? "sync_job"),
        mode: (run.run_mode ?? "incremental") as SyncSnapshot["runs"][number]["mode"],
        status: (run.status ?? "queued") as SyncSnapshot["runs"][number]["status"],
        startedAt: String(run.started_at ?? new Date().toISOString()),
        finishedAt: run.finished_at ? String(run.finished_at) : null,
        details: String(run.details ?? ""),
      })) ?? mockSync.runs,
  };
}

// ============================================================
// Settings
// ============================================================

export async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
  return {
    ...mockSettings,
    supabaseReady: isSupabaseConfigured(),
    mpesaReady: Boolean(
      process.env.MPESA_CONSUMER_KEY &&
        process.env.MPESA_CONSUMER_SECRET &&
        process.env.MPESA_SHORTCODE &&
        process.env.MPESA_PASSKEY
    ),
  };
}

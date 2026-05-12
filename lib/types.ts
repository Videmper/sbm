// ============================================================
// Role & Permission Types
// ============================================================

export type Role = "admin" | "loan_officer" | "field_officer" | "savings_member";

export type Permission =
  | "view_dashboard"
  | "manage_clients"
  | "manage_loans"
  | "manage_savings"
  | "view_transactions"
  | "view_reports"
  | "manage_settings"
  | "approve_loans"
  | "disburse_loans"
  | "write_off_loans"
  | "manage_users"
  | "run_sync"
  | "export_data"
  | "manage_fees";

export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "view_dashboard", "manage_clients", "manage_loans", "manage_savings",
    "view_transactions", "view_reports", "manage_settings", "approve_loans",
    "disburse_loans", "write_off_loans", "manage_users", "run_sync",
    "export_data", "manage_fees",
  ],
  loan_officer: [
    "view_dashboard", "manage_clients", "manage_loans", "manage_savings",
    "view_transactions", "view_reports", "approve_loans", "disburse_loans",
  ],
  field_officer: [
    "view_dashboard", "manage_clients", "view_transactions", "run_sync",
  ],
  savings_member: [
    "view_dashboard", "view_transactions", "manage_savings",
  ],
};

// ============================================================
// Filter / Pagination Types
// ============================================================

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type SearchParams = {
  query?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type GetClientsParams = PaginationParams & {
  query?: string;
  status?: string;
};

export type PagedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

// ============================================================
// Dashboard
// ============================================================

export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
  tone: "emerald" | "amber" | "blue" | "rose";
};

export type DashboardSnapshot = {
  metrics: DashboardMetric[];
  alerts: string[];
  clients: ClientRecord[];
  loans: LoanRecord[];
  recentTransactions: TransactionRecord[];
  pendingActions: DashboardAction[];
};

export type DashboardAction = {
  label: string;
  href: string;
  icon: string;
  badge?: string;
};

// ============================================================
// Auth / Session
// ============================================================

export type SessionUser = {
  id: string;
  email?: string;
  phone?: string;
  fullName: string;
  role: Role;
  status: "active" | "inactive";
};

// ============================================================
// Client
// ============================================================

export type ClientRecord = {
  id: string;
  memberNo: string;
  fullName: string;
  phone: string;
  businessName: string;
  businessType?: string;
  county: string;
  city?: string;
  ward?: string;
  town?: string;
  village?: string;
  address?: string;
  email?: string;
  maritalStatus?: string;
  idNumber?: string;
  dob?: string;
  gender?: "male" | "female" | "other";
  status: "active" | "review" | "inactive";
  savingsOnly: boolean;
  loanOfficerId?: string;
  fieldOfficerId?: string;
  joinedAt: string;
};

export type ClientDetail = ClientRecord & {
  nickname?: string;
  altPhone?: string;
  oldMemberId?: string;
  homeOwnership?: "Rented" | "Owned";
  homePlotName?: string;
  homeHouseNumber?: string;
  homeRoad?: string;
  homeLocationDescription?: string;
  homePhotosAttached?: boolean;
  locationNextTo?: string;
  locationOpposite?: string;
  locationBetween?: string;
  locationBehind?: string;
  locationAdjacentTo?: string;
  homeTownMarket?: string;
  homeVillageEstate?: string;
  savingsBucket?: {
    mandatory: number;
    mandatoryShares: number;
    multiplier: number;
    withdrawable: number;
  };
  guarantors: GuarantorRecord[];
  collateral: CollateralRecord[];
  visits: ClientVisitRecord[];
  followups: FollowupRecord[];
  loans: LoanRecord[];
  transactions: TransactionRecord[];
  nextOfKin: NextOfKinRecord[];
};

// ============================================================
// Loan
// ============================================================

export type LoanRecord = {
  id: string;
  clientId: string;
  clientName: string;
  category: string;
  principal: number;
  balance: number;
  status: "pending" | "approved" | "active" | "completed" | "defaulted" | "rejected";
  repaymentFrequency: "daily" | "weekly" | "monthly";
  repaymentPlan: "daily" | "weekly" | "monthly";
  dueDate: string;
  termWeeks: number;
  loanPeriodDays: number;
  interestRate: number;
  interestAmount: number;
  processingFee: number;
  insuranceFee: number;
  penaltyRate: number;
  totalDeductions: number;
  totalRepayment: number;
  netDisbursed: number;
  fundsTransferFee: number;
  dailyContribution: number;
  savingsAmount: number;
  collateralJointFee: number;
  unpaidShares: number;
  unpaidSavings: number;
  workflowStatus:
    | "to_be_visited"
    | "visited"
    | "recommended_for_approval"
    | "approved"
    | "disbursed";
  approvedAt?: string;
  submittedAt?: string;
  paymentBreakdowns: PaymentBreakdownRecord[];
};

export type GetLoansParams = PaginationParams &
  SearchParams & {
    status?: string;
    category?: string;
    clientId?: string;
    workflowStatus?: string;
  };

export type PaymentBreakdownRecord = {
  id: string;
  loanId: string;
  clientId: string;
  paymentDate: string;
  receiptNumber?: string;
  paymentMethod?: string;
  sourceChannel: string;
  totalAmount: number;
  loanAmount: number;
  savingsAmount: number;
  roundedBucketAmount: number;
  notes?: string;
};

export type LoanApplication = {
  clientId: string;
  category: string;
  amountRequested: number;
  purpose: string;
  termWeeks: number;
  repaymentFrequency: "daily" | "weekly" | "monthly";
  collateral?: CollateralRecord;
  guarantors: GuarantorRecord[];
};

export type LoanSimulatorInput = {
  principal: number;
  interestRate: number;
  termWeeks: number;
  repaymentFrequency: "daily" | "weekly" | "monthly";
  processingFee?: number;
  insuranceFee?: number;
  savingsDeduction?: number;
};

export type LoanSimulatorOutput = {
  principal: number;
  totalInterest: number;
  processingFee: number;
  insuranceFee: number;
  totalDeductions: number;
  totalRepayment: number;
  netDisbursed: number;
  weeklyPayment: number;
  dailyPayment: number;
  monthlyPayment: number;
  paymentSchedule: AmortizationEntry[];
};

export type AmortizationEntry = {
  week: number;
  date: string;
  beginningBalance: number;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  endingBalance: number;
};

// ============================================================
// Savings
// ============================================================

export type SavingsRecord = {
  id: string;
  clientId: string;
  clientName: string;
  mandatory: number;
  mandatoryShares: number;
  multiplier: number;
  withdrawable: number;
  total: number;
  updatedAt: string;
};

export type GetSavingsParams = PaginationParams & { searchQuery?: string };

export type SavingsContribution = {
  clientId: string;
  amount: number;
  bucket: "mandatory" | "mandatory_shares" | "multiplier" | "withdrawable";
  notes?: string;
  date: string;
};

// ============================================================
// Transaction
// ============================================================

export type TransactionRecord = {
  id: string;
  source: "legacy" | "live" | "mpesa";
  clientName: string;
  clientId?: string;
  amount: number;
  method: string;
  reference: string;
  recordedAt: string;
  notes: string;
  type: "deposit" | "withdrawal" | "payment" | "reversal";
};

export type GetTransactionsParams = PaginationParams & SearchParams;

// ============================================================
// Reports
// ============================================================

export type ReportsSnapshot = {
  activePortfolio: number;
  memberSavings: number;
  purposePool: number;
  collectionToday: number;
  totalDisbursed: number;
  totalRepaid: number;
  loanBreakdown: {
    active: number;
    approved: number;
    pending: number;
    defaulted: number;
    completed: number;
    rejected: number;
  };
  savingsBreakdown: {
    mandatory: number;
    shares: number;
    multiplier: number;
    withdrawable: number;
  };
  topClients: { name: string; totalLoans: number; outstanding: number }[];
};

// ============================================================
// Sync
// ============================================================

export type SyncRun = {
  id: string;
  jobName: string;
  mode: "full" | "incremental" | "callback";
  status: "queued" | "running" | "completed" | "failed";
  startedAt: string;
  finishedAt: string | null;
  details: string;
};

export type SyncSnapshot = {
  lastSyncLabel: string;
  pendingCallbacks: number;
  processedCallbacks: number;
  runs: SyncRun[];
};

// ============================================================
// Settings
// ============================================================

export type SettingsSnapshot = {
  appName: string;
  deploymentMode: string;
  supabaseReady: boolean;
  mpesaReady: boolean;
  dbSchemaReady: boolean;
  nextSteps: string[];
};

// ============================================================
// Guarantor
// ============================================================

export type GuarantorRecord = {
  id: string;
  clientId: string;
  name: string;
  relation?: string;
  phone?: string;
  idNumber?: string;
  membershipNumber?: string;
  guaranteedAmount: number;
  signatureConfirmed: boolean;
  address?: string;
};

// ============================================================
// Collateral
// ============================================================

export type CollateralRecord = {
  id: string;
  clientId: string;
  collateralType: string;
  makeModel?: string;
  serialNumber?: string;
  description?: string;
  valueAmount: number;
  location?: string;
  currentOwner?: string;
  remarks?: string;
  jointRegistrationFeeOption?: "Added to Loan" | "Deducted from Loan";
  photosAttached: boolean;
  documentPath?: string;
};

// ============================================================
// Client Visit
// ============================================================

export type ClientVisitRecord = {
  id: string;
  clientId: string;
  loanId?: string;
  officerId?: string;
  locationType: "home" | "business" | "live";
  sourceType: "field_visit" | "member_confirmation" | "browser" | "manual";
  latitude: number;
  longitude: number;
  accuracy?: number;
  locationDescription?: string;
  landmarkDescription?: string;
  houseColor?: string;
  businessType?: string;
  appraisalNotes?: string;
  photoPath?: string;
  visitedAt: string;
};

// ============================================================
// Follow-up
// ============================================================

export type FollowupRecord = {
  id: string;
  clientId: string;
  officerId?: string;
  visitDate: string;
  location?: string;
  notes?: string;
  outcome?: string;
  geoLat?: number;
  geoLng?: number;
};

// ============================================================
// Next of Kin
// ============================================================

export type NextOfKinRecord = {
  id: string;
  clientId: string;
  name: string;
  relation?: string;
  phone?: string;
  address?: string;
};

// ============================================================
// Platform Fee
// ============================================================

export type PlatformFeeRecord = {
  id: string;
  feeName: string;
  amount: number;
  effectiveDate: string;
  scopeMode: "all_members" | "current_members_only" | "future_members_only";
  isActive: boolean;
  notes?: string;
};

// ============================================================
// Login / Auth
// ============================================================

export type LoginCredentials = {
  identity: string;
  password: string;
};

export type AuthResponse = {
  success: boolean;
  user?: {
    id: string;
    email?: string;
    phone?: string;
    role: Role;
    fullName: string;
  };
  error?: string;
  requiresMfa?: boolean;
};
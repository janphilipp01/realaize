// ─── Core Domain Types ───────────────────────────────────────────────────────

export type UsageType = 'Wohnen' | 'Büro' | 'Einzelhandel' | 'Logistik' | 'Mixed Use';
export type AssetStatus = 'Bestand' | 'Acquisition' | 'Disposed';
export type DealStage = 'Screening' | 'LOI' | 'Due Diligence' | 'Signing' | 'Closing';
export type CovenantStatus = 'OK' | 'Warning' | 'Breach';
export type DocumentCategory = 'Kaufvertrag' | 'Mietvertrag' | 'Finanzierung' | 'Gutachten' | 'Due Diligence' | 'IC Memo' | 'Sonstiges';
export type RecommendationType = 'Miete' | 'Kaufpreis' | 'Finanzierung' | 'Allgemein';
export type ConfidenceLevel = 'Hoch' | 'Mittel' | 'Niedrig';

export interface Asset {
  id: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  usageType: UsageType;
  status: AssetStatus;
  acquisitionDate: string;
  purchasePrice: number; // EUR
  currentValue: number; // EUR — current valuation / appraisal
  totalArea: number; // sqm
  lettableArea: number; // sqm
  occupancyRate: number; // 0-1
  annualRent: number; // EUR gross annual rent
  // Operating cost breakdown (editable)
  operatingCosts: AssetOperatingCosts;
  units: Unit[];
  debtInstruments: DebtInstrument[];
  covenants: Covenant[];
  cashFlows: CashFlowEntry[];
  documents: Document[];
  capexProjects: CapexProject[];
  completenessScore: number; // 0-100
  imageUrl?: string;
  notes?: string;
}

// Operating costs per asset — mirrors underwriting structure
export interface AssetOperatingCosts {
  vacancyRatePercent: number;       // e.g. 5 for 5%
  managementCostPercent: number;    // of gross rent, e.g. 3
  maintenanceReservePerSqm: number; // EUR/sqm/year
  nonRecoverableOpex: number;       // EUR/year
  otherOperatingIncome: number;     // EUR/year (e.g. parking, antennas)
}

export interface Unit {
  id: string;
  assetId: string;
  unitNumber: string;
  floor: number;
  area: number; // sqm
  usageType: UsageType;
  tenant?: string;
  rentPerSqm: number;
  monthlyRent: number;
  leaseStart?: string;
  leaseEnd?: string;
  leaseType: 'Vermietet' | 'Leerstand' | 'Eigennutzung';
}

export interface DebtInstrument {
  id: string;
  assetId: string;
  lender: string;
  type: 'Senior' | 'Mezzanine' | 'Junior';
  amount: number; // EUR
  outstandingAmount: number; // EUR
  interestRate: number; // percent p.a.
  interestType: 'Fest' | 'Variabel';
  maturityDate: string;
  amortizationRate: number; // percent p.a.
  drawdownDate: string;
  currency: 'EUR';
  covenants: Covenant[];
}

export interface Covenant {
  id: string;
  debtId?: string;
  assetId?: string;
  name: string;
  type: 'LTV' | 'DSCR' | 'ICR' | 'Custom';
  threshold: number;
  currentValue: number;
  status: CovenantStatus;
  testDate: string;
  description?: string;
}

export interface CashFlowEntry {
  id: string;
  assetId: string;
  period: string; // YYYY-MM
  category: 'Mieteinnahmen' | 'Nebenkosten' | 'Instandhaltung' | 'Verwaltung' | 'Capex' | 'Finanzierung' | 'Sonstiges';
  description: string;
  amount: number; // positive = inflow, negative = outflow
  isForecast: boolean;
}

export interface CapexProject {
  id: string;
  assetId: string;
  name: string;
  budget: number;
  spent: number;
  status: 'Geplant' | 'Laufend' | 'Abgeschlossen';
  startDate: string;
  endDate: string;
}

export interface Document {
  id: string;
  assetId?: string;
  dealId?: string;
  name: string;
  category: DocumentCategory;
  uploadDate: string;
  fileSize: string;
  tags: string[];
  linkedObject?: string;
  url?: string;
  uploadedBy: string;
  // For local storage — base64 encoded file data (until Supabase migration)
  fileData?: string;
  mimeType?: string;
}

// ─── Acquisition ─────────────────────────────────────────────────────────────

export type DealType = 'Investment' | 'Development';

export interface AcquisitionDeal {
  id: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  usageType: UsageType;
  dealType: DealType; // Investment-Asset or Development-Asset
  stage: DealStage;
  askingPrice: number;
  underwritingAssumptions: UnderwritingAssumptions;
  financingAssumptions: FinancingAssumptions;
  documents: Document[];
  activityLog: ActivityEntry[];
  aiRecommendations: AIRecommendation[];
  icMemo?: ICMemo;
  notes?: string;
  completenessScore: number;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  targetYield?: number;
  broker?: string;
  vendorName?: string;
  totalArea?: number;
  marketLocationId?: string;
  // Development-specific fields (only when dealType === 'Development')
  developmentType?: 'Neubau' | 'Kernsanierung' | 'Modernisierung' | 'Umbau' | 'Aufstockung' | 'Anbau';
  estimatedDevBudget?: number;  // total construction budget
  estimatedDevDuration?: number; // months
  projectedRentAfterDev?: number; // annual rent after completion
}

export interface UnderwritingAssumptions {
  purchasePrice: number;
  closingCostPercent: number; // e.g. 6.5 for 6.5%
  brokerFeePercent: number;
  initialCapex: number;
  annualGrossRent: number;
  vacancyRatePercent: number;
  managementCostPercent: number; // of gross rent
  maintenanceReservePerSqm: number;
  nonRecoverableOpex: number;
  area: number; // sqm
  rentPerSqm: number; // monthly
  otherOperatingIncome: number;
}

export interface FinancingAssumptions {
  loanAmount: number;
  interestRate: number; // percent
  amortizationRate: number; // percent
  loanTerm: number; // years
  lenderName: string;
  fixedRatePeriod: number; // years
}

export interface ICMemo {
  dealId: string;
  executiveSummary: string;
  investmentRationale: string;
  riskFactors: string[];
  exitStrategy: string;
  recommendedAction: string;
  preparedBy: string;
  preparedAt: string;
}

export interface ActivityEntry {
  id: string;
  dealId?: string;
  assetId?: string;
  type: 'Note' | 'Document' | 'Status' | 'Transfer' | 'Export' | 'AI' | 'Edit';
  title: string;
  description: string;
  timestamp: string;
  user: string;
}

// ─── AI / Recommendations ────────────────────────────────────────────────────

export interface AIRecommendation {
  id: string;
  dealId: string;
  type: RecommendationType;
  title: string;
  body: string;
  confidence: ConfidenceLevel;
  deviationPercent?: number;
  benchmarkLabel?: string;
  benchmarkValue?: number;
  userValue?: number;
  generatedAt: string;
  isAlert: boolean;
}

// ─── Market Intelligence ─────────────────────────────────────────────────────

export interface MarketLocation {
  id: string;
  city: string;
  submarket: string;
  region: string;
  benchmarks: MarketBenchmark[];
  updateLog: MarketUpdateEntry[];
  lastUpdated: string;
}

export interface MarketBenchmark {
  id: string;
  locationId: string;
  usageType: UsageType;
  rentMin: number; // EUR/sqm/month
  rentMax: number;
  rentMedian: number;
  purchasePriceMin: number; // EUR/sqm
  purchasePriceMax: number;
  purchasePriceMedian: number;
  multiplierMin: number;
  multiplierMax: number;
  multiplierMedian: number;
  vacancyRatePercent: number;
  confidenceScore: number; // 0-100
  sourceLabel: string;
  lastUpdated: string;
  notes?: string;
}

export interface MarketUpdateEntry {
  id: string;
  locationId: string;
  timestamp: string;
  updatedBy: string;
  changes: string;
  sourceLabel: string;
}

// ─── Computed KPIs ───────────────────────────────────────────────────────────

export interface DealKPIs {
  totalAcquisitionCost: number;
  closingCosts: number;
  brokerFee: number;
  kaufpreisfaktor: number;
  bruttoanfangsrendite: number; // percent
  noi: number;
  netInitialYield: number; // percent
  equityInvested: number;
  annualDebtService: number;
  cashOnCashReturn: number; // percent
  dscr: number;
  ltv: number; // percent
  interestCoverageProxy: number;
  liquidityRunway?: number; // months
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: 'Asset' | 'Deal' | 'Document' | 'MarketData' | 'Export' | 'AI';
  entityId: string;
  entityName: string;
  user: string;
  timestamp: string;
  details: string;
}


export interface KPIFormulaDetail {
  label: string;
  formula: string;
  inputs: { label: string; value: string }[];
  result: string;
  interpretation: string;
  status: 'good' | 'warning' | 'danger' | 'neutral';
}

// ─── Development ─────────────────────────────────────────────────────────────

export type DevelopmentStatus = 'Planung' | 'Genehmigung' | 'Ausschreibung' | 'Bau' | 'Abnahme' | 'Fertiggestellt';
export type GeverkCategory =
  | 'Abbruch & Entsorgung' | 'Rohbau' | 'Dach & Abdichtung'
  | 'Fassade & Außenanlagen' | 'Fenster & Türen' | 'Innenausbau'
  | 'TGA – Heizung' | 'TGA – Sanitär' | 'TGA – Elektro' | 'TGA – Lüftung'
  | 'Aufzug' | 'Außenanlagen & Tiefbau' | 'Planung & Architektur'
  | 'Genehmigungen & Gebühren' | 'Reserve / Unvorhergesehenes' | 'Sonstiges';

export interface GeverkPosition {
  id: string;
  developmentId: string;
  category: GeverkCategory;
  description: string;
  unit: string; // m², Pauschal, Stk
  quantity: number;
  underwritingBudget: number; // EUR total
  benchmarkPerUnit?: number; // EUR/unit from advisor
  offerAmount?: number;
  contractAmount?: number;
  actualCost?: number;
  contractorId?: string; // linked address book contact
  status: 'Offen' | 'Ausgeschrieben' | 'Angebot' | 'Vergeben' | 'Abgeschlossen';
  ganttStart?: string; // YYYY-MM
  ganttDurationMonths?: number;
  notes?: string;
}

export interface DevelopmentProject {
  id: string;
  dealId?: string; // source acquisition deal
  assetId?: string; // if from existing asset
  name: string;
  address: string;
  city: string;
  zip: string;
  usageType: UsageType;
  developmentType: 'Neubau' | 'Kernsanierung' | 'Modernisierung' | 'Umbau' | 'Aufstockung' | 'Anbau';
  status: DevelopmentStatus;
  totalArea: number;
  startDate: string;
  plannedEndDate: string;
  actualEndDate?: string;
  gewerke: GeverkPosition[];
  documents: Document[];
  activityLog: ActivityEntry[];
  advisorMessages: AdvisorMessage[];
  images: ProjectImage[];
  completenessScore: number;
  notes?: string;
  // Financial
  purchasePrice: number;
  totalBudget: number; // sum of underwriting gewerke
  // Hold/Sell analysis
  projectedSalePrice?: number;
  underwritingCashFlows?: AnnualCashFlow[];
  holdSellDecision?: 'Hold' | 'Sell' | 'Offen';
  irr10Year?: number;
  sellNetProfit?: number;
  sellIRR?: number;
}

export interface AnnualCashFlow {
  year: number;
  noi: number;
  debtService: number;
  netCashFlow: number;
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'advisor';
  content: string;
  timestamp: string;
  suggestedPositions?: Partial<GeverkPosition>[];
}

export interface ProjectImage {
  id: string;
  entityId: string; // assetId, dealId, developmentId, saleId
  entityType: 'Asset' | 'Deal' | 'Development' | 'Sale';
  url: string; // base64 or blob URL
  name: string;
  isTitleImage: boolean;
  uploadedAt: string;
}

// ─── Sales ───────────────────────────────────────────────────────────────────

export type SaleStatus = 'Vorbereitung' | 'Aktiv' | 'Closing' | 'Verkauft' | 'Zurückgezogen';
export type BuyerStage = 'Kontaktiert' | 'Besichtigung' | 'NDA' | 'Angebot' | 'LOI' | 'Due Diligence' | 'Signing' | 'Closing' | 'Abgesagt';

export interface SaleObject {
  id: string;
  sourceType: 'Asset' | 'Development';
  sourceId: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  usageType: UsageType;
  status: SaleStatus;
  targetPrice: number;
  minimumPrice: number;
  askingPrice: number;
  totalCost: number; // purchase + development costs
  buyers: BuyerLead[];
  documents: Document[];
  activityLog: ActivityEntry[];
  images: ProjectImage[];
  createdAt: string;
  updatedAt: string;
  notes?: string;
  // sold fields
  soldAt?: string;
  soldPrice?: number;
  disposalGain?: number;
  // from source
  annualRent?: number;
  area?: number;
  noi?: number;
}

export interface BuyerLead {
  id: string;
  saleId: string;
  contactId?: string; // address book ref
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  stage: BuyerStage;
  offeredPrice?: number;
  notes?: string;
  lastContact: string;
  createdAt: string;
}

// ─── Address Book ─────────────────────────────────────────────────────────────

export type ContactCategory =
  | 'Handwerker' | 'Architekt & Planer' | 'Property Manager' | 'Facility Manager'
  | 'Hausverwaltung' | 'Mieter' | 'Potentieller Mieter' | 'Banker & Finanzierer'
  | 'Makler' | 'Potentieller Käufer' | 'Käufer' | 'Potentieller Investor'
  | 'Investor' | 'Stadtverwaltung' | 'Anderer Eigentümer' | 'Sonstiges';

export type HandwerkerSubcategory =
  | 'Rohbau' | 'Elektro' | 'Sanitär' | 'Heizung' | 'Trockenbau'
  | 'Maler & Lackierer' | 'Dach' | 'Fassade' | 'Aufzug' | 'Lüftung'
  | 'Fliesen' | 'Böden' | 'Schreiner' | 'Metall & Stahl' | 'Sonstiges';

export interface Contact {
  id: string;
  category: ContactCategory;
  subcategory?: HandwerkerSubcategory; // only for Handwerker
  firstName: string;
  lastName: string;
  company?: string;
  position?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  website?: string;
  notes?: string;
  linkedObjectIds?: string[]; // asset/deal/dev/sale IDs
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

// ─── News & Daily Intelligence ──────────────────────────────────────────────

export type NewsCategory =
  | 'Deals & Transactions'
  | 'Leasing & Lettings'
  | 'Interest Rates & Monetary Policy'
  | 'Regulation & Policy'
  | 'Capital Markets'
  | 'Macro & Global Economy';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;       // 1-2 sentence summary
  sourceLabel: string;    // e.g. "Immobilien Zeitung", "Handelsblatt"
  sourceUrl: string;      // link to original article
  category: NewsCategory;
  publishedAt: string;    // ISO date
  impactRating: 'high' | 'medium' | 'low'; // relevance for RE market
}

export interface DailyIntelligenceReport {
  id: string;
  date: string;           // YYYY-MM-DD
  articles: NewsArticle[];
  executiveSummary: string;  // AI-generated daily briefing
  marketImpactAnalysis: string; // AI analysis of impact on German RE
  generatedAt: string;    // ISO timestamp
}

// ─── Deal Radar / Transaction Finder ────────────────────────────────────────

export type RadarListingStatus = 'new' | 'reviewed' | 'shortlisted' | 'dismissed' | 'converted';

export interface DealRadarSearchCriteria {
  cities: string[];            // e.g. ['Berlin', 'München', 'Hamburg']
  usageTypes: UsageType[];     // e.g. ['Wohnen', 'Büro']
  priceMin: number;            // EUR
  priceMax: number;            // EUR
  minArea: number;             // sqm
  maxArea: number;             // sqm
}

export interface DealRadarListing {
  id: string;
  title: string;
  address: string;
  city: string;
  zip: string;
  usageType: UsageType;
  askingPrice: number;
  pricePerSqm: number;
  totalArea: number;
  yearBuilt?: number;
  description: string;
  sourceLabel: string;         // e.g. 'ImmobilienScout24', 'CBRE', 'JLL'
  sourceUrl: string;
  status: RadarListingStatus;
  aiNotes: string;             // AI assessment / quick take
  estimatedYield?: number;     // AI-estimated rough NIY
  imageUrl?: string;
  foundAt: string;             // ISO timestamp
  reviewedAt?: string;
  reviewNote?: string;
}

// ─── Calendar / Appointments ─────────────────────────────────────────────────

export type AppointmentCategory =
  | 'Kauf' | 'Verkauf' | 'Vermietung' | 'Bau'
  | 'Verwaltung' | 'Finanzierung' | 'Business Development'
  | 'Steuer' | 'Recht';

export interface Appointment {
  id: string;
  title: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  endTime?: string;    // HH:MM
  location?: string;
  participants?: string;
  assetId?: string;    // optional link to portfolio asset
  category: AppointmentCategory;
  notes?: string;
  createdAt: string;
}

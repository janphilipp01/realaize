import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, AlertTriangle, FileText, Search, X, ChevronRight, ChevronLeft,
  CheckCircle, Building2, HardHat, Trash2, TrendingUp, BarChart3, Zap,
  Home, Briefcase, Package, ShoppingBag, Layers, Clock, DollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStore } from '../store/useStore';
import { PageHeader, StageBadge, CompletenessRing, GlassPanel, KPICard, Modal } from '../components/shared';
import { computeDealKPIs, formatEUR, formatPct, formatX } from '../utils/kpiEngine';
import {
  computePropertyNOI, computePropertyKPIs, computePropertyCashFlow,
  computeTotalAcquisitionCosts, computeTotalDevBudget, computeTotalArea, computeAnnualRent,
  buildMarketAssumptionsFromRentRoll,
} from '../utils/propertyCashFlowModel';
import { useLanguage } from '../i18n/LanguageContext';
import type { AcquisitionDeal, DealType, UsageType, FloorLevel, RentRollUnit, GewerkePosition, AcquisitionCostItem, FinancingTranche, PropertyData, CostDistribution } from '../models/types';
import { createDefaultPropertyData, DEFAULT_ACQUISITION_COSTS, DEFAULT_GEWERKE_CATEGORIES, getDefaultErvGrowth, getDefaultExitCapRate } from '../models/types';

// ── Constants ────────────────────────────────────────────────────────────────

const STAGE_ORDER: AcquisitionDeal['stage'][] = ['Screening', 'Due Diligence', 'Verhandlung', 'Beurkundung'];
const USAGE_TYPES: UsageType[] = ['Wohnen', 'Büro', 'Einzelhandel', 'Logistik', 'Mixed Use'];
const FLOOR_LEVELS: FloorLevel[] = ['TG', 'KG', 'EG', '1.OG', '2.OG', '3.OG', '4.OG', '5.OG', '6.OG', 'DG'];
const RENT_ROLL_USAGE = ['Wohnen', 'Büro', 'Einzelhandel', 'Lager', 'Stellplatz', 'Sonstiges'] as const;
const DEV_TYPES = ['Neubau', 'Kernsanierung', 'Modernisierung', 'Umbau', 'Aufstockung', 'Anbau'] as const;
const USAGE_ICON: Record<string, React.ReactNode> = {
  'Wohnen': <Home size={20} />, 'Büro': <Briefcase size={20} />,
  'Logistik': <Package size={20} />, 'Einzelhandel': <ShoppingBag size={20} />,
  'Mixed Use': <Layers size={20} />,
};
const USAGE_COLORS: Record<string, string> = {
  'Büro': '#c9a96e', 'Wohnen': '#60a5fa', 'Logistik': '#4ade80',
  'Einzelhandel': '#f87171', 'Mixed Use': '#a78bfa',
};
const labelS: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4, display: 'block' };
const inputS: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 10, fontSize: 13, background: 'rgba(255,255,255,0.85)', outline: 'none' };
const thS: React.CSSProperties = { padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase' };
const tdS: React.CSSProperties = { padding: '6px 8px', textAlign: 'right', fontSize: 11, fontFamily: 'ui-monospace, monospace', color: '#1c1c1e' };

// ── DealCard ─────────────────────────────────────────────────────────────────

function DealCard({ deal }: { deal: AcquisitionDeal }) {
  const kpis = computeDealKPIs(deal.underwritingAssumptions, deal.financingAssumptions);
  const alerts = deal.aiRecommendations.filter(r => r.isAlert);
  const hasDeviation = alerts.some(a => (a.deviationPercent || 0) > 10);
  const { t, lang } = useLanguage();
  const dateLocale = lang === 'de' ? 'de-DE' : 'en-GB';
  const pd = deal.propertyData;

  const niy = pd
    ? (pd.unitsAsIs.length > 0 && pd.purchasePrice > 0 ? (computePropertyNOI(pd, false).noi / pd.purchasePrice) * 100 : kpis.netInitialYield)
    : kpis.netInitialYield;
  const ltv = pd && pd.financingTranches.length > 0
    ? (pd.financingTranches.reduce((s, t) => s + t.loanAmount, 0) / (pd.purchasePrice || 1)) * 100
    : kpis.ltv;

  return (
    <Link to={`/acquisition/${deal.id}`} style={{ textDecoration: 'none' }}>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', border: hasDeviation ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.10)' }}>
        <div style={{ padding: '18px 20px 14px', background: `linear-gradient(135deg, rgba(${deal.usageType === 'Büro' ? '201,169,110' : deal.usageType === 'Wohnen' ? '96,165,250' : deal.usageType === 'Logistik' ? '74,222,128' : '248,113,113'},0.08), transparent)`, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', margin: 0, lineHeight: 1.3 }}>{deal.name}</h3>
            <CompletenessRing score={deal.completenessScore} size={36} />
          </div>
          <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.45)' }}>{deal.address}, {deal.city}</div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StageBadge stage={deal.stage} />
            <span className="badge-neutral">{deal.usageType}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: deal.dealType === 'Development' ? 'rgba(167,139,250,0.12)' : 'rgba(201,169,110,0.12)', color: deal.dealType === 'Development' ? '#a78bfa' : '#c9a96e' }}>
              {deal.dealType}
            </span>
            {hasDeviation && <span className="badge-warning flex items-center gap-1"><AlertTriangle size={10} /> AI Warnung</span>}
          </div>
        </div>
        <div style={{ padding: '14px 20px' }}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Asking Price</div><div style={{ fontSize: 16, fontWeight: 700, color: '#007aff' }}>{formatEUR(deal.askingPrice, true)}</div></div>
            <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>NIY</div><div style={{ fontSize: 16, fontWeight: 700, color: niy > 4.5 ? '#4ade80' : niy > 3 ? '#fbbf24' : '#f87171' }}>{formatPct(niy)}</div></div>
            <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Multiple</div><div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>{formatX(kpis.kaufpreisfaktor)}</div></div>
            <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>LTV</div><div style={{ fontSize: 14, fontWeight: 600, color: ltv < 65 ? '#4ade80' : '#fbbf24' }}>{formatPct(ltv, 1)}</div></div>
          </div>
        </div>
        <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" style={{ color: 'rgba(60,60,67,0.45)', fontSize: 11 }}><FileText size={11} /> {deal.documents.length} Docs</div>
            {deal.broker && <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>{deal.broker}</div>}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>{new Date(deal.updatedAt).toLocaleDateString(dateLocale)}</div>
        </div>
      </div>
    </Link>
  );
}

// ── Wizard helpers ────────────────────────────────────────────────────────────

function newUnit(floor: FloorLevel = 'EG'): RentRollUnit {
  return {
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitNumber: '', floor, area: 0, usageType: 'Wohnen', tenant: '',
    leaseStart: '', leaseEnd: '', currentRentPerSqm: 0, ervPerSqm: 0, monthlyRent: 0,
    indexationInterval: 'jährlich', indexationRate: 2.0, nonRecoverableOpex: 0,
  };
}

function newGewerk(category = 'Sonstiges'): GewerkePosition {
  return {
    id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category, description: '', budgetInputMode: 'pauschal', budgetAmount: 0,
    budgetTotal: 0, costPerSqm: 0, startWeek: 1, durationWeeks: 12, endWeek: 13,
    costDistribution: 'linear', status: 'Geplant',
  };
}

function newTranche(): FinancingTranche {
  return {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: 'Senior Darlehen', financingType: 'Bankdarlehen',
    loanAmount: 0, interestRate: 4.0, fixedRatePeriod: 5,
    loanTerm: 10, repaymentType: 'Annuität', amortizationRate: 2.0,
  };
}

// ── Step progress bar ──────────────────────────────────────────────────────

function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0" style={{ overflowX: 'auto', paddingBottom: 2 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 70 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
              background: i < current ? '#34c759' : i === current ? '#007aff' : 'rgba(0,0,0,0.08)',
              color: i <= current ? '#fff' : 'rgba(60,60,67,0.45)',
              transition: 'all 0.2s',
            }}>
              {i < current ? <CheckCircle size={14} /> : i + 1}
            </div>
            <div style={{ fontSize: 9, fontWeight: 600, color: i === current ? '#007aff' : 'rgba(60,60,67,0.4)', textAlign: 'center', lineHeight: 1.2 }}>{s}</div>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 2, minWidth: 10, background: i < current ? '#34c759' : 'rgba(0,0,0,0.08)', margin: '0 2px', borderRadius: 1, marginBottom: 18 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

function NewDealWizard({ onClose, onSave }: { onClose: () => void; onSave: (deal: AcquisitionDeal) => void }) {
  const { settings } = useStore();
  const [step, setStep] = useState(0);
  const [pd, setPd] = useState<PropertyData>(() => createDefaultPropertyData({
    holdingPeriodYears: settings.defaultHoldingPeriod,
    contingencyPercent: settings.defaultContingencyPercent,
    operatingCosts: {
      vacancyRatePercent: settings.defaultVacancyRate,
      managementCostPercent: settings.defaultMgmtCostPct,
      maintenanceReservePerSqm: settings.defaultMaintenancePerSqm,
      insurancePerYear: 0, propertyTaxPerYear: 0, otherOpexPerYear: 0, otherIncomePerYear: 0,
    },
    marketAssumptions: {
      perUsageType: [], opexInflationPercent: settings.defaultOpexInflationPercent ?? 2.5,
      capexInflationPercent: settings.defaultCapexInflationPercent ?? 3.0,
      salesCostPercent: settings.defaultSalesCostPercent ?? 1.5,
    },
  }));

  const [rentRollTab, setRentRollTab] = useState<'ist' | 'ziel'>('ist');
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [qeCount, setQeCount] = useState(10);
  const [qeArea, setQeArea] = useState(50);
  const [qeUsage, setQeUsage] = useState<typeof RENT_ROLL_USAGE[number]>('Wohnen');
  const [qeRent, setQeRent] = useState(12);
  const [qeERV, setQeERV] = useState(14);

  const isDev = pd.dealType === 'Development';

  const setPdField = <K extends keyof PropertyData>(key: K, val: PropertyData[K]) => {
    setPd(p => ({ ...p, [key]: val }));
  };

  const stepTitles = useMemo(() => {
    const base = ['Stammdaten', 'Ankauf', 'Rent Roll', 'Opex', 'Markt', 'Finanzierung', 'Cashflow', 'Zusammenfassung'];
    if (isDev) { base.splice(5, 0, 'Development'); }
    return base;
  }, [isDev]);

  const maxStep = stepTitles.length - 1;

  const stepFor = (name: string) => stepTitles.indexOf(name);

  const noiIst = useMemo(() => pd.unitsAsIs.length > 0 ? computePropertyNOI(pd, false) : null, [pd]);
  const kpis = useMemo(() => {
    if (pd.purchasePrice > 0 && pd.unitsAsIs.length > 0) return computePropertyKPIs(pd);
    return null;
  }, [pd]);

  const totalAcqCosts = computeTotalAcquisitionCosts(pd.purchasePrice, pd.acquisitionCosts);
  const totalDevBudget = isDev ? computeTotalDevBudget(pd.gewerke, pd.contingencyPercent) : 0;
  const totalCapReq = pd.purchasePrice + totalAcqCosts + totalDevBudget;
  const totalLoan = pd.financingTranches.reduce((s, t) => s + t.loanAmount, 0);
  const equity = Math.max(totalCapReq - totalLoan, 0);

  const updateUnit = (list: 'unitsAsIs' | 'unitsTarget', id: string, patch: Partial<RentRollUnit>) => {
    setPd(p => ({
      ...p,
      [list]: p[list].map(u => u.id === id ? { ...u, ...patch, monthlyRent: patch.currentRentPerSqm !== undefined ? (patch.area ?? u.area) * (patch.currentRentPerSqm ?? u.currentRentPerSqm) : patch.area !== undefined ? patch.area * u.currentRentPerSqm : u.monthlyRent } : u),
    }));
  };

  const addQuickEntryUnits = () => {
    const added: RentRollUnit[] = [];
    for (let i = 0; i < qeCount; i++) {
      const fl = FLOOR_LEVELS[Math.min(2 + Math.floor(i / 4), FLOOR_LEVELS.length - 1)];
      added.push({
        id: `u-${Date.now()}-${i}`, unitNumber: `${fl.replace('.', '')}-${String(i + 1).padStart(2, '0')}`,
        floor: fl, area: qeArea, usageType: qeUsage, tenant: '',
        leaseStart: '', leaseEnd: '',
        currentRentPerSqm: qeRent, ervPerSqm: qeERV,
        monthlyRent: qeArea * qeRent,
        indexationInterval: 'jährlich', indexationRate: 2.0, nonRecoverableOpex: 0,
      });
    }
    setPd(p => ({ ...p, unitsAsIs: [...p.unitsAsIs, ...added] }));
    setShowQuickEntry(false);
  };

  const syncMarketAssumptionsFromRentRoll = () => {
    const allUnits = rentRollTab === 'ist' ? pd.unitsAsIs : pd.unitsTarget;
    if (allUnits.length === 0) return;
    const updated = buildMarketAssumptionsFromRentRoll(allUnits, pd.marketAssumptions, getDefaultErvGrowth, getDefaultExitCapRate);
    setPd(p => ({ ...p, marketAssumptions: updated }));
  };

  const renderRentRollTable = (list: 'unitsAsIs' | 'unitsTarget') => {
    const units = pd[list];
    return (
      <div style={{ overflowX: 'auto' }}>
        <div className="flex items-center justify-between mb-2">
          <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>{units.length} Einheiten · {computeTotalArea(units).toLocaleString('de-DE')} m² · Jahresmiete {formatEUR(computeAnnualRent(units), true)}</div>
          <div className="flex gap-2">
            <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => setShowQuickEntry(true)}>+ Schnell-Erfassung</button>
            <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => setPd(p => ({ ...p, [list]: [...p[list], newUnit()] }))}>+ Einheit</button>
          </div>
        </div>
        {units.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10" style={{ color: 'rgba(60,60,67,0.35)' }}>
            <Building2 size={28} />
            <div style={{ fontSize: 13 }}>Noch keine Einheiten. Füge Einheiten manuell hinzu oder nutze Schnell-Erfassung.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 780 }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                  {['#', 'Etage', 'Fläche m²', 'Nutzung', 'Mieter', 'Ist €/m²', 'ERV €/m²', 'Monatl. Miete', 'Mietende', ''].map(h => (
                    <th key={h} style={{ ...thS, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {units.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ ...tdS, textAlign: 'left', paddingLeft: 10 }}><input style={{ ...inputS, width: 60, padding: '4px 6px', fontSize: 11 }} value={u.unitNumber} onChange={e => updateUnit(list, u.id, { unitNumber: e.target.value })} /></td>
                    <td style={tdS}><select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={u.floor} onChange={e => updateUnit(list, u.id, { floor: e.target.value as FloorLevel })}>{FLOOR_LEVELS.map(f => <option key={f}>{f}</option>)}</select></td>
                    <td style={tdS}><input type="number" style={{ ...inputS, width: 70, padding: '4px 6px', fontSize: 11 }} value={u.area || ''} onChange={e => { const a = parseFloat(e.target.value) || 0; updateUnit(list, u.id, { area: a, monthlyRent: a * u.currentRentPerSqm }); }} /></td>
                    <td style={tdS}><select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={u.usageType} onChange={e => updateUnit(list, u.id, { usageType: e.target.value as any })}>{RENT_ROLL_USAGE.map(t => <option key={t}>{t}</option>)}</select></td>
                    <td style={tdS}><input style={{ ...inputS, width: 90, padding: '4px 6px', fontSize: 11 }} value={u.tenant} onChange={e => updateUnit(list, u.id, { tenant: e.target.value })} placeholder="—" /></td>
                    <td style={tdS}><input type="number" step="0.5" style={{ ...inputS, width: 65, padding: '4px 6px', fontSize: 11 }} value={u.currentRentPerSqm || ''} onChange={e => { const r = parseFloat(e.target.value) || 0; updateUnit(list, u.id, { currentRentPerSqm: r, monthlyRent: u.area * r }); }} /></td>
                    <td style={tdS}><input type="number" step="0.5" style={{ ...inputS, width: 65, padding: '4px 6px', fontSize: 11 }} value={u.ervPerSqm || ''} onChange={e => updateUnit(list, u.id, { ervPerSqm: parseFloat(e.target.value) || 0 })} /></td>
                    <td style={{ ...tdS, color: '#007aff', fontWeight: 700 }}>{formatEUR(u.monthlyRent)}</td>
                    <td style={tdS}><input type="date" style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={u.leaseEnd} onChange={e => updateUnit(list, u.id, { leaseEnd: e.target.value })} /></td>
                    <td style={tdS}><button onClick={() => setPd(p => ({ ...p, [list]: p[list].filter(x => x.id !== u.id) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    const filled = [pd.name, pd.city, pd.purchasePrice, pd.unitsAsIs.length, pd.financingTranches.length].filter(Boolean).length;
    const completeness = Math.round((filled / 5) * 100);
    const deal: AcquisitionDeal = {
      id: `deal-${Date.now()}`,
      name: pd.name || `Neues Deal – ${pd.city}`,
      address: pd.address, city: pd.city, zip: pd.zip,
      usageType: pd.usageType, dealType: pd.dealType,
      stage: 'Screening',
      askingPrice: pd.purchasePrice,
      broker: pd.broker, vendorName: pd.vendor,
      totalArea: computeTotalArea(pd.unitsAsIs),
      underwritingAssumptions: {
        purchasePrice: pd.purchasePrice,
        closingCostPercent: pd.acquisitionCosts.find(c => c.id === 'grest')?.percent || 6.5,
        brokerFeePercent: pd.acquisitionCosts.find(c => c.id === 'makler')?.percent || 1.5,
        initialCapex: totalDevBudget,
        annualGrossRent: computeAnnualRent(pd.unitsAsIs),
        vacancyRatePercent: pd.operatingCosts.vacancyRatePercent,
        managementCostPercent: pd.operatingCosts.managementCostPercent,
        maintenanceReservePerSqm: pd.operatingCosts.maintenanceReservePerSqm,
        nonRecoverableOpex: 0,
        area: computeTotalArea(pd.unitsAsIs),
        rentPerSqm: 0,
        otherOperatingIncome: pd.operatingCosts.otherIncomePerYear,
        ervPerSqm: 0,
        projectedAnnualRent: computeAnnualRent(pd.unitsTarget.length > 0 ? pd.unitsTarget : pd.unitsAsIs),
        contingencyPercent: pd.contingencyPercent,
        startDate: pd.projectStart,
        marketAssumptions: {
          ervGrowthRate: pd.marketAssumptions.perUsageType[0]?.ervGrowthRatePercent || 2.0,
          exitCapRate: pd.marketAssumptions.perUsageType[0]?.exitCapRatePercent || 5.0,
          rentalGrowthRate: 2.0,
          holdingPeriodYears: pd.holdingPeriodYears,
        },
      },
      financingAssumptions: pd.financingTranches.length > 0
        ? { loanAmount: totalLoan, interestRate: pd.financingTranches[0].interestRate, amortizationRate: pd.financingTranches[0].amortizationRate, loanTerm: pd.financingTranches[0].loanTerm, lenderName: '', fixedRatePeriod: pd.financingTranches[0].fixedRatePeriod }
        : { loanAmount: Math.round(pd.purchasePrice * 0.65), interestRate: 4.0, amortizationRate: 2.0, loanTerm: 10, lenderName: '', fixedRatePeriod: 5 },
      documents: [], activityLog: [], aiRecommendations: [],
      completenessScore: completeness, createdAt: now, updatedAt: now,
      developmentType: pd.developmentType as any,
      propertyData: pd,
    };
    onSave(deal);
  };

  // ── Step content ───────────────────────────────────────────────────────────

  const renderStep = () => {
    const s = step;

    // Step 0: Stammdaten
    if (s === 0) return (
      <div className="space-y-5 animate-fade-in">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label style={labelS}>Objektname *</label>
            <input className="input-glass" style={inputS} value={pd.name} onChange={e => setPdField('name', e.target.value)} placeholder="z.B. Schwabing Wohnpark" />
          </div>
          <div className="col-span-2">
            <label style={labelS}>Straße & Hausnummer</label>
            <input className="input-glass" style={inputS} value={pd.address} onChange={e => setPdField('address', e.target.value)} />
          </div>
          <div>
            <label style={labelS}>PLZ</label>
            <input className="input-glass" style={inputS} value={pd.zip} onChange={e => setPdField('zip', e.target.value)} />
          </div>
          <div>
            <label style={labelS}>Stadt *</label>
            <input className="input-glass" style={inputS} value={pd.city} onChange={e => setPdField('city', e.target.value)} />
          </div>
        </div>

        <div>
          <label style={labelS}>Deal-Typ</label>
          <div className="grid grid-cols-2 gap-3">
            {(['Investment', 'Development'] as DealType[]).map(dt => (
              <button key={dt} onClick={() => setPdField('dealType', dt)} style={{
                padding: '16px 20px', borderRadius: 14, border: `2px solid ${pd.dealType === dt ? (dt === 'Development' ? '#a78bfa' : '#007aff') : 'rgba(0,0,0,0.10)'}`,
                background: pd.dealType === dt ? (dt === 'Development' ? 'rgba(167,139,250,0.08)' : 'rgba(0,122,255,0.05)') : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {dt === 'Investment' ? <Building2 size={22} color={pd.dealType === dt ? '#007aff' : '#94a3b8'} /> : <HardHat size={22} color={pd.dealType === dt ? '#a78bfa' : '#94a3b8'} />}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: pd.dealType === dt ? (dt === 'Development' ? '#a78bfa' : '#007aff') : '#1c1c1e' }}>{dt}</div>
                  <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.5)' }}>{dt === 'Investment' ? 'Bestandsobjekt kaufen und halten' : 'Neubau oder Sanierung'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelS}>Nutzungsart</label>
          <div className="grid grid-cols-5 gap-2">
            {USAGE_TYPES.map(u => (
              <button key={u} onClick={() => setPdField('usageType', u)} style={{
                padding: '12px 8px', borderRadius: 12, border: `2px solid ${pd.usageType === u ? (USAGE_COLORS[u] || '#007aff') : 'rgba(0,0,0,0.08)'}`,
                background: pd.usageType === u ? `rgba(${u === 'Büro' ? '201,169,110' : u === 'Wohnen' ? '96,165,250' : u === 'Logistik' ? '74,222,128' : u === 'Einzelhandel' ? '248,113,113' : '167,139,250'},0.08)` : 'transparent',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                color: pd.usageType === u ? (USAGE_COLORS[u] || '#007aff') : '#94a3b8',
              }}>
                {USAGE_ICON[u]}
                <span style={{ fontSize: 10, fontWeight: 600 }}>{u}</span>
              </button>
            ))}
          </div>
        </div>

        {isDev && (
          <div>
            <label style={labelS}>Entwicklungstyp</label>
            <div className="grid grid-cols-3 gap-2">
              {DEV_TYPES.map(dt => (
                <button key={dt} onClick={() => setPdField('developmentType', dt)} style={{
                  padding: '10px 12px', borderRadius: 10, border: `2px solid ${pd.developmentType === dt ? '#a78bfa' : 'rgba(0,0,0,0.08)'}`,
                  background: pd.developmentType === dt ? 'rgba(167,139,250,0.06)' : 'transparent',
                  cursor: 'pointer', fontSize: 12, fontWeight: pd.developmentType === dt ? 700 : 400,
                  color: pd.developmentType === dt ? '#a78bfa' : '#1c1c1e',
                }}>{dt}</button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label style={labelS}>Etagen im Objekt</label>
          <div className="flex flex-wrap gap-2">
            {FLOOR_LEVELS.map(f => (
              <button key={f} onClick={() => {
                const has = pd.floors.includes(f);
                setPdField('floors', has ? pd.floors.filter(x => x !== f) : [...pd.floors, f]);
              }} style={{
                padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${pd.floors.includes(f) ? '#007aff' : 'rgba(0,0,0,0.10)'}`,
                background: pd.floors.includes(f) ? 'rgba(0,122,255,0.08)' : 'transparent', cursor: 'pointer',
                fontSize: 12, fontWeight: pd.floors.includes(f) ? 700 : 400, color: pd.floors.includes(f) ? '#007aff' : '#1c1c1e',
              }}>{f}</button>
            ))}
          </div>
        </div>
      </div>
    );

    // Step 1: Ankauf
    if (s === 1) return (
      <div className="space-y-5 animate-fade-in">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelS}>Verkäufer</label>
            <input className="input-glass" style={inputS} value={pd.vendor} onChange={e => setPdField('vendor', e.target.value)} />
          </div>
          <div>
            <label style={labelS}>Makler / Quelle</label>
            <input className="input-glass" style={inputS} value={pd.broker} onChange={e => setPdField('broker', e.target.value)} />
          </div>
          <div>
            <label style={labelS}>Kaufpreis (€) *</label>
            <input type="number" className="input-glass" style={inputS} value={pd.purchasePrice || ''} onChange={e => setPdField('purchasePrice', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label style={labelS}>Ankaufsdatum</label>
            <input type="date" className="input-glass" style={inputS} value={pd.acquisitionDate} onChange={e => setPdField('acquisitionDate', e.target.value)} />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={labelS}>Erwerbsnebenkosten</label>
            {pd.purchasePrice > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: '#007aff' }}>Gesamt: {formatEUR(totalAcqCosts)} = {formatPct(totalAcqCosts / pd.purchasePrice * 100, 2)}</div>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {pd.acquisitionCosts.map((c, idx) => (
              <div key={c.id} style={{
                padding: '12px 14px', borderRadius: 12, border: `2px solid ${c.active ? '#007aff' : 'rgba(0,0,0,0.08)'}`,
                background: c.active ? 'rgba(0,122,255,0.04)' : 'rgba(0,0,0,0.02)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 6,
              }} onClick={() => {
                const updated = [...pd.acquisitionCosts];
                updated[idx] = { ...c, active: !c.active };
                setPdField('acquisitionCosts', updated);
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.active ? '#007aff' : '#94a3b8' }}>{c.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="number" step="0.1" style={{ ...inputS, width: 60, padding: '4px 6px', fontSize: 12 }}
                    value={c.percent} onClick={e => e.stopPropagation()}
                    onChange={e => {
                      const updated = [...pd.acquisitionCosts];
                      updated[idx] = { ...c, percent: parseFloat(e.target.value) || 0, active: true };
                      setPdField('acquisitionCosts', updated);
                    }} />
                  <span style={{ fontSize: 11, color: 'rgba(60,60,67,0.5)' }}>%</span>
                </div>
                {pd.purchasePrice > 0 && <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)' }}>{formatEUR(pd.purchasePrice * c.percent / 100)}</div>}
              </div>
            ))}
          </div>
        </div>

        {pd.purchasePrice > 0 && (
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(0,122,255,0.05)', border: '1px solid rgba(0,122,255,0.15)' }}>
            <div className="grid grid-cols-3 gap-4">
              <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>Kaufpreis</div><div style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e' }}>{formatEUR(pd.purchasePrice, true)}</div></div>
              <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>Nebenkosten</div><div style={{ fontSize: 15, fontWeight: 700, color: '#fbbf24' }}>{formatEUR(totalAcqCosts, true)}</div></div>
              <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>Gesamtinvestition</div><div style={{ fontSize: 15, fontWeight: 700, color: '#007aff' }}>{formatEUR(pd.purchasePrice + totalAcqCosts, true)}</div></div>
            </div>
          </div>
        )}
      </div>
    );

    // Step 2: Rent Roll
    if (s === 2) return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex gap-1 p-1" style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 10, width: 'fit-content' }}>
          {(['ist', 'ziel'] as const).map(tab => (
            <button key={tab} onClick={() => setRentRollTab(tab)} style={{
              padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: rentRollTab === tab ? '#fff' : 'transparent', color: rentRollTab === tab ? '#007aff' : 'rgba(60,60,67,0.55)',
              boxShadow: rentRollTab === tab ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
            }}>
              {tab === 'ist' ? 'Ist-Zustand' : 'Ziel-Zustand'}
            </button>
          ))}
        </div>
        {renderRentRollTable(rentRollTab === 'ist' ? 'unitsAsIs' : 'unitsTarget')}

        {rentRollTab === 'ziel' && pd.unitsAsIs.length > 0 && pd.unitsTarget.length === 0 && (
          <button className="btn-glass text-sm px-4 py-2 rounded-xl" onClick={() => setPd(p => ({ ...p, unitsTarget: p.unitsAsIs.map(u => ({ ...u, id: `uzt-${Date.now()}-${Math.random().toString(36).slice(2)}` })) }))}>
            Ist-Zustand als Basis übernehmen
          </button>
        )}
      </div>
    );

    // Step 3: Opex
    if (s === 3) return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelS}>Leerstandsquote (%)</label>
            <input type="number" step="0.5" className="input-glass" style={inputS}
              value={pd.operatingCosts.vacancyRatePercent}
              onChange={e => setPd(p => ({ ...p, operatingCosts: { ...p.operatingCosts, vacancyRatePercent: parseFloat(e.target.value) || 0 } }))} />
          </div>
          <div>
            <label style={labelS}>Verwaltungskosten (%)</label>
            <input type="number" step="0.5" className="input-glass" style={inputS}
              value={pd.operatingCosts.managementCostPercent}
              onChange={e => setPd(p => ({ ...p, operatingCosts: { ...p.operatingCosts, managementCostPercent: parseFloat(e.target.value) || 0 } }))} />
          </div>
          <div>
            <label style={labelS}>Instandhaltung (€/m²/Jahr)</label>
            <input type="number" step="1" className="input-glass" style={inputS}
              value={pd.operatingCosts.maintenanceReservePerSqm}
              onChange={e => setPd(p => ({ ...p, operatingCosts: { ...p.operatingCosts, maintenanceReservePerSqm: parseFloat(e.target.value) || 0 } }))} />
          </div>
          <div>
            <label style={labelS}>Versicherung (€/Jahr)</label>
            <input type="number" className="input-glass" style={inputS}
              value={pd.operatingCosts.insurancePerYear || ''}
              onChange={e => setPd(p => ({ ...p, operatingCosts: { ...p.operatingCosts, insurancePerYear: parseFloat(e.target.value) || 0 } }))} />
          </div>
          <div>
            <label style={labelS}>Grundsteuer (€/Jahr)</label>
            <input type="number" className="input-glass" style={inputS}
              value={pd.operatingCosts.propertyTaxPerYear || ''}
              onChange={e => setPd(p => ({ ...p, operatingCosts: { ...p.operatingCosts, propertyTaxPerYear: parseFloat(e.target.value) || 0 } }))} />
          </div>
          <div>
            <label style={labelS}>Sonstige Opex (€/Jahr)</label>
            <input type="number" className="input-glass" style={inputS}
              value={pd.operatingCosts.otherOpexPerYear || ''}
              onChange={e => setPd(p => ({ ...p, operatingCosts: { ...p.operatingCosts, otherOpexPerYear: parseFloat(e.target.value) || 0 } }))} />
          </div>
          <div>
            <label style={labelS}>Sonstige Einnahmen (€/Jahr)</label>
            <input type="number" className="input-glass" style={inputS}
              value={pd.operatingCosts.otherIncomePerYear || ''}
              onChange={e => setPd(p => ({ ...p, operatingCosts: { ...p.operatingCosts, otherIncomePerYear: parseFloat(e.target.value) || 0 } }))} />
          </div>
        </div>
        {noiIst && (
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(60,60,67,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>NOI-Vorschau (Ist)</div>
            <div className="grid grid-cols-4 gap-3">
              {[
                ['Bruttomiete', formatEUR(noiIst.grossRentalIncome, true), '#007aff'],
                ['− Leerstand', formatEUR(noiIst.vacancyLoss, true), '#fbbf24'],
                ['− Opex', formatEUR(noiIst.totalOperatingExpenses, true), '#f87171'],
                ['= NOI', formatEUR(noiIst.noi, true), noiIst.noi > 0 ? '#34c759' : '#f87171'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // Step 4: Markt
    if (s === 4) return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.55)' }}>Marktannahmen je Nutzungsart für die DCF-Bewertung</div>
          <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={syncMarketAssumptionsFromRentRoll}>Aus Rent Roll befüllen</button>
        </div>

        {pd.marketAssumptions.perUsageType.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8" style={{ color: 'rgba(60,60,67,0.35)' }}>
            <TrendingUp size={28} />
            <div style={{ fontSize: 13 }}>Klicke "Aus Rent Roll befüllen" oder füge Nutzungsarten manuell hinzu.</div>
            <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => {
              setPd(p => ({ ...p, marketAssumptions: { ...p.marketAssumptions, perUsageType: [{ usageType: p.usageType, ervFromRentRoll: 0, ervGrowthRatePercent: getDefaultErvGrowth(p.usageType), exitCapRatePercent: getDefaultExitCapRate(p.usageType), exitMultiplier: 100 / getDefaultExitCapRate(p.usageType) }] } }));
            }}>+ Nutzungsart hinzufügen</button>
          </div>
        ) : (
          pd.marketAssumptions.perUsageType.map((m, idx) => (
            <div key={m.usageType} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.01)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: USAGE_COLORS[m.usageType] || '#007aff', marginBottom: 12 }}>{m.usageType}</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label style={labelS}>ERV €/m²/Mon (aus Rent Roll)</label>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', padding: '9px 0' }}>{m.ervFromRentRoll.toFixed(2)} €/m²</div>
                </div>
                <div>
                  <label style={labelS}>ERV-Wachstum p.a. (%)</label>
                  <input type="number" step="0.1" className="input-glass" style={inputS}
                    value={m.ervGrowthRatePercent}
                    onChange={e => {
                      const arr = [...pd.marketAssumptions.perUsageType];
                      arr[idx] = { ...m, ervGrowthRatePercent: parseFloat(e.target.value) || 0 };
                      setPd(p => ({ ...p, marketAssumptions: { ...p.marketAssumptions, perUsageType: arr } }));
                    }} />
                </div>
                <div>
                  <label style={labelS}>Exit-Cap-Rate (%)</label>
                  <input type="number" step="0.1" className="input-glass" style={inputS}
                    value={m.exitCapRatePercent}
                    onChange={e => {
                      const cap = parseFloat(e.target.value) || 0;
                      const arr = [...pd.marketAssumptions.perUsageType];
                      arr[idx] = { ...m, exitCapRatePercent: cap, exitMultiplier: cap > 0 ? 100 / cap : 0 };
                      setPd(p => ({ ...p, marketAssumptions: { ...p.marketAssumptions, perUsageType: arr } }));
                    }} />
                  {m.exitCapRatePercent > 0 && <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', marginTop: 3 }}>= {(100 / m.exitCapRatePercent).toFixed(1)}x Multiple</div>}
                </div>
              </div>
            </div>
          ))
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label style={labelS}>Opex-Inflation p.a. (%)</label>
            <input type="number" step="0.1" className="input-glass" style={inputS}
              value={pd.marketAssumptions.opexInflationPercent}
              onChange={e => setPd(p => ({ ...p, marketAssumptions: { ...p.marketAssumptions, opexInflationPercent: parseFloat(e.target.value) || 0 } }))} />
          </div>
          <div>
            <label style={labelS}>Capex-Inflation p.a. (%)</label>
            <input type="number" step="0.1" className="input-glass" style={inputS}
              value={pd.marketAssumptions.capexInflationPercent}
              onChange={e => setPd(p => ({ ...p, marketAssumptions: { ...p.marketAssumptions, capexInflationPercent: parseFloat(e.target.value) || 0 } }))} />
          </div>
          <div>
            <label style={labelS}>Verkaufskosten (%)</label>
            <input type="number" step="0.1" className="input-glass" style={inputS}
              value={pd.marketAssumptions.salesCostPercent}
              onChange={e => setPd(p => ({ ...p, marketAssumptions: { ...p.marketAssumptions, salesCostPercent: parseFloat(e.target.value) || 0 } }))} />
          </div>
          <div>
            <label style={labelS}>Haltedauer (Jahre)</label>
            <input type="number" className="input-glass" style={inputS}
              value={pd.holdingPeriodYears}
              onChange={e => setPdField('holdingPeriodYears', parseInt(e.target.value) || 10)} />
          </div>
        </div>
      </div>
    );

    // Step 5 (only for Development): Development
    if (isDev && s === stepFor('Development')) return (
      <div className="space-y-5 animate-fade-in">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelS}>Baustart</label>
            <input type="date" className="input-glass" style={inputS} value={pd.projectStart} onChange={e => setPdField('projectStart', e.target.value)} />
          </div>
          <div>
            <label style={labelS}>Puffer / Contingency (%)</label>
            <input type="number" step="1" className="input-glass" style={inputS} value={pd.contingencyPercent} onChange={e => setPdField('contingencyPercent', parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label style={labelS}>Gewerke / Kosten</label>
            <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => setPd(p => ({ ...p, gewerke: [...p.gewerke, newGewerk()] }))}>+ Gewerk</button>
          </div>
          {pd.gewerke.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8" style={{ color: 'rgba(60,60,67,0.35)' }}>
              <HardHat size={28} />
              <div style={{ fontSize: 13 }}>Noch keine Gewerke erfasst.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 700 }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                    {['Gewerk', 'Beschreibung', 'Budget (€)', 'Fläche m²', '€/m²', 'Start Woche', 'Dauer Wo.', 'Status', ''].map(h => (
                      <th key={h} style={{ ...thS, textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pd.gewerke.map((g, idx) => {
                    const area = computeTotalArea(pd.unitsAsIs);
                    return (
                      <tr key={g.id} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={tdS}><select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={g.category} onChange={e => { const gs = [...pd.gewerke]; gs[idx] = { ...g, category: e.target.value }; setPdField('gewerke', gs); }}>{DEFAULT_GEWERKE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></td>
                        <td style={tdS}><input style={{ ...inputS, width: 100, padding: '4px 6px', fontSize: 11 }} value={g.description} onChange={e => { const gs = [...pd.gewerke]; gs[idx] = { ...g, description: e.target.value }; setPdField('gewerke', gs); }} /></td>
                        <td style={tdS}><input type="number" style={{ ...inputS, width: 90, padding: '4px 6px', fontSize: 11 }} value={g.budgetTotal || ''} onChange={e => { const b = parseFloat(e.target.value) || 0; const gs = [...pd.gewerke]; gs[idx] = { ...g, budgetTotal: b, budgetAmount: b, costPerSqm: area > 0 ? b / area : 0 }; setPdField('gewerke', gs); }} /></td>
                        <td style={{ ...tdS, color: 'rgba(60,60,67,0.45)' }}>{area > 0 ? area.toLocaleString('de-DE') : '—'}</td>
                        <td style={{ ...tdS, color: 'rgba(60,60,67,0.45)' }}>{area > 0 && g.budgetTotal > 0 ? (g.budgetTotal / area).toFixed(0) : '—'}</td>
                        <td style={tdS}><input type="number" style={{ ...inputS, width: 60, padding: '4px 6px', fontSize: 11 }} value={g.startWeek} onChange={e => { const gs = [...pd.gewerke]; gs[idx] = { ...g, startWeek: parseInt(e.target.value) || 1 }; setPdField('gewerke', gs); }} /></td>
                        <td style={tdS}><input type="number" style={{ ...inputS, width: 60, padding: '4px 6px', fontSize: 11 }} value={g.durationWeeks} onChange={e => { const gs = [...pd.gewerke]; gs[idx] = { ...g, durationWeeks: parseInt(e.target.value) || 1 }; setPdField('gewerke', gs); }} /></td>
                        <td style={tdS}><select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={g.status} onChange={e => { const gs = [...pd.gewerke]; gs[idx] = { ...g, status: e.target.value as any }; setPdField('gewerke', gs); }}>{['Geplant', 'Beauftragt', 'Laufend', 'Abgeschlossen'].map(s => <option key={s}>{s}</option>)}</select></td>
                        <td style={tdS}><button onClick={() => setPd(p => ({ ...p, gewerke: p.gewerke.filter(x => x.id !== g.id) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><Trash2 size={12} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)' }}>
                    <td colSpan={2} style={{ padding: '8px 10px', fontWeight: 700, fontSize: 11 }}>Gesamt (inkl. {pd.contingencyPercent}% Puffer)</td>
                    <td style={{ ...tdS, fontWeight: 700, color: '#007aff' }}>{formatEUR(totalDevBudget)}</td>
                    <td colSpan={6} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    );

    // Step: Finanzierung
    if (s === stepFor('Finanzierung')) return (
      <div className="space-y-5 animate-fade-in">
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(60,60,67,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>Kapitalbedarfsübersicht</div>
          <div className="grid grid-cols-4 gap-3">
            {[
              ['Kaufpreis', formatEUR(pd.purchasePrice, true), '#1c1c1e'],
              ['Nebenkosten', formatEUR(totalAcqCosts, true), '#fbbf24'],
              isDev ? ['Baukosten', formatEUR(totalDevBudget, true), '#a78bfa'] : null,
              ['Gesamtinvestition', formatEUR(totalCapReq, true), '#007aff'],
              ['Fremdkapital', formatEUR(totalLoan, true), '#34c759'],
              ['Eigenkapital', formatEUR(equity, true), equity > 0 ? '#f97316' : '#f87171'],
            ].filter(Boolean).map(([l, v, c]) => (
              <div key={l as string} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c as string }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label style={labelS}>Finanzierungstranchen</label>
            <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => setPd(p => ({ ...p, financingTranches: [...p.financingTranches, newTranche()] }))}>+ Tranche</button>
          </div>
          {pd.financingTranches.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8" style={{ color: 'rgba(60,60,67,0.35)' }}>
              <DollarSign size={28} />
              <div style={{ fontSize: 13 }}>Keine Tranche erfasst. Klicke "+ Tranche" um eine hinzuzufügen.</div>
            </div>
          ) : (
            pd.financingTranches.map((t, idx) => (
              <div key={t.id} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', marginBottom: 10, position: 'relative' }}>
                <button onClick={() => setPd(p => ({ ...p, financingTranches: p.financingTranches.filter(x => x.id !== t.id) }))} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><X size={14} /></button>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label style={labelS}>Name</label>
                    <input style={inputS} value={t.name} onChange={e => { const ts = [...pd.financingTranches]; ts[idx] = { ...t, name: e.target.value }; setPdField('financingTranches', ts); }} />
                  </div>
                  <div>
                    <label style={labelS}>Darlehensbetrag (€)</label>
                    <input type="number" style={inputS} value={t.loanAmount || ''} onChange={e => { const ts = [...pd.financingTranches]; ts[idx] = { ...t, loanAmount: parseFloat(e.target.value) || 0 }; setPdField('financingTranches', ts); }} />
                  </div>
                  <div>
                    <label style={labelS}>Zinssatz (%)</label>
                    <input type="number" step="0.05" style={inputS} value={t.interestRate} onChange={e => { const ts = [...pd.financingTranches]; ts[idx] = { ...t, interestRate: parseFloat(e.target.value) || 0 }; setPdField('financingTranches', ts); }} />
                  </div>
                  <div>
                    <label style={labelS}>Laufzeit (Jahre)</label>
                    <input type="number" style={inputS} value={t.loanTerm} onChange={e => { const ts = [...pd.financingTranches]; ts[idx] = { ...t, loanTerm: parseInt(e.target.value) || 0 }; setPdField('financingTranches', ts); }} />
                  </div>
                  <div>
                    <label style={labelS}>Tilgung (%/Jahr)</label>
                    <input type="number" step="0.5" style={inputS} value={t.amortizationRate} onChange={e => { const ts = [...pd.financingTranches]; ts[idx] = { ...t, amortizationRate: parseFloat(e.target.value) || 0 }; setPdField('financingTranches', ts); }} />
                  </div>
                  <div>
                    <label style={labelS}>Rückzahlung</label>
                    <select style={inputS} value={t.repaymentType} onChange={e => { const ts = [...pd.financingTranches]; ts[idx] = { ...t, repaymentType: e.target.value as any }; setPdField('financingTranches', ts); }}>
                      <option>Annuität</option><option>Endfällig</option>
                    </select>
                  </div>
                </div>
                {t.loanAmount > 0 && totalCapReq > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>LTV: {formatPct(t.loanAmount / totalCapReq * 100, 1)} · Jahreszins: {formatEUR(t.loanAmount * t.interestRate / 100)}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );

    // Step: Cashflow
    if (s === stepFor('Cashflow')) {
      if (pd.purchasePrice === 0 || pd.unitsAsIs.length === 0) return (
        <div className="flex flex-col items-center gap-4 py-16" style={{ color: 'rgba(60,60,67,0.35)' }}>
          <BarChart3 size={36} />
          <div style={{ fontSize: 13, textAlign: 'center' }}>Bitte zuerst Kaufpreis (Schritt 2) und Rent Roll (Schritt 3) befüllen.</div>
        </div>
      );
      const cfRows = computePropertyCashFlow(pd);
      const chartData = cfRows.slice(0, 11).map(r => ({ year: `J${r.yearIndex}`, NOI: Math.round(r.noi / 1000), CF: Math.round(r.freeCashflow / 1000) }));
      return (
        <div className="space-y-5 animate-fade-in">
          {kpis && (
            <div className="grid grid-cols-4 gap-3">
              {[
                ['IRR (10J)', `${kpis.irr10Year.toFixed(1)}%`, kpis.irr10Year > 12 ? '#34c759' : kpis.irr10Year > 8 ? '#fbbf24' : '#f87171'],
                ['Equity Multiple', `${kpis.equityMultiple10Year.toFixed(2)}x`, kpis.equityMultiple10Year > 1.5 ? '#34c759' : '#fbbf24'],
                ['DSCR', kpis.dscr > 900 ? 'n/a' : `${kpis.dscr.toFixed(2)}x`, kpis.dscr > 1.25 ? '#34c759' : '#f87171'],
                ['NIY', `${kpis.niyAtAcquisition.toFixed(2)}%`, kpis.niyAtAcquisition > 4.5 ? '#34c759' : '#fbbf24'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: 'ui-monospace, monospace' }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ borderRadius: 12, background: 'rgba(0,0,0,0.02)', padding: '12px 10px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.5)', marginBottom: 8, textTransform: 'uppercase' }}>NOI & Free CF (€k)</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="year" tick={{ fontSize: 9, fill: 'rgba(60,60,67,0.5)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'rgba(60,60,67,0.5)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}k`} />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [`${v}k €`]} />
                <Bar dataKey="NOI" fill="rgba(0,122,255,0.65)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="CF" fill="rgba(74,222,128,0.65)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 220, overflowY: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                  {['Jahr', 'Bruttomiete', 'NOI', 'Baukosten', 'Transaktion', 'Finanzierung', 'Free CF', 'Kumulativ'].map(h => <th key={h} style={thS}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {cfRows.map(r => (
                  <tr key={r.yearIndex} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ ...tdS, fontWeight: 700 }}>{r.calendarYear}</td>
                    <td style={{ ...tdS, color: '#007aff' }}>{formatEUR(r.grossRentalIncome, true)}</td>
                    <td style={{ ...tdS, fontWeight: 600 }}>{formatEUR(r.noi, true)}</td>
                    <td style={{ ...tdS, color: r.capexConstructionCosts > 0 ? '#a78bfa' : 'rgba(60,60,67,0.3)' }}>{r.capexConstructionCosts > 0 ? `−${formatEUR(r.capexConstructionCosts, true)}` : '—'}</td>
                    <td style={{ ...tdS, color: r.transactionsCashflow < 0 ? '#f87171' : '#34c759' }}>{formatEUR(r.transactionsCashflow, true)}</td>
                    <td style={{ ...tdS, color: r.debtCashflow > 0 ? '#34c759' : '#fbbf24' }}>{formatEUR(r.debtCashflow, true)}</td>
                    <td style={{ ...tdS, fontWeight: 700, color: r.freeCashflow >= 0 ? '#34c759' : '#f87171' }}>{r.freeCashflow >= 0 ? '+' : ''}{formatEUR(r.freeCashflow, true)}</td>
                    <td style={{ ...tdS, color: r.cumulativeFreeCashflow >= 0 ? '#34c759' : '#f87171' }}>{formatEUR(r.cumulativeFreeCashflow, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Step: Zusammenfassung
    if (s === maxStep) return (
      <div className="space-y-4 animate-fade-in">
        <GlassPanel style={{ padding: 18 }}>
          <div className="flex items-start justify-between">
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e' }}>{pd.name || '—'}</div>
              <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.55)' }}>{pd.address}{pd.address && ', '}{pd.city} {pd.zip}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: isDev ? 'rgba(167,139,250,0.12)' : 'rgba(201,169,110,0.12)', color: isDev ? '#a78bfa' : '#c9a96e' }}>{pd.dealType}</span>
                <span className="badge-neutral">{pd.usageType}</span>
                <StageBadge stage="Screening" />
              </div>
            </div>
          </div>
        </GlassPanel>

        {pd.unitsAsIs.length > 0 && (
          <GlassPanel style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#007aff', marginBottom: 10, textTransform: 'uppercase' }}>Rent Roll</div>
            <div className="grid grid-cols-4 gap-3">
              {[
                [`${pd.unitsAsIs.length} Einheiten`, `${computeTotalArea(pd.unitsAsIs).toLocaleString('de-DE')} m²`],
                ['Jahresmiete (Ist)', formatEUR(computeAnnualRent(pd.unitsAsIs), true)],
                ['Jahresmiete (Ziel)', formatEUR(computeAnnualRent(pd.unitsTarget.length > 0 ? pd.unitsTarget : pd.unitsAsIs), true)],
                ['NOI (Ist)', noiIst ? formatEUR(noiIst.noi, true) : '—'],
              ].map(([l, v], i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1c1c1e' }}>{l}</div>
                  <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.55)' }}>{v}</div>
                </div>
              ))}
            </div>
          </GlassPanel>
        )}

        {isDev && pd.gewerke.length > 0 && (
          <GlassPanel style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 10, textTransform: 'uppercase' }}>Development</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                [`${pd.gewerke.length} Gewerke`, `Budget gesamt`],
                ['Budget (netto)', formatEUR(pd.gewerke.reduce((s, g) => s + g.budgetTotal, 0), true)],
                [`inkl. ${pd.contingencyPercent}% Puffer`, formatEUR(totalDevBudget, true)],
              ].map(([l, v], i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1c1c1e' }}>{l}</div>
                  <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.55)' }}>{v}</div>
                </div>
              ))}
            </div>
          </GlassPanel>
        )}

        {kpis && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.50)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={12} color="#007aff" /> Live KPIs</div>
            <div className="grid grid-cols-4 gap-3">
              <KPICard compact label="NIY" value={formatPct(kpis.niyAtAcquisition)} status={kpis.niyAtAcquisition > 4.5 ? 'good' : kpis.niyAtAcquisition > 3 ? 'warning' : 'danger'} />
              <KPICard compact label="Multiple" value={formatX(kpis.multiple)} status={kpis.multiple < 20 ? 'good' : 'warning'} />
              <KPICard compact label="DSCR" value={kpis.dscr > 900 ? '∞' : formatX(kpis.dscr)} status={kpis.dscr > 1.5 ? 'good' : kpis.dscr > 1.2 ? 'warning' : 'danger'} />
              <KPICard compact label="IRR 10J" value={formatPct(kpis.irr10Year)} status={kpis.irr10Year > 12 ? 'good' : 'warning'} />
            </div>
          </div>
        )}
      </div>
    );

    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh' }}>
      <div style={{ padding: '20px 24px 0' }}>
        <StepBar steps={stepTitles} current={step} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {renderStep()}
      </div>

      {showQuickEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Schnell-Erfassung</div>
            <div className="space-y-3">
              <div><label style={labelS}>Anzahl Einheiten</label><input type="number" style={inputS} value={qeCount} onChange={e => setQeCount(parseInt(e.target.value) || 1)} /></div>
              <div><label style={labelS}>Fläche pro Einheit (m²)</label><input type="number" style={inputS} value={qeArea} onChange={e => setQeArea(parseFloat(e.target.value) || 0)} /></div>
              <div><label style={labelS}>Nutzung</label><select style={inputS} value={qeUsage} onChange={e => setQeUsage(e.target.value as any)}>{RENT_ROLL_USAGE.map(u => <option key={u}>{u}</option>)}</select></div>
              <div><label style={labelS}>Ist-Miete €/m²/Mon</label><input type="number" step="0.5" style={inputS} value={qeRent} onChange={e => setQeRent(parseFloat(e.target.value) || 0)} /></div>
              <div><label style={labelS}>ERV €/m²/Mon</label><input type="number" step="0.5" style={inputS} value={qeERV} onChange={e => setQeERV(parseFloat(e.target.value) || 0)} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-glass flex-1 py-2 rounded-xl text-sm" onClick={() => setShowQuickEntry(false)}>Abbrechen</button>
              <button className="btn-primary flex-1 py-2 rounded-xl text-sm" onClick={addQuickEntryUnits}>Erstellen</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.95)' }}>
        <button className="btn-glass px-4 py-2 rounded-xl text-sm flex items-center gap-2" onClick={step === 0 ? onClose : () => setStep(s => s - 1)}>
          <ChevronLeft size={14} /> {step === 0 ? 'Abbrechen' : 'Zurück'}
        </button>
        <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>Schritt {step + 1} / {maxStep + 1}</div>
        {step < maxStep ? (
          <button className="btn-primary px-5 py-2 rounded-xl text-sm flex items-center gap-2" onClick={() => setStep(s => s + 1)} disabled={step === 0 && !pd.name.trim()}>
            Weiter <ChevronRight size={14} />
          </button>
        ) : (
          <button className="btn-primary px-5 py-2 rounded-xl text-sm flex items-center gap-2" onClick={handleSave} disabled={!pd.name.trim() || pd.purchasePrice === 0}>
            <CheckCircle size={14} /> Deal anlegen
          </button>
        )}
      </div>
    </div>
  );
}

// ── Acquisition Page ──────────────────────────────────────────────────────────

export default function AcquisitionPage() {
  const { deals, addDeal } = useStore();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState<string>('Alle');
  const [filterType, setFilterType] = useState<string>('Alle');

  const filtered = deals.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q) || (d.broker || '').toLowerCase().includes(q);
    const matchStage = filterStage === 'Alle' || d.stage === filterStage;
    const matchType = filterType === 'Alle' || d.dealType === filterType;
    return matchQ && matchStage && matchType;
  });

  const byStage = STAGE_ORDER.reduce<Record<string, AcquisitionDeal[]>>((acc, st) => {
    acc[st] = filtered.filter(d => d.stage === st);
    return acc;
  }, {});

  const totalVolume = deals.reduce((s, d) => s + d.askingPrice, 0);

  const handleSaveDeal = (deal: AcquisitionDeal) => {
    addDeal(deal);
    setShowWizard(false);
    navigate(`/acquisition/${deal.id}`);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Acquisition Pipeline"
        subtitle={`${deals.length} Deals · ${formatEUR(totalVolume, true)} Gesamtvolumen`}
        badge="Acquisition"
        actions={
          <button className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2" onClick={() => setShowWizard(true)}>
            <Plus size={14} /> Neuer Deal
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(60,60,67,0.45)' }} />
          <input className="input-glass" style={{ ...inputS, paddingLeft: 34 }} placeholder="Suche…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-glass" style={{ ...inputS, width: 160 }} value={filterStage} onChange={e => setFilterStage(e.target.value)}>
          <option>Alle</option>
          {STAGE_ORDER.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input-glass" style={{ ...inputS, width: 140 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          {['Alle', 'Investment', 'Development'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STAGE_ORDER.map(stage => (
          <div key={stage} style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{stage}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#007aff' }}>{byStage[stage]?.length || 0}</div>
            <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>
              {byStage[stage]?.length ? formatEUR(byStage[stage].reduce((s, d) => s + d.askingPrice, 0), true) : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Deal Cards by Stage */}
      {STAGE_ORDER.map(stage => {
        const stageDls = byStage[stage] || [];
        if (stageDls.length === 0) return null;
        return (
          <div key={stage} className="mb-8">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(60,60,67,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <StageBadge stage={stage as any} />
              <span style={{ color: 'rgba(60,60,67,0.35)', fontSize: 12, fontWeight: 400 }}>{stageDls.length} Deal{stageDls.length !== 1 ? 's' : ''} · {formatEUR(stageDls.reduce((s, d) => s + d.askingPrice, 0), true)}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {stageDls.map(deal => <DealCard key={deal.id} deal={deal} />)}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20" style={{ color: 'rgba(60,60,67,0.35)' }}>
          <Building2 size={40} />
          <div style={{ fontSize: 15 }}>Keine Deals gefunden.</div>
          <button className="btn-primary px-5 py-2 rounded-xl text-sm" onClick={() => setShowWizard(true)}>Ersten Deal anlegen</button>
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '90vw', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.28)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e' }}>Neuer Deal — Wizard</div>
              <button onClick={() => setShowWizard(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(60,60,67,0.55)' }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <NewDealWizard onClose={() => setShowWizard(false)} onSave={handleSaveDeal} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

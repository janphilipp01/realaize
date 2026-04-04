import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, FileText, Search, X, ChevronRight, ChevronLeft, Zap, CheckCircle, Building2, HardHat } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PageHeader, StageBadge, CompletenessRing, GlassPanel, KPICard, Modal } from '../components/shared';
import { computeDealKPIs, formatEUR, formatPct, formatX } from '../utils/kpiEngine';
import { useLanguage } from '../i18n/LanguageContext';
import type { AcquisitionDeal, DealType, UsageType, UnderwritingAssumptions, FinancingAssumptions } from '../models/types';

const STAGE_ORDER = ['Screening', 'LOI', 'Due Diligence', 'Signing', 'Closing'];
const USAGE_TYPES: UsageType[] = ['Wohnen', 'Büro', 'Einzelhandel', 'Logistik', 'Mixed Use'];
const DEV_TYPES = ['Neubau', 'Kernsanierung', 'Modernisierung', 'Umbau', 'Aufstockung', 'Anbau'] as const;
const USAGE_COLORS: Record<string, string> = {
  'Büro': '#c9a96e', 'Wohnen': '#60a5fa', 'Logistik': '#4ade80',
  'Einzelhandel': '#f87171', 'Mixed Use': '#a78bfa',
};

// ── Deal Card ───────────────────────────────────────────
function DealCard({ deal }: { deal: AcquisitionDeal }) {
  const kpis = computeDealKPIs(deal.underwritingAssumptions, deal.financingAssumptions);
  const alerts = deal.aiRecommendations.filter(r => r.isAlert);
  const hasDeviation = alerts.some(a => (a.deviationPercent || 0) > 10);
  const { t, lang } = useLanguage();
  const dateLocale = lang === 'de' ? 'de-DE' : 'en-GB';

  return (
    <Link to={`/acquisition/${deal.id}`} style={{ textDecoration: 'none' }}>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', border: hasDeviation ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.10)' }}>
        <div style={{ padding: '18px 20px 14px', background: `linear-gradient(135deg, rgba(${USAGE_COLORS[deal.usageType] === '#c9a96e' ? '201,169,110' : deal.usageType === 'Wohnen' ? '96,165,250' : deal.usageType === 'Logistik' ? '74,222,128' : '248,113,113'},0.08), transparent)`, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
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
            {hasDeviation && <span className="badge-warning flex items-center gap-1"><AlertTriangle size={10} /> {t('acq.aiWarning')}</span>}
          </div>
        </div>
        <div style={{ padding: '14px 20px' }}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Asking Price</div><div style={{ fontSize: 16, fontWeight: 700, color: '#007aff' }}>{formatEUR(deal.askingPrice, true)}</div></div>
            <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>NIY</div><div style={{ fontSize: 16, fontWeight: 700, color: kpis.netInitialYield > 4.5 ? '#4ade80' : kpis.netInitialYield > 3 ? '#fbbf24' : '#f87171' }}>{formatPct(kpis.netInitialYield)}</div></div>
            <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Multiple</div><div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1e' }}>{formatX(kpis.kaufpreisfaktor)}</div></div>
            <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>LTV</div><div style={{ fontSize: 14, fontWeight: 600, color: kpis.ltv < 65 ? '#4ade80' : '#fbbf24' }}>{formatPct(kpis.ltv, 1)}</div></div>
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

// ── Defaults ────────────────────────────────────────────
const defaultUW: UnderwritingAssumptions = {
  purchasePrice: 0, closingCostPercent: 6.5, brokerFeePercent: 1.5, initialCapex: 0,
  annualGrossRent: 0, vacancyRatePercent: 5, managementCostPercent: 3,
  maintenanceReservePerSqm: 10, nonRecoverableOpex: 0, area: 0, rentPerSqm: 0, otherOperatingIncome: 0,
};
const defaultFin: FinancingAssumptions = {
  loanAmount: 0, interestRate: 4.0, amortizationRate: 2.0, loanTerm: 10, lenderName: '', fixedRatePeriod: 5,
};

// ── New Deal Wizard ─────────────────────────────────────
interface NewDealFormData {
  dealType: DealType;
  name: string; address: string; city: string; zip: string;
  usageType: UsageType; broker: string; vendorName: string; totalArea: number;
  uw: UnderwritingAssumptions; fin: FinancingAssumptions;
  // Development-specific
  developmentType: typeof DEV_TYPES[number];
  estimatedDevBudget: number;
  estimatedDevDuration: number;
  projectedRentAfterDev: number;
}

function NewDealWizard({ onClose, onSave }: { onClose: () => void; onSave: (deal: AcquisitionDeal) => void }) {
  const { t, lang } = useLanguage();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<NewDealFormData>({
    dealType: 'Investment',
    name: '', address: '', city: '', zip: '', usageType: 'Wohnen',
    broker: '', vendorName: '', totalArea: 0,
    uw: { ...defaultUW }, fin: { ...defaultFin },
    developmentType: 'Modernisierung', estimatedDevBudget: 0, estimatedDevDuration: 24, projectedRentAfterDev: 0,
  });

  const isDev = form.dealType === 'Development';
  const updateForm = (patch: Partial<NewDealFormData>) => setForm(f => ({ ...f, ...patch }));
  const updateUW = (patch: Partial<UnderwritingAssumptions>) => setForm(f => ({ ...f, uw: { ...f.uw, ...patch } }));
  const updateFin = (patch: Partial<FinancingAssumptions>) => setForm(f => ({ ...f, fin: { ...f.fin, ...patch } }));

  const syncLoan = (pp: number) => {
    updateUW({ purchasePrice: pp });
    if (form.fin.loanAmount === 0 || form.fin.loanAmount === form.uw.purchasePrice * 0.65) {
      updateFin({ loanAmount: Math.round(pp * 0.65) });
    }
  };

  const syncRent = (area: number, rpsm: number) => {
    updateUW({ area, rentPerSqm: rpsm, annualGrossRent: Math.round(area * rpsm * 12) });
  };

  const previewKPIs = computeDealKPIs(form.uw, form.fin);

  const filledFields = [form.name, form.city, form.uw.purchasePrice, form.uw.area, form.uw.annualGrossRent || form.projectedRentAfterDev, form.fin.loanAmount].filter(Boolean).length;
  const completeness = Math.round((filledFields / 6) * 100);

  // Steps differ: Investment has 4, Development has 5 (extra dev-specific step)
  const stepTitles = isDev
    ? [lang === 'de' ? 'Basisdaten' : 'Basic Data', lang === 'de' ? 'Development' : 'Development', 'Underwriting', lang === 'de' ? 'Finanzierung' : 'Financing', lang === 'de' ? 'Zusammenfassung' : 'Summary']
    : [lang === 'de' ? 'Basisdaten' : 'Basic Data', 'Underwriting', lang === 'de' ? 'Finanzierung' : 'Financing', lang === 'de' ? 'Zusammenfassung' : 'Summary'];
  const maxStep = stepTitles.length - 1;

  const canProceed = () => {
    if (step === 0) return form.name.trim() && form.city.trim();
    if (isDev && step === 1) return form.estimatedDevBudget > 0;
    const uwStep = isDev ? 2 : 1;
    const finStep = isDev ? 3 : 2;
    if (step === uwStep) return form.uw.purchasePrice > 0 && form.uw.area > 0;
    if (step === finStep) return form.fin.loanAmount > 0;
    return true;
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    const deal: AcquisitionDeal = {
      id: `deal-${Date.now()}`, name: form.name, address: form.address, city: form.city, zip: form.zip,
      usageType: form.usageType, dealType: form.dealType, stage: 'Screening',
      askingPrice: form.uw.purchasePrice,
      underwritingAssumptions: form.uw, financingAssumptions: form.fin,
      documents: [], activityLog: [], aiRecommendations: [],
      completenessScore: completeness, createdAt: now, updatedAt: now,
      broker: form.broker || undefined, vendorName: form.vendorName || undefined,
      totalArea: form.totalArea || form.uw.area,
      ...(isDev ? {
        developmentType: form.developmentType,
        estimatedDevBudget: form.estimatedDevBudget,
        estimatedDevDuration: form.estimatedDevDuration,
        projectedRentAfterDev: form.projectedRentAfterDev,
      } : {}),
    };
    onSave(deal);
  };

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'rgba(60,60,67,0.50)', display: 'block', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' };
  const inputStyle: React.CSSProperties = { width: '100%' };

  return (
    <Modal title={`${t('acq.newDeal')} — ${stepTitles[step]}`} onClose={onClose} width={660}
      actions={
        <div className="flex gap-3 w-full">
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="btn-glass px-4 py-2 rounded-xl text-sm flex items-center gap-2" style={{ cursor: 'pointer' }}><ChevronLeft size={14} /> {lang === 'de' ? 'Zurück' : 'Back'}</button>}
          <div style={{ flex: 1 }} />
          {step < maxStep ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="btn-accent px-5 py-2 rounded-xl text-sm flex items-center gap-2" style={{ cursor: canProceed() ? 'pointer' : 'not-allowed', opacity: canProceed() ? 1 : 0.5 }}>
              {lang === 'de' ? 'Weiter' : 'Next'} <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleSave} className="btn-accent px-5 py-2 rounded-xl text-sm flex items-center gap-2" style={{ cursor: 'pointer' }}>
              <CheckCircle size={14} /> {lang === 'de' ? 'Deal anlegen' : 'Create Deal'}
            </button>
          )}
        </div>
      }
    >
      {/* Step indicator */}
      <div className="flex gap-1 mb-6">
        {stepTitles.map((title, i) => (
          <div key={i} className="flex items-center gap-1.5" style={{ flex: 1 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i <= step ? '#007aff' : 'rgba(0,0,0,0.06)', color: i <= step ? '#fff' : 'rgba(60,60,67,0.45)' }}>{i + 1}</div>
            <span style={{ fontSize: 10, color: i <= step ? '#1c1c1e' : 'rgba(60,60,67,0.35)', fontWeight: i === step ? 600 : 400 }}>{title}</span>
          </div>
        ))}
      </div>

      {/* ── Step 0: Basic Data + Deal Type ── */}
      {step === 0 && (
        <div className="space-y-4 animate-fade-in">
          {/* Deal Type Selection */}
          <div>
            <label style={labelStyle}>Deal Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {(['Investment', 'Development'] as DealType[]).map(dt => (
                <button key={dt} onClick={() => updateForm({ dealType: dt })}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{
                    background: form.dealType === dt ? (dt === 'Investment' ? 'rgba(201,169,110,0.10)' : 'rgba(167,139,250,0.10)') : 'rgba(0,0,0,0.03)',
                    border: `2px solid ${form.dealType === dt ? (dt === 'Investment' ? 'rgba(201,169,110,0.4)' : 'rgba(167,139,250,0.4)') : 'rgba(0,0,0,0.06)'}`,
                    cursor: 'pointer',
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    {dt === 'Investment' ? <Building2 size={16} color="#c9a96e" /> : <HardHat size={16} color="#a78bfa" />}
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>{dt === 'Investment' ? 'Investment Asset' : 'Development Asset'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.55)', lineHeight: 1.5 }}>
                    {dt === 'Investment'
                      ? (lang === 'de' ? 'Bestandsobjekt mit laufender Vermietung — direkt in den Bestand' : 'Existing asset with ongoing leasing — direct to portfolio')
                      : (lang === 'de' ? 'Objekt mit Bau-/Sanierungsbedarf — über Development in den Bestand' : 'Asset requiring construction/refurbishment — via development to portfolio')}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{lang === 'de' ? 'Projektname' : 'Project Name'} *</label>
              <input className="input-glass" style={inputStyle} value={form.name} onChange={e => updateForm({ name: e.target.value })} placeholder="z.B. Prenzlauer Berg Wohnanlage" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{lang === 'de' ? 'Adresse' : 'Address'}</label>
              <input className="input-glass" style={inputStyle} value={form.address} onChange={e => updateForm({ address: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>{lang === 'de' ? 'Stadt' : 'City'} *</label>
              <input className="input-glass" style={inputStyle} value={form.city} onChange={e => updateForm({ city: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>{lang === 'de' ? 'PLZ' : 'Zip'}</label>
              <input className="input-glass" style={inputStyle} value={form.zip} onChange={e => updateForm({ zip: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>{lang === 'de' ? 'Nutzungsart' : 'Usage Type'}</label>
              <select className="input-glass" style={inputStyle} value={form.usageType} onChange={e => updateForm({ usageType: e.target.value as UsageType })}>
                {USAGE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{lang === 'de' ? 'Gesamtfläche (m²)' : 'Total Area (sqm)'}</label>
              <input type="number" className="input-glass" style={inputStyle} value={form.totalArea || ''} onChange={e => updateForm({ totalArea: parseFloat(e.target.value) || 0 })} />
            </div>
            <div><label style={labelStyle}>Broker</label><input className="input-glass" style={inputStyle} value={form.broker} onChange={e => updateForm({ broker: e.target.value })} /></div>
            <div><label style={labelStyle}>{lang === 'de' ? 'Verkäufer' : 'Vendor'}</label><input className="input-glass" style={inputStyle} value={form.vendorName} onChange={e => updateForm({ vendorName: e.target.value })} /></div>
          </div>
        </div>
      )}

      {/* ── Step 1 (Dev only): Development Details ── */}
      {isDev && step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
            <HardHat size={16} color="#a78bfa" />
            <span style={{ fontSize: 12, color: 'rgba(60,60,67,0.70)' }}>{lang === 'de' ? 'Development-spezifische Angaben. Diese werden bei der Überführung in das Development-Modul übernommen.' : 'Development-specific data. This will be transferred to the Development module.'}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>{lang === 'de' ? 'Entwicklungsart' : 'Development Type'}</label>
              <select className="input-glass" style={inputStyle} value={form.developmentType} onChange={e => updateForm({ developmentType: e.target.value as any })}>
                {DEV_TYPES.map(dt => <option key={dt}>{dt}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{lang === 'de' ? 'Geschätzte Baudauer (Monate)' : 'Est. Duration (Months)'}</label>
              <input type="number" className="input-glass" style={inputStyle} value={form.estimatedDevDuration} onChange={e => updateForm({ estimatedDevDuration: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label style={labelStyle}>{lang === 'de' ? 'Geschätztes Baubudget (€)' : 'Est. Construction Budget (€)'} *</label>
              <input type="number" className="input-glass" style={inputStyle} value={form.estimatedDevBudget || ''} onChange={e => updateForm({ estimatedDevBudget: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label style={labelStyle}>{lang === 'de' ? 'Projizierte Jahresmiete nach Fertigstellung (€)' : 'Projected Annual Rent After Completion (€)'}</label>
              <input type="number" className="input-glass" style={inputStyle} value={form.projectedRentAfterDev || ''} onChange={e => updateForm({ projectedRentAfterDev: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          {form.estimatedDevBudget > 0 && form.uw.purchasePrice > 0 && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 12, color: 'rgba(60,60,67,0.55)' }}>Total Investment: </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e' }}>{formatEUR(form.uw.purchasePrice + form.estimatedDevBudget)}</span>
              <span style={{ fontSize: 12, color: 'rgba(60,60,67,0.45)' }}> (Purchase + Dev Budget)</span>
            </div>
          )}
        </div>
      )}

      {/* ── Underwriting Step ── */}
      {step === (isDev ? 2 : 1) && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div><label style={labelStyle}>Purchase Price (€) *</label><input type="number" className="input-glass" style={inputStyle} value={form.uw.purchasePrice || ''} onChange={e => syncLoan(parseFloat(e.target.value) || 0)} /></div>
            <div><label style={labelStyle}>Initial Capex (€)</label><input type="number" className="input-glass" style={inputStyle} value={form.uw.initialCapex || ''} onChange={e => updateUW({ initialCapex: parseFloat(e.target.value) || 0 })} /></div>
            <div><label style={labelStyle}>Closing Costs (%)</label><input type="number" step="0.1" className="input-glass" style={inputStyle} value={form.uw.closingCostPercent} onChange={e => updateUW({ closingCostPercent: parseFloat(e.target.value) || 0 })} /></div>
            <div><label style={labelStyle}>Broker Fee (%)</label><input type="number" step="0.1" className="input-glass" style={inputStyle} value={form.uw.brokerFeePercent} onChange={e => updateUW({ brokerFeePercent: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(60,60,67,0.50)', marginBottom: 12 }}>{lang === 'de' ? 'Mietannahmen' : 'Rental Assumptions'}{isDev ? (lang === 'de' ? ' (Ist-Zustand vor Entwicklung)' : ' (As-is before development)') : ''}</div>
            <div className="grid grid-cols-3 gap-4">
              <div><label style={labelStyle}>{lang === 'de' ? 'Fläche (m²)' : 'Area (sqm)'} *</label><input type="number" className="input-glass" style={inputStyle} value={form.uw.area || ''} onChange={e => syncRent(parseFloat(e.target.value) || 0, form.uw.rentPerSqm)} /></div>
              <div><label style={labelStyle}>€/m²/{lang === 'de' ? 'Mon' : 'mo'}</label><input type="number" step="0.5" className="input-glass" style={inputStyle} value={form.uw.rentPerSqm || ''} onChange={e => syncRent(form.uw.area, parseFloat(e.target.value) || 0)} /></div>
              <div><label style={labelStyle}>Annual Gross Rent (€)</label><input type="number" className="input-glass" style={{ ...inputStyle, fontWeight: 600, color: '#007aff' }} value={form.uw.annualGrossRent || ''} onChange={e => updateUW({ annualGrossRent: parseFloat(e.target.value) || 0 })} /></div>
              <div><label style={labelStyle}>Vacancy (%)</label><input type="number" step="0.5" className="input-glass" style={inputStyle} value={form.uw.vacancyRatePercent} onChange={e => updateUW({ vacancyRatePercent: parseFloat(e.target.value) || 0 })} /></div>
              <div><label style={labelStyle}>Management (%)</label><input type="number" step="0.5" className="input-glass" style={inputStyle} value={form.uw.managementCostPercent} onChange={e => updateUW({ managementCostPercent: parseFloat(e.target.value) || 0 })} /></div>
              <div><label style={labelStyle}>Maintenance (€/m²)</label><input type="number" className="input-glass" style={inputStyle} value={form.uw.maintenanceReservePerSqm} onChange={e => updateUW({ maintenanceReservePerSqm: parseFloat(e.target.value) || 0 })} /></div>
              <div><label style={labelStyle}>Non-Rec. Opex (€/yr)</label><input type="number" className="input-glass" style={inputStyle} value={form.uw.nonRecoverableOpex || ''} onChange={e => updateUW({ nonRecoverableOpex: parseFloat(e.target.value) || 0 })} /></div>
              <div><label style={labelStyle}>Other Income (€/yr)</label><input type="number" className="input-glass" style={inputStyle} value={form.uw.otherOperatingIncome || ''} onChange={e => updateUW({ otherOperatingIncome: parseFloat(e.target.value) || 0 })} /></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Financing Step ── */}
      {step === (isDev ? 3 : 2) && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Loan Amount (€) *</label>
              <input type="number" className="input-glass" style={inputStyle} value={form.fin.loanAmount || ''} onChange={e => updateFin({ loanAmount: parseFloat(e.target.value) || 0 })} />
              {form.uw.purchasePrice > 0 && <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)', marginTop: 4 }}>= {((form.fin.loanAmount / form.uw.purchasePrice) * 100).toFixed(1)}% LTV</div>}
            </div>
            <div><label style={labelStyle}>Interest Rate (%)</label><input type="number" step="0.05" className="input-glass" style={inputStyle} value={form.fin.interestRate} onChange={e => updateFin({ interestRate: parseFloat(e.target.value) || 0 })} /></div>
            <div><label style={labelStyle}>Amortization (%)</label><input type="number" step="0.5" className="input-glass" style={inputStyle} value={form.fin.amortizationRate} onChange={e => updateFin({ amortizationRate: parseFloat(e.target.value) || 0 })} /></div>
            <div><label style={labelStyle}>Loan Term ({lang === 'de' ? 'Jahre' : 'yrs'})</label><input type="number" className="input-glass" style={inputStyle} value={form.fin.loanTerm} onChange={e => updateFin({ loanTerm: parseInt(e.target.value) || 0 })} /></div>
            <div><label style={labelStyle}>{lang === 'de' ? 'Kreditgeber' : 'Lender'}</label><input className="input-glass" style={inputStyle} value={form.fin.lenderName} onChange={e => updateFin({ lenderName: e.target.value })} /></div>
            <div><label style={labelStyle}>{lang === 'de' ? 'Zinsbindung (J.)' : 'Fixed Period (yrs)'}</label><input type="number" className="input-glass" style={inputStyle} value={form.fin.fixedRatePeriod} onChange={e => updateFin({ fixedRatePeriod: parseInt(e.target.value) || 0 })} /></div>
          </div>
        </div>
      )}

      {/* ── Summary Step ── */}
      {step === maxStep && (
        <div className="space-y-5 animate-fade-in">
          <GlassPanel style={{ padding: 18 }}>
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e' }}>{form.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.55)' }}>{form.address}{form.address && ', '}{form.city} {form.zip}</div>
                <div className="flex gap-2 mt-2">
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: isDev ? 'rgba(167,139,250,0.12)' : 'rgba(201,169,110,0.12)', color: isDev ? '#a78bfa' : '#c9a96e' }}>{form.dealType}</span>
                  <span className="badge-neutral">{form.usageType}</span>
                  <StageBadge stage="Screening" />
                  {isDev && <span className="badge-neutral">{form.developmentType}</span>}
                </div>
              </div>
              <CompletenessRing score={completeness} size={48} />
            </div>
          </GlassPanel>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(60,60,67,0.50)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={12} color="#007aff" /> Live KPI Preview</div>
            <div className="grid grid-cols-4 gap-3">
              <KPICard compact label="NIY" value={formatPct(previewKPIs.netInitialYield)} status={previewKPIs.netInitialYield > 4.5 ? 'good' : previewKPIs.netInitialYield > 3 ? 'warning' : 'danger'} />
              <KPICard compact label="Multiple" value={formatX(previewKPIs.kaufpreisfaktor)} status={previewKPIs.kaufpreisfaktor < 20 ? 'good' : 'warning'} />
              <KPICard compact label="DSCR" value={formatX(previewKPIs.dscr)} status={previewKPIs.dscr > 1.5 ? 'good' : previewKPIs.dscr > 1.2 ? 'warning' : 'danger'} />
              <KPICard compact label="Cash-on-Cash" value={formatPct(previewKPIs.cashOnCashReturn)} status={previewKPIs.cashOnCashReturn > 4 ? 'good' : previewKPIs.cashOnCashReturn > 1 ? 'warning' : 'danger'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <GlassPanel style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(60,60,67,0.40)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>Underwriting</div>
              {[['Purchase Price', formatEUR(form.uw.purchasePrice)], ['Total Acq. Cost', formatEUR(previewKPIs.totalAcquisitionCost)], ['Annual Gross Rent', formatEUR(form.uw.annualGrossRent)], ['NOI', formatEUR(previewKPIs.noi)], ['Equity Required', formatEUR(previewKPIs.equityInvested)],
                ...(isDev ? [['Dev Budget', formatEUR(form.estimatedDevBudget)], ['Total Investment', formatEUR(form.uw.purchasePrice + form.estimatedDevBudget)]] : []),
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <span style={{ fontSize: 12, color: 'rgba(60,60,67,0.65)' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e', fontFamily: 'ui-monospace, monospace' }}>{val}</span>
                </div>
              ))}
            </GlassPanel>
            <GlassPanel style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(60,60,67,0.40)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>Financing</div>
              {[['Loan Amount', formatEUR(form.fin.loanAmount)], ['LTV', formatPct(previewKPIs.ltv, 1)], ['Interest Rate', `${form.fin.interestRate}%`], ['Debt Service p.a.', formatEUR(previewKPIs.annualDebtService)], ['Lender', form.fin.lenderName || '—']].map(([label, val]) => (
                <div key={label as string} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <span style={{ fontSize: 12, color: 'rgba(60,60,67,0.65)' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e', fontFamily: 'ui-monospace, monospace' }}>{val}</span>
                </div>
              ))}
            </GlassPanel>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Main Acquisition Page ───────────────────────────────
export default function AcquisitionPage() {
  const { deals, addDeal } = useStore();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('Alle');
  const [filterType, setFilterType] = useState('Alle');
  const [showNewDeal, setShowNewDeal] = useState(false);

  const filtered = deals.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.city.toLowerCase().includes(search.toLowerCase());
    const matchStage = filterStage === 'Alle' || d.stage === filterStage;
    const matchType = filterType === 'Alle' || d.usageType === filterType;
    return matchSearch && matchStage && matchType;
  });

  const totalVolume = deals.reduce((s, d) => s + d.askingPrice, 0);

  const handleCreateDeal = (deal: AcquisitionDeal) => {
    addDeal(deal);
    setShowNewDeal(false);
    navigate(`/acquisition/${deal.id}`);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader title={t('acq.title')} subtitle={`${deals.length} Deals · ${formatEUR(totalVolume, true)} ${t('acq.totalVolume')}`}
        actions={<button onClick={() => setShowNewDeal(true)} className="btn-accent px-4 py-2 rounded-xl text-sm flex items-center gap-2" style={{ cursor: 'pointer' }}><Plus size={14} /> {t('acq.newDeal')}</button>} />
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative"><Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(60,60,67,0.45)' }} /><input className="input-glass pl-8" placeholder={t('acq.searchDeal')} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} /></div>
        <select className="input-glass" value={filterStage} onChange={e => setFilterStage(e.target.value)} style={{ width: 160 }}><option>Alle</option>{STAGE_ORDER.map(s => <option key={s}>{s}</option>)}</select>
        <select className="input-glass" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 160 }}><option>Alle</option>{USAGE_TYPES.map(t => <option key={t}>{t}</option>)}</select>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {STAGE_ORDER.filter(stage => filtered.some(d => d.stage === stage)).map(stage => {
          const stagDeals = filtered.filter(d => d.stage === stage);
          return (
            <div key={stage}>
              <div className="flex items-center gap-2 mb-3">
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{stage}</div>
                <span className="badge-neutral">{stagDeals.length}</span>
                <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)', marginLeft: 'auto' }}>{formatEUR(stagDeals.reduce((s, d) => s + d.askingPrice, 0), true)}</div>
              </div>
              <div className="space-y-4">{stagDeals.map(deal => <DealCard key={deal.id} deal={deal} />)}</div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="text-center py-16"><div style={{ fontSize: 15, color: 'rgba(60,60,67,0.45)' }}>{t('acq.noDeals')}</div></div>}
      {showNewDeal && <NewDealWizard onClose={() => setShowNewDeal(false)} onSave={handleCreateDeal} />}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Building2, TrendingUp, BarChart3, FileText,
  HardHat, CheckCircle, X, Package, Home, Lock, ChevronDown, ChevronUp,
  AlertTriangle, DollarSign, Bot,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStore } from '../store/useStore';
import { GlassPanel, PageHeader, KPICard, SectionHeader, CompletenessRing, Modal } from '../components/shared';
import ImageManager, { TitleImageDisplay } from '../components/ImageManager';
import { formatEUR, formatPct, formatX } from '../utils/kpiEngine';
import { computePropertyNOI, computePropertyKPIs, computePropertyCashFlow, computeTotalAcquisitionCosts, computeTotalDevBudget, computeTotalArea, computeAnnualRent, buildMarketAssumptionsFromRentRoll } from '../utils/propertyCashFlowModel';
import { createDefaultPropertyData, DEFAULT_GEWERKE_CATEGORIES, getDefaultErvGrowth, getDefaultExitCapRate } from '../models/types';
import { useLanguage } from '../i18n/LanguageContext';
import type {
  FloorLevel, RentRollUnit, GewerkePosition, FinancingTranche,
  PropertyData, Offer, Invoice,
} from '../models/types';

const FLOOR_LEVELS: FloorLevel[] = ['TG', 'KG', 'EG', '1.OG', '2.OG', '3.OG', '4.OG', '5.OG', '6.OG', 'DG'];
const RENT_ROLL_USAGE = ['Wohnen', 'Büro', 'Einzelhandel', 'Lager', 'Stellplatz', 'Sonstiges'] as const;
const labelS: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4, display: 'block' };
const inputS: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 10, fontSize: 13, background: 'rgba(255,255,255,0.85)', outline: 'none' };
const thS: React.CSSProperties = { padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase' };
const tdS: React.CSSProperties = { padding: '6px 8px', textAlign: 'right', fontSize: 11, fontFamily: 'ui-monospace, monospace', color: '#1c1c1e' };

const DEV_STATUS_COLORS: Record<string, string> = {
  'Planung': '#007aff', 'Genehmigung': '#af52de', 'Ausschreibung': '#ff9500',
  'Bau': '#34c759', 'Abnahme': '#5ac8fa', 'Fertiggestellt': '#1a7f37',
};

function KpiChip({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || '#1c1c1e', fontFamily: 'ui-monospace, monospace', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.4)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Dev helpers ────────────────────────────────────────────────────────────────

function newRentRollUnit(): RentRollUnit {
  return {
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitNumber: '', floor: 'EG', area: 0, usageType: 'Wohnen', tenant: '',
    leaseStart: '', leaseEnd: '', currentRentPerSqm: 0, ervPerSqm: 0, monthlyRent: 0,
    indexationInterval: 'jährlich', indexationRate: 2.0, nonRecoverableOpex: 0,
  };
}

function newGewerkePos(): GewerkePosition {
  return {
    id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: 'Sonstiges', description: '', budgetInputMode: 'pauschal',
    budgetAmount: 0, budgetTotal: 0, costPerSqm: 0,
    startWeek: 1, durationWeeks: 12, endWeek: 13,
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

function newOffer(gewerkId = ''): Offer {
  return {
    id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    gewerkId, contractor: '', submittedAt: new Date().toISOString().slice(0, 10),
    totalAmount: 0, status: 'Eingegangen', notes: '',
  };
}

function newInvoice(gewerkId = ''): Invoice {
  return {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    gewerkId, contractor: '', invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '', totalAmount: 0, status: 'Offen', invoiceNumber: '', notes: '',
  };
}

// ─── Delta chip ───────────────────────────────────────────────────────────────
function DeltaChip({ value, label }: { value: number; label?: string }) {
  const sign = value > 0 ? '+' : '';
  const color = value > 0 ? '#f87171' : value < 0 ? '#34c759' : 'rgba(60,60,67,0.45)';
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace' }}>
      {sign}{label || formatEUR(value, true)}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DevelopmentsPage (List)
// ──────────────────────────────────────────────────────────────────────────────
export function DevelopmentsPage() {
  const { developments } = useStore();
  const { t, lang } = useLanguage();
  const dateLocale = lang === 'de' ? 'de-DE' : 'en-GB';

  const totalBudget = developments.reduce((s, d) => s + d.totalBudget, 0);
  const totalSpent = developments.reduce((s, d) => s + d.gewerke.reduce((gs, g) => gs + (g.actualCost || 0), 0), 0);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title={t('dev.title')}
        subtitle={`${developments.length} Projekte · ${formatEUR(totalBudget, true)} Gesamtbudget`}
        badge="Development"
      />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Projekte gesamt" value={`${developments.length}`} status="neutral" />
        <KPICard label="Gesamtbudget" value={formatEUR(totalBudget, true)} status="neutral" />
        <KPICard label="Ausgegeben (Ist)" value={formatEUR(totalSpent, true)} status="neutral" sub={totalBudget > 0 ? formatPct((totalSpent / totalBudget) * 100, 1) + ' des Budgets' : ''} />
        <KPICard label="Im Bau" value={`${developments.filter(d => d.status === 'Bau').length}`} status="good" />
      </div>
      <div className="grid grid-cols-3 gap-5">
        {developments.map(dev => {
          const totalActual = dev.gewerke.reduce((s, g) => s + (g.actualCost || 0), 0);
          const totalContract = dev.gewerke.reduce((s, g) => s + (g.contractAmount || 0), 0);
          const pd = dev.propertyData;
          const kpis = pd && pd.purchasePrice > 0 && pd.unitsAsIs.length > 0 ? (() => { try { return computePropertyKPIs(pd); } catch { return null; } })() : null;

          return (
            <Link key={dev.id} to={`/developments/${dev.id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <TitleImageDisplay entityId={dev.id} height={150} />
                <div style={{ padding: 20 }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{dev.name}</h3>
                      <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.45)' }}>{dev.city} · {dev.developmentType}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${DEV_STATUS_COLORS[dev.status] || '#94a3b8'}22`, color: DEV_STATUS_COLORS[dev.status] || '#94a3b8' }}>{dev.status}</span>
                      <CompletenessRing score={dev.completenessScore} size={32} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>Budget</div><div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e' }}>{formatEUR(dev.totalBudget, true)}</div></div>
                    <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>Gewerke</div><div style={{ fontSize: 14, fontWeight: 700, color: '#007aff' }}>{dev.gewerke.length}</div></div>
                    {kpis && <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>NIY</div><div style={{ fontSize: 14, fontWeight: 700, color: '#34c759' }}>{formatPct(kpis.niyAtAcquisition)}</div></div>}
                    {kpis && <div><div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>Dev IRR</div><div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>{kpis.irrDevelopment != null ? formatPct(kpis.irrDevelopment) : '—'}</div></div>}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {developments.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20" style={{ color: 'rgba(60,60,67,0.35)' }}>
          <HardHat size={40} />
          <div style={{ fontSize: 15 }}>Noch keine Development-Projekte. Überführe einen Acquisition-Deal.</div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DevelopmentDetailPage
// ──────────────────────────────────────────────────────────────────────────────
export function DevelopmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { developments, updateDevelopment, updateDevPropertyData, addActivityToDevelopment, addOffer, updateOffer, deleteOffer, addInvoice, updateInvoice, deleteInvoice, deleteDevelopment, transferDevToBestand, transferDevToSale } = useStore();
  const { t, lang } = useLanguage();
  const dateLocale = lang === 'de' ? 'de-DE' : 'en-GB';

  const dev = developments.find(d => d.id === id);
  const [activeTab, setActiveTab] = useState('summary');
  const [rentRollTab, setRentRollTab] = useState<'ist' | 'ziel'>('ist');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBestandModal, setShowBestandModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [offerModal, setOfferModal] = useState<{ open: boolean; gewerkId: string }>({ open: false, gewerkId: '' });
  const [invoiceModal, setInvoiceModal] = useState<{ open: boolean; gewerkId: string }>({ open: false, gewerkId: '' });

  if (!dev) {
    return (
      <div className="p-8">
        <div style={{ color: 'rgba(60,60,67,0.45)' }}>Projekt nicht gefunden.</div>
        <Link to="/developments" style={{ color: '#007aff' }}>← Zurück zu Developments</Link>
      </div>
    );
  }

  // Ensure propertyData exists
  const pd: PropertyData = dev.propertyData || createDefaultPropertyData({
    name: dev.name, address: dev.address, city: dev.city, zip: dev.zip,
    usageType: dev.usageType, dealType: 'Development',
    purchasePrice: dev.purchasePrice,
  });

  const snap = dev.underwritingSnapshot;

  const setPd = (patch: Partial<PropertyData>) => updateDevPropertyData(dev.id, patch);

  const kpis = useMemo(() => {
    try { if (pd.purchasePrice > 0 && pd.unitsAsIs.length > 0) return computePropertyKPIs(pd); } catch { }
    return null;
  }, [pd]);

  const snapKpis = useMemo(() => {
    try { if (snap && snap.purchasePrice > 0 && snap.unitsAsIs.length > 0) return computePropertyKPIs(snap); } catch { }
    return null;
  }, [snap]);

  const noiIst = useMemo(() => {
    try { if (pd.unitsAsIs.length > 0) return computePropertyNOI(pd, false); } catch { }
    return null;
  }, [pd]);

  const cfRows = useMemo(() => {
    try { if (pd.purchasePrice > 0 && pd.unitsAsIs.length > 0) return computePropertyCashFlow(pd); } catch { }
    return null;
  }, [pd]);

  const totalAcqCosts = computeTotalAcquisitionCosts(pd.purchasePrice, pd.acquisitionCosts);
  const totalDevBudget = computeTotalDevBudget(pd.gewerke, pd.contingencyPercent);
  const totalLoan = pd.financingTranches.reduce((s, t) => s + t.loanAmount, 0);
  const equity = Math.max(pd.purchasePrice + totalAcqCosts + totalDevBudget - totalLoan, 0);

  // Offer/Invoice totals
  const offers = dev.offers || [];
  const invoices = dev.invoices || [];
  const totalOffersAccepted = offers.filter(o => o.status === 'Beauftragt' || o.status === 'Abgeschlossen').reduce((s, o) => s + o.totalAmount, 0);
  const totalInvoicesPaid = invoices.filter(i => i.status === 'Bezahlt').reduce((s, i) => s + i.totalAmount, 0);
  const totalInvoicesOpen = invoices.filter(i => i.status === 'Offen' || i.status === 'Fällig').reduce((s, i) => s + i.totalAmount, 0);

  const updateUnit = (list: 'unitsAsIs' | 'unitsTarget', uid: string, patch: Partial<RentRollUnit>) => {
    const updated = pd[list].map(u => {
      if (u.id !== uid) return u;
      const merged = { ...u, ...patch };
      merged.monthlyRent = merged.area * merged.currentRentPerSqm;
      return merged;
    });
    setPd({ [list]: updated });
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    addActivityToDevelopment(dev.id, { id: `act-${Date.now()}`, date: new Date().toISOString(), type: 'Note', title: 'Notiz', description: noteText, user: 'M. Wagner' } as any);
    setNoteText('');
  };

  // ── Tab: Summary ────────────────────────────────────────────────────────────
  const renderSummaryTab = () => (
    <div className="space-y-6">
      {/* Status + identity */}
      <GlassPanel style={{ padding: 20 }}>
        <div className="flex items-start gap-4">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', marginBottom: 4 }}>{dev.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.55)' }}>{dev.address}, {dev.city} · {dev.developmentType}</div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <select style={{ padding: '5px 10px', borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.12)', fontSize: 12, fontWeight: 600, background: 'white' }}
                value={dev.status}
                onChange={e => updateDevelopment(dev.id, { status: e.target.value as any })}>
                {['Planung', 'Genehmigung', 'Ausschreibung', 'Bau', 'Abnahme', 'Fertiggestellt'].map(s => <option key={s}>{s}</option>)}
              </select>
              <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.04)', color: 'rgba(60,60,67,0.6)' }}>Start: {dev.startDate || '—'}</span>
              <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.04)', color: 'rgba(60,60,67,0.6)' }}>Fertig: {dev.plannedEndDate || '—'}</span>
            </div>
          </div>
          <CompletenessRing score={dev.completenessScore} size={56} />
        </div>
      </GlassPanel>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiChip label="Kaufpreis" value={formatEUR(dev.purchasePrice, true)} />
        <KpiChip label="Gesamtbudget" value={formatEUR(totalDevBudget, true)} color="#a78bfa" />
        <KpiChip label="Angebote (vergeben)" value={formatEUR(totalOffersAccepted, true)} color="#f97316" />
        <KpiChip label="Rechnungen (offen)" value={formatEUR(totalInvoicesOpen, true)} color="#fbbf24" />
        {kpis && <>
          <KpiChip label="Dev IRR" value={kpis.irrDevelopment != null ? formatPct(kpis.irrDevelopment) : '—'} color="#a78bfa" />
          <KpiChip label="NIY (Ziel)" value={formatPct(kpis.niyAtAcquisition)} color={kpis.niyAtAcquisition > 4.5 ? '#34c759' : '#fbbf24'} />
          <KpiChip label="Profit on Cost" value={formatPct(kpis.profitOnCost)} color="#34c759" />
          <KpiChip label="IRR (10J)" value={formatPct(kpis.irr10Year)} color={kpis.irr10Year > 12 ? '#34c759' : '#fbbf24'} />
        </>}
      </div>

      {/* Budget comparison bar */}
      {totalDevBudget > 0 && (
        <GlassPanel style={{ padding: 16 }}>
          <SectionHeader title="Budget-Übersicht" />
          <div className="flex items-center gap-3 mb-2">
            <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.55)', flex: 1 }}>
              Vergeben: {formatEUR(totalOffersAccepted, true)} / {formatEUR(totalDevBudget, true)} Budget
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: totalOffersAccepted > totalDevBudget ? '#f87171' : '#34c759' }}>
              {totalDevBudget > 0 ? formatPct(totalOffersAccepted / totalDevBudget * 100, 1) : '—'}
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, totalDevBudget > 0 ? totalOffersAccepted / totalDevBudget * 100 : 0)}%`, background: totalOffersAccepted > totalDevBudget ? '#f87171' : '#007aff', transition: 'width 0.3s' }} />
          </div>
        </GlassPanel>
      )}

      {/* Activity Log */}
      <GlassPanel style={{ padding: 18 }}>
        <SectionHeader title="Aktivitäten" />
        <div className="flex gap-2 mb-4">
          <input className="input-glass flex-1" style={inputS} placeholder="Notiz hinzufügen…" value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} />
          <button className="btn-primary px-4 py-2 rounded-xl text-sm" onClick={addNote}>Speichern</button>
        </div>
        <div className="space-y-3" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {dev.activityLog.map(a => (
            <div key={a.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-1">
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>{new Date((a as any).date || a.timestamp).toLocaleDateString(dateLocale)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.65)', whiteSpace: 'pre-wrap' }}>{a.description}</div>
            </div>
          ))}
          {dev.activityLog.length === 0 && <div style={{ color: 'rgba(60,60,67,0.35)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Keine Aktivitäten.</div>}
        </div>
      </GlassPanel>
    </div>
  );

  // ── Tab: Stammdaten ─────────────────────────────────────────────────────────
  const renderStammdatenTab = () => (
    <GlassPanel style={{ padding: 20 }}>
      <SectionHeader title="Stammdaten" />
      <div className="grid grid-cols-2 gap-4">
        <div><label style={labelS}>Projektname</label><input className="input-glass" style={inputS} value={dev.name} onChange={e => updateDevelopment(dev.id, { name: e.target.value })} /></div>
        <div><label style={labelS}>Nutzungsart</label><select className="input-glass" style={inputS} value={dev.usageType} onChange={e => updateDevelopment(dev.id, { usageType: e.target.value as any })}>{['Wohnen', 'Büro', 'Einzelhandel', 'Logistik', 'Mixed Use'].map(u => <option key={u}>{u}</option>)}</select></div>
        <div><label style={labelS}>Straße</label><input className="input-glass" style={inputS} value={dev.address} onChange={e => updateDevelopment(dev.id, { address: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label style={labelS}>PLZ</label><input className="input-glass" style={inputS} value={dev.zip} onChange={e => updateDevelopment(dev.id, { zip: e.target.value })} /></div>
          <div><label style={labelS}>Stadt</label><input className="input-glass" style={inputS} value={dev.city} onChange={e => updateDevelopment(dev.id, { city: e.target.value })} /></div>
        </div>
        <div><label style={labelS}>Entwicklungstyp</label><select className="input-glass" style={inputS} value={dev.developmentType} onChange={e => updateDevelopment(dev.id, { developmentType: e.target.value as any })}>{['Neubau', 'Kernsanierung', 'Modernisierung', 'Umbau', 'Aufstockung', 'Anbau'].map(d => <option key={d}>{d}</option>)}</select></div>
        <div><label style={labelS}>Projektstatus</label><select className="input-glass" style={inputS} value={dev.status} onChange={e => updateDevelopment(dev.id, { status: e.target.value as any })}>{['Planung', 'Genehmigung', 'Ausschreibung', 'Bau', 'Abnahme', 'Fertiggestellt'].map(s => <option key={s}>{s}</option>)}</select></div>
        <div><label style={labelS}>Baustart</label><input type="date" className="input-glass" style={inputS} value={dev.startDate} onChange={e => updateDevelopment(dev.id, { startDate: e.target.value })} /></div>
        <div><label style={labelS}>Fertigstellung (geplant)</label><input type="date" className="input-glass" style={inputS} value={dev.plannedEndDate} onChange={e => updateDevelopment(dev.id, { plannedEndDate: e.target.value })} /></div>
      </div>
    </GlassPanel>
  );

  // ── Tab: Ankauf (frozen/read-only, from underwritingSnapshot) ──────────────
  const renderAnkaufFrozenTab = () => {
    if (!snap) {
      return (
        <div className="flex flex-col items-center gap-4 py-16" style={{ color: 'rgba(60,60,67,0.35)' }}>
          <Lock size={36} />
          <div style={{ fontSize: 14 }}>Kein Underwriting-Snapshot verfügbar.</div>
          <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.3)' }}>Snapshot wird beim Überführen aus Acquisition angelegt.</div>
        </div>
      );
    }

    const snapArea = computeTotalArea(snap.unitsAsIs);
    const snapRent = computeAnnualRent(snap.unitsAsIs);
    const snapNOI = snapKpis ? null : (() => { try { return computePropertyNOI(snap, false); } catch { return null; } })();
    const curNOI = noiIst;
    const snapAcqCosts = computeTotalAcquisitionCosts(snap.purchasePrice, snap.acquisitionCosts);
    const curAcqCosts = totalAcqCosts;
    const snapDevBudget = computeTotalDevBudget(snap.gewerke, snap.contingencyPercent);
    const curDevBudget = totalDevBudget;

    const rows: [string, number, number, boolean][] = [
      ['Kaufpreis', snap.purchasePrice, pd.purchasePrice, false],
      ['Nebenkosten', snapAcqCosts, curAcqCosts, false],
      ['Baukosten (Budget)', snapDevBudget, curDevBudget, false],
      ['Jahresmiete (Ist)', snapRent, computeAnnualRent(pd.unitsAsIs), false],
      ['Leerstand (%)', snap.operatingCosts.vacancyRatePercent, pd.operatingCosts.vacancyRatePercent, true],
      ['Mgmt-Kosten (%)', snap.operatingCosts.managementCostPercent, pd.operatingCosts.managementCostPercent, true],
      ['Exit-Cap-Rate (%)', snap.marketAssumptions.perUsageType[0]?.exitCapRatePercent || 0, pd.marketAssumptions.perUsageType[0]?.exitCapRatePercent || 0, true],
      ['Haltedauer (J)', snap.holdingPeriodYears, pd.holdingPeriodYears, true],
    ];

    return (
      <div className="space-y-4">
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={14} color="#f97316" />
          <div style={{ fontSize: 12, color: '#f97316' }}>Dieser Tab zeigt den Underwriting-Snapshot bei Überführung in Development (schreibgeschützt). Für aktuelle Werte wechsle zum jeweiligen Tab.</div>
        </div>

        <GlassPanel style={{ padding: 16 }}>
          <SectionHeader title="Ankauf-Parameter: Underwriting vs. Aktuell" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <th style={{ ...thS, textAlign: 'left' }}>Parameter</th>
                  <th style={thS}>Underwriting</th>
                  <th style={thS}>Aktuell</th>
                  <th style={{ ...thS, color: '#f87171' }}>Delta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, uwVal, curVal, isPct]) => {
                  const delta = curVal - uwVal;
                  return (
                    <tr key={label} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ ...tdS, textAlign: 'left', fontWeight: 500, paddingLeft: 12 }}>{label}</td>
                      <td style={{ ...tdS, color: '#94a3b8' }}>{isPct ? formatPct(uwVal, 2) : formatEUR(uwVal)}</td>
                      <td style={{ ...tdS, color: '#1c1c1e', fontWeight: 600 }}>{isPct ? formatPct(curVal, 2) : formatEUR(curVal)}</td>
                      <td style={tdS}><DeltaChip value={delta} label={isPct ? `${delta > 0 ? '+' : ''}${delta.toFixed(2)}pp` : undefined} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassPanel>

        {/* Underwriting Rent Roll (frozen) */}
        {snap.unitsAsIs.length > 0 && (
          <GlassPanel style={{ padding: 16 }}>
            <SectionHeader title="Rent Roll bei Underwriting" />
            <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)', marginBottom: 8 }}>
              {snap.unitsAsIs.length} Einheiten · {snapArea.toLocaleString('de-DE')} m² · {formatEUR(snapRent, true)} p.a. Jahresmiete
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 200, overflowY: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, opacity: 0.7 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead><tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                  {['#', 'Etage', 'm²', 'Nutzung', 'Mieter', 'Ist €/m²', 'ERV €/m²', 'Mon. Miete'].map(h => <th key={h} style={{ ...thS, textAlign: 'left' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {snap.unitsAsIs.map(u => (
                    <tr key={u.id} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ ...tdS, textAlign: 'left', paddingLeft: 10 }}>{u.unitNumber}</td>
                      <td style={tdS}>{u.floor}</td>
                      <td style={tdS}>{u.area}</td>
                      <td style={tdS}>{u.usageType}</td>
                      <td style={{ ...tdS, textAlign: 'left' }}>{u.tenant || '—'}</td>
                      <td style={tdS}>{u.currentRentPerSqm.toFixed(2)}</td>
                      <td style={tdS}>{u.ervPerSqm.toFixed(2)}</td>
                      <td style={{ ...tdS, color: '#007aff' }}>{formatEUR(u.monthlyRent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        )}
      </div>
    );
  };

  // ── Tab: Rent Roll ──────────────────────────────────────────────────────────
  const renderRentRollTab = () => {
    const list = rentRollTab === 'ist' ? 'unitsAsIs' : 'unitsTarget';
    const units = pd[list];
    return (
      <div className="space-y-4">
        <div className="flex gap-1 p-1" style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 10, width: 'fit-content' }}>
          {(['ist', 'ziel'] as const).map(tab => (
            <button key={tab} onClick={() => setRentRollTab(tab)} style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: rentRollTab === tab ? '#fff' : 'transparent', color: rentRollTab === tab ? '#007aff' : 'rgba(60,60,67,0.55)', boxShadow: rentRollTab === tab ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
              {tab === 'ist' ? 'Ist-Zustand' : 'Ziel-Zustand'}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>{units.length} Einheiten · {computeTotalArea(units).toLocaleString('de-DE')} m² · {formatEUR(computeAnnualRent(units), true)} p.a.</div>
          <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => setPd({ [list]: [...units, newRentRollUnit()] })}>+ Einheit</button>
        </div>
        {units.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10" style={{ color: 'rgba(60,60,67,0.35)' }}>
            <Building2 size={28} /><div style={{ fontSize: 13 }}>Keine Einheiten erfasst.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 760 }}>
              <thead><tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                {['#', 'Etage', 'm²', 'Nutzung', 'Mieter', 'Ist €/m²', 'ERV €/m²', 'Monat. Miete', 'Mietende', ''].map(h => <th key={h} style={{ ...thS, textAlign: 'left' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {units.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={tdS}><input style={{ ...inputS, width: 60, padding: '4px 6px', fontSize: 11 }} value={u.unitNumber} onChange={e => updateUnit(list, u.id, { unitNumber: e.target.value })} /></td>
                    <td style={tdS}><select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={u.floor} onChange={e => updateUnit(list, u.id, { floor: e.target.value as FloorLevel })}>{FLOOR_LEVELS.map(f => <option key={f}>{f}</option>)}</select></td>
                    <td style={tdS}><input type="number" style={{ ...inputS, width: 65, padding: '4px 6px', fontSize: 11 }} value={u.area || ''} onChange={e => { const a = parseFloat(e.target.value) || 0; updateUnit(list, u.id, { area: a, monthlyRent: a * u.currentRentPerSqm }); }} /></td>
                    <td style={tdS}><select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={u.usageType} onChange={e => updateUnit(list, u.id, { usageType: e.target.value as any })}>{RENT_ROLL_USAGE.map(x => <option key={x}>{x}</option>)}</select></td>
                    <td style={tdS}><input style={{ ...inputS, width: 90, padding: '4px 6px', fontSize: 11 }} value={u.tenant} onChange={e => updateUnit(list, u.id, { tenant: e.target.value })} /></td>
                    <td style={tdS}><input type="number" step="0.5" style={{ ...inputS, width: 65, padding: '4px 6px', fontSize: 11 }} value={u.currentRentPerSqm || ''} onChange={e => { const r = parseFloat(e.target.value) || 0; updateUnit(list, u.id, { currentRentPerSqm: r, monthlyRent: u.area * r }); }} /></td>
                    <td style={tdS}><input type="number" step="0.5" style={{ ...inputS, width: 65, padding: '4px 6px', fontSize: 11 }} value={u.ervPerSqm || ''} onChange={e => updateUnit(list, u.id, { ervPerSqm: parseFloat(e.target.value) || 0 })} /></td>
                    <td style={{ ...tdS, color: '#007aff', fontWeight: 700 }}>{formatEUR(u.monthlyRent)}</td>
                    <td style={tdS}><input type="date" style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={u.leaseEnd} onChange={e => updateUnit(list, u.id, { leaseEnd: e.target.value })} /></td>
                    <td style={tdS}><button onClick={() => setPd({ [list]: units.filter(x => x.id !== u.id) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ── Tab: Opex ───────────────────────────────────────────────────────────────
  const renderOpexTab = () => (
    <div className="space-y-4">
      <GlassPanel style={{ padding: 20 }}>
        <SectionHeader title="Bewirtschaftungskosten" />
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Leerstandsquote (%)', 'vacancyRatePercent', 0.5],
            ['Verwaltungskosten (%)', 'managementCostPercent', 0.5],
            ['Instandhaltung (€/m²/J)', 'maintenanceReservePerSqm', 1],
            ['Versicherung (€/J)', 'insurancePerYear', 1000],
            ['Grundsteuer (€/J)', 'propertyTaxPerYear', 1000],
            ['Sonstige Opex (€/J)', 'otherOpexPerYear', 1000],
            ['Sonstige Einnahmen (€/J)', 'otherIncomePerYear', 1000],
          ].map(([label, key, step]) => (
            <div key={key as string}>
              <label style={labelS}>{label as string}</label>
              <input type="number" step={step as number} className="input-glass" style={inputS}
                value={(pd.operatingCosts as any)[key as string] || ''}
                onChange={e => setPd({ operatingCosts: { ...pd.operatingCosts, [key as string]: parseFloat(e.target.value) || 0 } })} />
            </div>
          ))}
        </div>
      </GlassPanel>
      {noiIst && (
        <GlassPanel style={{ padding: 18 }}>
          <SectionHeader title="NOI-Vorschau" />
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Bruttomiete', formatEUR(noiIst.grossRentalIncome), '#007aff'],
              ['Leerstand', `−${formatEUR(noiIst.vacancyLoss)}`, '#fbbf24'],
              ['Eff. Bruttomiete', formatEUR(noiIst.effectiveGrossIncome), '#1c1c1e'],
              ['Opex gesamt', `−${formatEUR(noiIst.totalOperatingExpenses)}`, '#f87171'],
              ['NOI', formatEUR(noiIst.noi), noiIst.noi > 0 ? '#34c759' : '#f87171'],
            ].map(([l, v, c]) => (
              <div key={l} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: 12, color: 'rgba(60,60,67,0.65)' }}>{l}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: c as string, fontFamily: 'ui-monospace, monospace' }}>{v}</span>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );

  // ── Tab: Markt ──────────────────────────────────────────────────────────────
  const renderMarktTab = () => (
    <div className="space-y-4">
      {pd.marketAssumptions.perUsageType.map((m, idx) => (
        <GlassPanel key={m.usageType} style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#007aff', marginBottom: 12 }}>{m.usageType}</div>
          <div className="grid grid-cols-3 gap-3">
            <div><label style={labelS}>ERV (€/m²/Mon)</label><div style={{ fontSize: 14, fontWeight: 700, padding: '9px 0' }}>{m.ervFromRentRoll.toFixed(2)}</div></div>
            <div>
              <label style={labelS}>ERV-Wachstum (%)</label>
              <input type="number" step="0.1" className="input-glass" style={inputS} value={m.ervGrowthRatePercent}
                onChange={e => { const arr = [...pd.marketAssumptions.perUsageType]; arr[idx] = { ...m, ervGrowthRatePercent: parseFloat(e.target.value) || 0 }; setPd({ marketAssumptions: { ...pd.marketAssumptions, perUsageType: arr } }); }} />
            </div>
            <div>
              <label style={labelS}>Exit-Cap-Rate (%)</label>
              <input type="number" step="0.1" className="input-glass" style={inputS} value={m.exitCapRatePercent}
                onChange={e => { const cap = parseFloat(e.target.value) || 0; const arr = [...pd.marketAssumptions.perUsageType]; arr[idx] = { ...m, exitCapRatePercent: cap, exitMultiplier: cap > 0 ? 100 / cap : 0 }; setPd({ marketAssumptions: { ...pd.marketAssumptions, perUsageType: arr } }); }} />
            </div>
          </div>
        </GlassPanel>
      ))}
      <GlassPanel style={{ padding: 16 }}>
        <SectionHeader title="Globale Annahmen" />
        <div className="grid grid-cols-3 gap-4">
          {[['Opex-Inflation (%)', 'opexInflationPercent'], ['Capex-Inflation (%)', 'capexInflationPercent'], ['Verkaufskosten (%)', 'salesCostPercent']].map(([l, k]) => (
            <div key={k}>
              <label style={labelS}>{l}</label>
              <input type="number" step="0.1" className="input-glass" style={inputS} value={(pd.marketAssumptions as any)[k] || ''} onChange={e => setPd({ marketAssumptions: { ...pd.marketAssumptions, [k]: parseFloat(e.target.value) || 0 } })} />
            </div>
          ))}
          <div>
            <label style={labelS}>Haltedauer (Jahre)</label>
            <input type="number" className="input-glass" style={inputS} value={pd.holdingPeriodYears} onChange={e => setPd({ holdingPeriodYears: parseInt(e.target.value) || 10 })} />
          </div>
        </div>
      </GlassPanel>
    </div>
  );

  // ── Tab: Kosten & Budget (Gewerke + Offers + Invoices) ─────────────────────
  const renderKostenBudgetTab = () => {
    const gewerke = pd.gewerke.length > 0 ? pd.gewerke : [];
    const uwGewerke = snap ? snap.gewerke : [];

    return (
      <div className="space-y-5">
        {/* 3-column underwriting comparison */}
        {snap && (
          <GlassPanel style={{ padding: 16 }}>
            <SectionHeader title="Underwriting vs. Aktuell (Budget)" />
            <div className="grid grid-cols-3 gap-4">
              <KpiChip label="UW Gesamtbudget" value={formatEUR(computeTotalDevBudget(snap.gewerke, snap.contingencyPercent), true)} color="#94a3b8" />
              <KpiChip label="Aktuell Budget" value={formatEUR(totalDevBudget, true)} color="#007aff" />
              <KpiChip label="Delta" value={formatEUR(totalDevBudget - computeTotalDevBudget(snap.gewerke, snap.contingencyPercent), true)} color={totalDevBudget > computeTotalDevBudget(snap.gewerke, snap.contingencyPercent) ? '#f87171' : '#34c759'} />
              <KpiChip label="UW Angebote" value="—" color="#94a3b8" />
              <KpiChip label="Vergaben (Ist)" value={formatEUR(totalOffersAccepted, true)} color="#f97316" />
              <KpiChip label="Rechnungen Offen" value={formatEUR(totalInvoicesOpen, true)} color="#fbbf24" />
            </div>
          </GlassPanel>
        )}

        {/* Gewerke table */}
        <GlassPanel style={{ padding: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader title="Gewerke (Kostenplan)" />
            <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => setPd({ gewerke: [...pd.gewerke, newGewerkePos()] })}>+ Gewerk</button>
          </div>
          {gewerke.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8" style={{ color: 'rgba(60,60,67,0.35)' }}>
              <HardHat size={28} /><div style={{ fontSize: 13 }}>Keine Gewerke im neuen Modell. Füge Gewerke hinzu.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 800 }}>
                <thead><tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                  {['Gewerk', 'UW Budget', 'Akt. Budget', 'Δ', 'Angeb. (vergaben)', 'RE (bezahlt)', 'Status', ''].map(h => <th key={h} style={{ ...thS, textAlign: 'left' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {gewerke.map((g, idx) => {
                    const gwOffers = offers.filter(o => o.gewerkId === g.id);
                    const gwInvoices = invoices.filter(i => i.gewerkId === g.id);
                    const gwOfferTotal = gwOffers.filter(o => o.status === 'Beauftragt' || o.status === 'Abgeschlossen').reduce((s, o) => s + o.totalAmount, 0);
                    const gwInvPaid = gwInvoices.filter(i => i.status === 'Bezahlt').reduce((s, i) => s + i.totalAmount, 0);
                    const uwBudget = (uwGewerke[idx]?.budgetTotal ?? g.budgetTotal);
                    const delta = g.budgetTotal - uwBudget;
                    return (
                      <tr key={g.id} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ ...tdS, textAlign: 'left', paddingLeft: 10 }}>
                          <select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={g.category} onChange={e => { const gs = [...pd.gewerke]; gs[idx] = { ...g, category: e.target.value }; setPd({ gewerke: gs }); }}>{DEFAULT_GEWERKE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                        </td>
                        <td style={{ ...tdS, color: '#94a3b8' }}>{formatEUR(uwBudget, true)}</td>
                        <td style={tdS}>
                          <input type="number" style={{ ...inputS, width: 90, padding: '4px 6px', fontSize: 11 }} value={g.budgetTotal || ''} onChange={e => { const b = parseFloat(e.target.value) || 0; const gs = [...pd.gewerke]; gs[idx] = { ...g, budgetTotal: b, budgetAmount: b }; setPd({ gewerke: gs }); }} />
                        </td>
                        <td style={tdS}><DeltaChip value={delta} /></td>
                        <td style={{ ...tdS, color: gwOfferTotal > g.budgetTotal ? '#f87171' : '#007aff' }}>{formatEUR(gwOfferTotal, true)}</td>
                        <td style={{ ...tdS, color: '#34c759' }}>{formatEUR(gwInvPaid, true)}</td>
                        <td style={tdS}>
                          <select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={g.status} onChange={e => { const gs = [...pd.gewerke]; gs[idx] = { ...g, status: e.target.value as any }; setPd({ gewerke: gs }); }}>{['Geplant', 'Beauftragt', 'Laufend', 'Abgeschlossen'].map(s => <option key={s}>{s}</option>)}</select>
                        </td>
                        <td style={tdS}>
                          <div className="flex gap-1">
                            <button style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, background: 'rgba(0,122,255,0.1)', color: '#007aff', border: 'none', cursor: 'pointer' }} onClick={() => setOfferModal({ open: true, gewerkId: g.id })}>+ Angebot</button>
                            <button style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, background: 'rgba(74,222,128,0.1)', color: '#34c759', border: 'none', cursor: 'pointer' }} onClick={() => setInvoiceModal({ open: true, gewerkId: g.id })}>+ Rechnung</button>
                            <button onClick={() => setPd({ gewerke: pd.gewerke.filter(x => x.id !== g.id) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><Trash2 size={11} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 11 }}>Gesamt (inkl. {pd.contingencyPercent}% Puffer)</td>
                    <td style={{ ...tdS, color: '#94a3b8' }}>{formatEUR(computeTotalDevBudget(snap?.gewerke || [], snap?.contingencyPercent || pd.contingencyPercent), true)}</td>
                    <td style={{ ...tdS, fontWeight: 700, color: '#007aff' }}>{formatEUR(totalDevBudget, true)}</td>
                    <td style={tdS}><DeltaChip value={totalDevBudget - (snap ? computeTotalDevBudget(snap.gewerke, snap.contingencyPercent) : totalDevBudget)} /></td>
                    <td style={{ ...tdS, color: '#f97316', fontWeight: 700 }}>{formatEUR(totalOffersAccepted, true)}</td>
                    <td style={{ ...tdS, color: '#34c759', fontWeight: 700 }}>{formatEUR(totalInvoicesPaid, true)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </GlassPanel>

        {/* Offers list */}
        <GlassPanel style={{ padding: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader title="Angebote" />
            <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => { addOffer(dev.id, newOffer()); }}>+ Angebot</button>
          </div>
          {offers.length === 0 ? <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.35)', textAlign: 'center', padding: '16px 0' }}>Keine Angebote erfasst.</div> : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead><tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                  {['Auftragnehmer', 'Datum', 'Betrag (€)', 'Status', 'Gewerk', ''].map(h => <th key={h} style={{ ...thS, textAlign: 'left' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {offers.map(o => (
                    <tr key={o.id} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={tdS}><input style={{ ...inputS, padding: '4px 8px', fontSize: 11 }} value={o.contractor} onChange={e => updateOffer(dev.id, o.id, { contractor: e.target.value })} /></td>
                      <td style={tdS}><input type="date" style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={o.submittedAt} onChange={e => updateOffer(dev.id, o.id, { submittedAt: e.target.value })} /></td>
                      <td style={tdS}><input type="number" style={{ ...inputS, width: 100, padding: '4px 6px', fontSize: 11 }} value={o.totalAmount || ''} onChange={e => updateOffer(dev.id, o.id, { totalAmount: parseFloat(e.target.value) || 0 })} /></td>
                      <td style={tdS}><select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={o.status} onChange={e => updateOffer(dev.id, o.id, { status: e.target.value as any })}>{['Eingegangen', 'In Prüfung', 'Beauftragt', 'Abgelehnt', 'Abgeschlossen'].map(s => <option key={s}>{s}</option>)}</select></td>
                      <td style={{ ...tdS, color: 'rgba(60,60,67,0.45)', fontSize: 10 }}>{pd.gewerke.find(g => g.id === o.gewerkId)?.category || '—'}</td>
                      <td style={tdS}><button onClick={() => deleteOffer(dev.id, o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><Trash2 size={11} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassPanel>

        {/* Invoices list */}
        <GlassPanel style={{ padding: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader title="Rechnungen" />
            <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => { addInvoice(dev.id, newInvoice()); }}>+ Rechnung</button>
          </div>
          {invoices.length === 0 ? <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.35)', textAlign: 'center', padding: '16px 0' }}>Keine Rechnungen erfasst.</div> : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead><tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                  {['Rechnungsnr.', 'Auftragnehmer', 'Datum', 'Fällig', 'Betrag', 'Status', ''].map(h => <th key={h} style={{ ...thS, textAlign: 'left' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={tdS}><input style={{ ...inputS, width: 90, padding: '4px 6px', fontSize: 11 }} value={inv.invoiceNumber} onChange={e => updateInvoice(dev.id, inv.id, { invoiceNumber: e.target.value })} /></td>
                      <td style={tdS}><input style={{ ...inputS, padding: '4px 8px', fontSize: 11 }} value={inv.contractor} onChange={e => updateInvoice(dev.id, inv.id, { contractor: e.target.value })} /></td>
                      <td style={tdS}><input type="date" style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={inv.invoiceDate} onChange={e => updateInvoice(dev.id, inv.id, { invoiceDate: e.target.value })} /></td>
                      <td style={tdS}><input type="date" style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={inv.dueDate} onChange={e => updateInvoice(dev.id, inv.id, { dueDate: e.target.value })} /></td>
                      <td style={{ ...tdS, color: '#007aff', fontWeight: 600 }}>{formatEUR(inv.totalAmount, true)}</td>
                      <td style={tdS}><select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={inv.status} onChange={e => updateInvoice(dev.id, inv.id, { status: e.target.value as any })}>{['Offen', 'Fällig', 'Bezahlt', 'Storniert'].map(s => <option key={s}>{s}</option>)}</select></td>
                      <td style={tdS}><button onClick={() => deleteInvoice(dev.id, inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><Trash2 size={11} /></button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)' }}>
                    <td colSpan={4} style={{ padding: '8px 10px', fontWeight: 700, fontSize: 11 }}>Gesamt Rechnungen</td>
                    <td style={{ ...tdS, fontWeight: 700, color: '#007aff' }}>{formatEUR(invoices.reduce((s, i) => s + i.totalAmount, 0), true)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </GlassPanel>
      </div>
    );
  };

  // ── Tab: Finanzierung ───────────────────────────────────────────────────────
  const renderFinanzierungTab = () => (
    <div className="space-y-4">
      <GlassPanel style={{ padding: 18 }}>
        <SectionHeader title="Kapitalbedarfsübersicht" />
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Kaufpreis', formatEUR(pd.purchasePrice, true), '#1c1c1e'],
            ['Nebenkosten', formatEUR(totalAcqCosts, true), '#fbbf24'],
            ['Baukosten', formatEUR(totalDevBudget, true), '#a78bfa'],
            ['Fremdkapital', formatEUR(totalLoan, true), '#34c759'],
            ['Eigenkapital', formatEUR(equity, true), '#f97316'],
          ].map(([l, v, c]) => <KpiChip key={l as string} label={l as string} value={v as string} color={c as string} />)}
        </div>
      </GlassPanel>
      <GlassPanel style={{ padding: 18 }}>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader title="Finanzierungstranchen" />
          <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => setPd({ financingTranches: [...pd.financingTranches, newTranche()] })}>+ Tranche</button>
        </div>
        {pd.financingTranches.map((tr, idx) => (
          <div key={tr.id} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', marginBottom: 10, position: 'relative' }}>
            <button onClick={() => setPd({ financingTranches: pd.financingTranches.filter(x => x.id !== tr.id) })} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><X size={14} /></button>
            <div className="grid grid-cols-3 gap-3">
              {[['Name', 'name', 'text'], ['Betrag (€)', 'loanAmount', 'number'], ['Zinssatz (%)', 'interestRate', 'number'], ['Laufzeit (J)', 'loanTerm', 'number'], ['Tilgung (%)', 'amortizationRate', 'number']].map(([l, k, tp]) => (
                <div key={k as string}>
                  <label style={labelS}>{l as string}</label>
                  <input type={tp as string} step="0.1" className="input-glass" style={inputS}
                    value={(tr as any)[k as string] || ''}
                    onChange={e => { const ts = [...pd.financingTranches]; ts[idx] = { ...tr, [k as string]: tp === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value }; setPd({ financingTranches: ts }); }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </GlassPanel>
    </div>
  );

  // ── Tab: Cashflow ────────────────────────────────────────────────────────────
  const renderCashflowTab = () => {
    if (!cfRows) return (
      <div className="flex flex-col items-center gap-4 py-20" style={{ color: 'rgba(60,60,67,0.35)' }}>
        <BarChart3 size={36} /><div style={{ fontSize: 13 }}>Kaufpreis und Rent Roll erforderlich.</div>
      </div>
    );
    const chartData = cfRows.slice(0, 11).map(r => ({ year: `J${r.yearIndex}`, NOI: Math.round(r.noi / 1000), CF: Math.round(r.freeCashflow / 1000) }));
    return (
      <div className="space-y-5">
        {kpis && (
          <div className="grid grid-cols-4 gap-3">
            <KpiChip label="IRR (10J)" value={`${kpis.irr10Year.toFixed(1)}%`} color={kpis.irr10Year > 12 ? '#34c759' : '#fbbf24'} />
            <KpiChip label="Dev IRR" value={kpis.irrDevelopment != null ? `${kpis.irrDevelopment.toFixed(1)}%` : '—'} color="#a78bfa" />
            <KpiChip label="Equity Multiple" value={`${kpis.equityMultiple10Year.toFixed(2)}x`} color="#007aff" />
            <KpiChip label="Profit on Cost" value={formatPct(kpis.profitOnCost)} color="#34c759" />
          </div>
        )}
        <GlassPanel style={{ padding: 16 }}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="year" tick={{ fontSize: 9, fill: 'rgba(60,60,67,0.5)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(60,60,67,0.5)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}k`} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [`${v}k €`]} />
              <Bar dataKey="NOI" fill="rgba(0,122,255,0.65)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="CF" fill="rgba(74,222,128,0.65)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassPanel>
        <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr style={{ background: 'rgba(0,0,0,0.03)' }}>
              {['Jahr', 'Bruttomiete', 'NOI', 'Baukosten', 'Transaktion', 'Finanzierung', 'Free CF', 'Kumulativ'].map(h => <th key={h} style={thS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {cfRows.map(r => (
                <tr key={r.yearIndex} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  <td style={{ ...tdS, fontWeight: 700 }}>{r.calendarYear}</td>
                  <td style={{ ...tdS, color: '#007aff' }}>{formatEUR(r.grossRentalIncome, true)}</td>
                  <td style={{ ...tdS, fontWeight: 600 }}>{formatEUR(r.noi, true)}</td>
                  <td style={{ ...tdS, color: r.capexConstructionCosts > 0 ? '#a78bfa' : 'rgba(60,60,67,0.3)' }}>{r.capexConstructionCosts > 0 ? `−${formatEUR(r.capexConstructionCosts, true)}` : '—'}</td>
                  <td style={{ ...tdS, color: r.transactionsCashflow < 0 ? '#f87171' : '#34c759' }}>{formatEUR(r.transactionsCashflow, true)}</td>
                  <td style={{ ...tdS, color: '#fbbf24' }}>{formatEUR(r.debtCashflow, true)}</td>
                  <td style={{ ...tdS, fontWeight: 700, color: r.freeCashflow >= 0 ? '#34c759' : '#f87171' }}>{r.freeCashflow >= 0 ? '+' : ''}{formatEUR(r.freeCashflow, true)}</td>
                  <td style={{ ...tdS, color: r.cumulativeFreeCashflow >= 0 ? '#34c759' : '#f87171' }}>{formatEUR(r.cumulativeFreeCashflow, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Tab: Dokumente ──────────────────────────────────────────────────────────
  const renderDokumenteTab = () => (
    <GlassPanel style={{ padding: 18 }}>
      <SectionHeader title="Dokumente" />
      {dev.documents.length === 0 ? <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.35)', textAlign: 'center', padding: '24px 0' }}>Keine Dokumente.</div> : (
        <div className="space-y-2">
          {dev.documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.02)' }}>
              <FileText size={14} color="rgba(60,60,67,0.5)" />
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{doc.name}</div><div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>{doc.category} · {doc.fileSize}</div></div>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );

  // ── Tab config ────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'stammdaten', label: 'Stammdaten' },
    { id: 'ankauf', label: 'Ankauf *' },
    { id: 'rentroll', label: 'Rent Roll' },
    { id: 'opex', label: 'Opex' },
    { id: 'markt', label: 'Markt' },
    { id: 'kosten', label: 'Kosten & Budget' },
    { id: 'finanzierung', label: 'Finanzierung' },
    { id: 'cashflow', label: 'Cashflow' },
    { id: 'dokumente', label: 'Dokumente' },
    { id: 'bilder', label: 'Bilder' },
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link to="/developments" style={{ color: 'rgba(60,60,67,0.45)', marginTop: 4 }}><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1c1c1e', margin: 0 }}>{dev.name}</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: `${DEV_STATUS_COLORS[dev.status] || '#94a3b8'}22`, color: DEV_STATUS_COLORS[dev.status] || '#94a3b8' }}>{dev.status}</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.55)', marginTop: 4 }}>{dev.address}, {dev.city} · {dev.developmentType} · {dev.usageType}</div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2" onClick={() => setShowBestandModal(true)}>
              <CheckCircle size={14} /> In Bestand
            </button>
            <button className="btn-glass px-3 py-2 rounded-xl text-sm flex items-center gap-2" style={{ color: '#f87171' }} onClick={() => setShowDeleteModal(true)}>
              <Trash2 size={14} /> Löschen
            </button>
          </div>
        </div>
        <CompletenessRing score={dev.completenessScore} size={48} />
      </div>

      {/* Tabs */}
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <div className="flex gap-1" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', minWidth: 'max-content' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#007aff' : 'rgba(60,60,67,0.55)', background: 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #007aff' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {tab.id === 'ankauf' && <Lock size={11} />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'summary' && renderSummaryTab()}
        {activeTab === 'stammdaten' && renderStammdatenTab()}
        {activeTab === 'ankauf' && renderAnkaufFrozenTab()}
        {activeTab === 'rentroll' && renderRentRollTab()}
        {activeTab === 'opex' && renderOpexTab()}
        {activeTab === 'markt' && renderMarktTab()}
        {activeTab === 'kosten' && renderKostenBudgetTab()}
        {activeTab === 'finanzierung' && renderFinanzierungTab()}
        {activeTab === 'cashflow' && renderCashflowTab()}
        {activeTab === 'dokumente' && renderDokumenteTab()}
        {activeTab === 'bilder' && <ImageManager entityId={dev.id} entityType="development" />}
      </div>

      {/* Modals */}
      {showBestandModal && (
        <Modal onClose={() => setShowBestandModal(false)} title="In Bestand überführen">
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.65)', marginBottom: 20 }}><strong>{dev.name}</strong> als fertiges Bestandsobjekt übernehmen?</div>
            <div className="flex gap-3">
              <button className="btn-glass flex-1 py-2 rounded-xl" onClick={() => setShowBestandModal(false)}>Abbrechen</button>
              <button className="btn-primary flex-1 py-2 rounded-xl" onClick={() => { transferDevToBestand(dev.id); navigate('/assets'); }}>Überführen</button>
            </div>
          </div>
        </Modal>
      )}
      {showDeleteModal && (
        <Modal onClose={() => setShowDeleteModal(false)} title="Projekt löschen">
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.65)', marginBottom: 20 }}><strong>{dev.name}</strong> unwiderruflich löschen?</div>
            <div className="flex gap-3">
              <button className="btn-glass flex-1 py-2 rounded-xl" onClick={() => setShowDeleteModal(false)}>Abbrechen</button>
              <button style={{ flex: 1, background: '#f87171', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 0', cursor: 'pointer', fontWeight: 700 }} onClick={() => { deleteDevelopment(dev.id); navigate('/developments'); }}>Löschen</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

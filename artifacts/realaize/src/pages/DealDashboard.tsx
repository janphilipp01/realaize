import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, AlertTriangle, FileText, Download,
  Edit3, Save, X, Bot, Clock, Upload, Zap, Info, TrendingUp,
  Plus, Trash2, Building2, HardHat, ChevronRight, Home,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { GlassPanel, PageHeader, KPICard, StageBadge, StatusBadge, Modal, SectionHeader, CompletenessRing } from '../components/shared';
import { computeDealKPIs, formatEUR, formatPct, formatX } from '../utils/kpiEngine';
import { computePropertyNOI, computePropertyKPIs, computePropertyCashFlow, computeTotalAcquisitionCosts, computeTotalDevBudget, computeTotalArea, computeAnnualRent, buildMarketAssumptionsFromRentRoll } from '../utils/propertyCashFlowModel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import ImageManager, { TitleImageDisplay } from '../components/ImageManager';
import { useLanguage } from '../i18n/LanguageContext';
import type { ActivityEntry, FloorLevel, RentRollUnit, GewerkePosition, AcquisitionCostItem, FinancingTranche, PropertyData, AcquisitionDeal } from '../models/types';
import { createDefaultPropertyData, DEFAULT_GEWERKE_CATEGORIES, getDefaultErvGrowth, getDefaultExitCapRate } from '../models/types';

const FLOOR_LEVELS: FloorLevel[] = ['TG', 'KG', 'EG', '1.OG', '2.OG', '3.OG', '4.OG', '5.OG', '6.OG', 'DG'];
const RENT_ROLL_USAGE = ['Wohnen', 'Büro', 'Einzelhandel', 'Lager', 'Stellplatz', 'Sonstiges'] as const;
const STAGE_ORDER: AcquisitionDeal['stage'][] = ['Screening', 'Due Diligence', 'Verhandlung', 'Beurkundung'];
const DEV_TYPES = ['Neubau', 'Kernsanierung', 'Modernisierung', 'Umbau', 'Aufstockung', 'Anbau'];
const labelS: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4, display: 'block' };
const inputS: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 10, fontSize: 13, background: 'rgba(255,255,255,0.85)', outline: 'none' };
const thS: React.CSSProperties = { padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(60,60,67,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase' };
const tdS: React.CSSProperties = { padding: '6px 8px', textAlign: 'right', fontSize: 11, fontFamily: 'ui-monospace, monospace', color: '#1c1c1e' };

function newUnit(): RentRollUnit {
  return {
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitNumber: '', floor: 'EG', area: 0, usageType: 'Wohnen', tenant: '',
    leaseStart: '', leaseEnd: '', currentRentPerSqm: 0, ervPerSqm: 0, monthlyRent: 0,
    indexationInterval: 'jährlich', indexationRate: 2.0, nonRecoverableOpex: 0,
  };
}

function newGewerk(): GewerkePosition {
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

// ── Small KPI Chip ────────────────────────────────────────────────────────────
function KpiChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || '#1c1c1e', fontFamily: 'ui-monospace, monospace', marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DealDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deals, updateDeal, updateDealPropertyData, deleteDeal, transferToDevelopment, addActivityToDeal, addAuditEntry } = useStore();
  const { t, lang } = useLanguage();
  const dateLocale = lang === 'de' ? 'de-DE' : 'en-GB';
  const deal = deals.find(d => d.id === id);

  const [activeTab, setActiveTab] = useState('summary');
  const [showDevModal, setShowDevModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [rentRollTab, setRentRollTab] = useState<'ist' | 'ziel'>('ist');

  if (!deal) {
    return (
      <div className="p-8">
        <div style={{ color: 'rgba(60,60,67,0.45)' }}>Deal nicht gefunden.</div>
        <Link to="/acquisition" style={{ color: '#007aff' }}>← Zurück zur Pipeline</Link>
      </div>
    );
  }

  const isDev = deal.dealType === 'Development';

  // Ensure propertyData exists (create default for legacy deals)
  const pd: PropertyData = deal.propertyData || createDefaultPropertyData({
    name: deal.name, address: deal.address, city: deal.city, zip: deal.zip,
    usageType: deal.usageType, dealType: deal.dealType,
    purchasePrice: deal.underwritingAssumptions.purchasePrice,
  });

  const setPd = (patch: Partial<PropertyData>) => {
    updateDealPropertyData(deal.id, patch);
  };

  const kpis = useMemo(() => {
    try {
      if (pd.purchasePrice > 0 && pd.unitsAsIs.length > 0) return computePropertyKPIs(pd);
    } catch { }
    return null;
  }, [pd]);

  const noiIst = useMemo(() => {
    try { if (pd.unitsAsIs.length > 0) return computePropertyNOI(pd, false); } catch { }
    return null;
  }, [pd]);

  const cfRows = useMemo(() => {
    try { if (pd.purchasePrice > 0 && pd.unitsAsIs.length > 0) return computePropertyCashFlow(pd); } catch { }
    return null;
  }, [pd]);

  const legacyKpis = computeDealKPIs(deal.underwritingAssumptions, deal.financingAssumptions);
  const totalAcqCosts = computeTotalAcquisitionCosts(pd.purchasePrice, pd.acquisitionCosts);
  const totalDevBudget = isDev ? computeTotalDevBudget(pd.gewerke, pd.contingencyPercent) : 0;
  const totalCapReq = pd.purchasePrice + totalAcqCosts + totalDevBudget;
  const totalLoan = pd.financingTranches.reduce((s, t) => s + t.loanAmount, 0);
  const equity = Math.max(totalCapReq - totalLoan, 0);

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
    addActivityToDeal(deal.id, { id: `act-${Date.now()}`, dealId: deal.id, date: new Date().toISOString(), type: 'Note', title: 'Notiz', description: noteText, user: 'M. Wagner' });
    setNoteText('');
  };

  const handleTransferDev = () => {
    addAuditEntry({ id: `audit-${Date.now()}`, action: 'In Development überführt', entityType: 'Deal', entityId: deal.id, entityName: deal.name, user: 'M. Wagner', timestamp: new Date().toISOString(), details: '' });
    transferToDevelopment(deal.id);
    navigate('/developments');
  };

  // ── Tab content ─────────────────────────────────────────────────────────────

  const renderSummaryTab = () => (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiChip label="Kaufpreis" value={formatEUR(pd.purchasePrice, true)} color="#1c1c1e" />
        <KpiChip label="NIY" value={kpis ? formatPct(kpis.niyAtAcquisition) : formatPct(legacyKpis.netInitialYield)} color={kpis ? (kpis.niyAtAcquisition > 4.5 ? '#34c759' : '#fbbf24') : '#fbbf24'} />
        <KpiChip label="Multiple" value={kpis ? `${kpis.multiple.toFixed(1)}x` : formatX(legacyKpis.kaufpreisfaktor)} />
        <KpiChip label="DSCR" value={kpis ? (kpis.dscr > 900 ? '∞' : `${kpis.dscr.toFixed(2)}x`) : formatX(legacyKpis.dscr)} color={kpis && kpis.dscr > 1.25 ? '#34c759' : '#fbbf24'} />
        <KpiChip label="NOI (Ist)" value={noiIst ? formatEUR(noiIst.noi, true) : '—'} color="#007aff" />
        <KpiChip label="LTV" value={kpis ? formatPct(kpis.ltv, 1) : formatPct(legacyKpis.ltv, 1)} color={kpis && kpis.ltv < 65 ? '#34c759' : '#fbbf24'} />
        <KpiChip label="Eigenkapital" value={formatEUR(equity, true)} />
        <KpiChip label="IRR (10J)" value={kpis ? formatPct(kpis.irr10Year) : '—'} color={kpis && kpis.irr10Year > 12 ? '#34c759' : '#fbbf24'} />
      </div>

      {isDev && kpis && (
        <div className="grid grid-cols-3 gap-4">
          <KpiChip label="Development IRR" value={kpis.irrDevelopment !== null ? formatPct(kpis.irrDevelopment) : '—'} color="#a78bfa" />
          <KpiChip label="Dev. Gewinn" value={formatEUR(kpis.developmentProfit, true)} color="#34c759" />
          <KpiChip label="Profit on Cost" value={formatPct(kpis.profitOnCost)} />
        </div>
      )}

      {/* Activity Log */}
      <GlassPanel style={{ padding: 18 }}>
        <SectionHeader title="Aktivitäten" />
        <div className="flex gap-2 mb-4">
          <input className="input-glass flex-1" style={inputS} placeholder="Notiz hinzufügen…" value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} />
          <button className="btn-primary px-4 py-2 rounded-xl text-sm" onClick={addNote}>Speichern</button>
        </div>
        <div className="space-y-3" style={{ maxHeight: 300, overflowY: 'auto' }}>
          {deal.activityLog.map(a => (
            <div key={a.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-1">
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>{new Date((a as any).date || a.timestamp).toLocaleDateString(dateLocale)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.65)', whiteSpace: 'pre-wrap' }}>{a.description}</div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );

  const renderStammdatenTab = () => (
    <div className="space-y-4">
      <GlassPanel style={{ padding: 20 }}>
        <SectionHeader title="Stammdaten" />
        <div className="grid grid-cols-2 gap-4">
          <div><label style={labelS}>Objektname</label><input className="input-glass" style={inputS} value={pd.name} onChange={e => setPd({ name: e.target.value })} /></div>
          <div><label style={labelS}>Nutzungsart</label><select className="input-glass" style={inputS} value={pd.usageType} onChange={e => setPd({ usageType: e.target.value as any })}>{['Wohnen', 'Büro', 'Einzelhandel', 'Logistik', 'Mixed Use'].map(u => <option key={u}>{u}</option>)}</select></div>
          <div><label style={labelS}>Straße</label><input className="input-glass" style={inputS} value={pd.address} onChange={e => setPd({ address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label style={labelS}>PLZ</label><input className="input-glass" style={inputS} value={pd.zip} onChange={e => setPd({ zip: e.target.value })} /></div>
            <div><label style={labelS}>Stadt</label><input className="input-glass" style={inputS} value={pd.city} onChange={e => setPd({ city: e.target.value })} /></div>
          </div>
          <div><label style={labelS}>Verkäufer</label><input className="input-glass" style={inputS} value={pd.vendor} onChange={e => setPd({ vendor: e.target.value })} /></div>
          <div><label style={labelS}>Makler / Quelle</label><input className="input-glass" style={inputS} value={pd.broker} onChange={e => setPd({ broker: e.target.value })} /></div>
          {isDev && <div><label style={labelS}>Entwicklungstyp</label><select className="input-glass" style={inputS} value={pd.developmentType || 'Modernisierung'} onChange={e => setPd({ developmentType: e.target.value })}>{DEV_TYPES.map(d => <option key={d}>{d}</option>)}</select></div>}
        </div>
      </GlassPanel>
    </div>
  );

  const renderAcquisitionTab = () => (
    <div className="space-y-4">
      <GlassPanel style={{ padding: 20 }}>
        <SectionHeader title="Ankauf" />
        <div className="grid grid-cols-2 gap-4">
          <div><label style={labelS}>Kaufpreis (€)</label><input type="number" className="input-glass" style={inputS} value={pd.purchasePrice || ''} onChange={e => setPd({ purchasePrice: parseFloat(e.target.value) || 0 })} /></div>
          <div><label style={labelS}>Ankaufsdatum</label><input type="date" className="input-glass" style={inputS} value={pd.acquisitionDate} onChange={e => setPd({ acquisitionDate: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 20 }}>
          <div className="flex items-center justify-between mb-3">
            <label style={labelS}>Erwerbsnebenkosten</label>
            {pd.purchasePrice > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#007aff' }}>Gesamt: {formatEUR(totalAcqCosts)} ({formatPct(totalAcqCosts / pd.purchasePrice * 100, 2)})</span>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {pd.acquisitionCosts.map((c, idx) => (
              <div key={c.id} onClick={() => {
                const arr = [...pd.acquisitionCosts]; arr[idx] = { ...c, active: !c.active }; setPd({ acquisitionCosts: arr });
              }} style={{ padding: '12px 14px', borderRadius: 12, border: `2px solid ${c.active ? '#007aff' : 'rgba(0,0,0,0.08)'}`, background: c.active ? 'rgba(0,122,255,0.04)' : 'transparent', cursor: 'pointer' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.active ? '#007aff' : '#94a3b8', marginBottom: 6 }}>{c.name}</div>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" style={{ ...inputS, width: 60, padding: '4px 8px', fontSize: 12 }} value={c.percent}
                    onClick={e => e.stopPropagation()}
                    onChange={e => { const arr = [...pd.acquisitionCosts]; arr[idx] = { ...c, percent: parseFloat(e.target.value) || 0, active: true }; setPd({ acquisitionCosts: arr }); }} />
                  <span style={{ fontSize: 11 }}>%</span>
                </div>
                {pd.purchasePrice > 0 && <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', marginTop: 4 }}>{formatEUR(pd.purchasePrice * c.percent / 100)}</div>}
              </div>
            ))}
          </div>
        </div>
      </GlassPanel>
    </div>
  );

  const renderRentRollTab = () => (
    <div className="space-y-4">
      <div className="flex gap-1 p-1" style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 10, width: 'fit-content' }}>
        {(['ist', 'ziel'] as const).map(tab => (
          <button key={tab} onClick={() => setRentRollTab(tab)} style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: rentRollTab === tab ? '#fff' : 'transparent', color: rentRollTab === tab ? '#007aff' : 'rgba(60,60,67,0.55)', boxShadow: rentRollTab === tab ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
            {tab === 'ist' ? 'Ist-Zustand' : 'Ziel-Zustand'}
          </button>
        ))}
      </div>
      {(() => {
        const list = rentRollTab === 'ist' ? 'unitsAsIs' : 'unitsTarget';
        const units = pd[list];
        return (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>{units.length} Einheiten · {computeTotalArea(units).toLocaleString('de-DE')} m² · {formatEUR(computeAnnualRent(units), true)} p.a.</div>
              <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => setPd({ [list]: [...units, newUnit()] })}>+ Einheit</button>
            </div>
            {units.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10" style={{ color: 'rgba(60,60,67,0.35)' }}>
                <Building2 size={28} />
                <div style={{ fontSize: 13 }}>Keine Einheiten erfasst.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 780 }}>
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
      })()}
    </div>
  );

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
          <SectionHeader title="NOI-Übersicht" />
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Bruttomiete (Ist)', formatEUR(noiIst.grossRentalIncome), '#007aff'],
              ['Leerstand', `−${formatEUR(noiIst.vacancyLoss)}`, '#fbbf24'],
              ['Eff. Bruttomiete', formatEUR(noiIst.effectiveGrossIncome), '#1c1c1e'],
              ['Verwaltung', `−${formatEUR(noiIst.managementCost)}`, '#f87171'],
              ['Instandhaltung', `−${formatEUR(noiIst.maintenanceReserve)}`, '#f87171'],
              ['Versicherung', `−${formatEUR(noiIst.insurance)}`, '#f87171'],
              ['Grundsteuer', `−${formatEUR(noiIst.propertyTax)}`, '#f87171'],
              ['Sonstige Opex', `−${formatEUR(noiIst.otherOpex)}`, '#f87171'],
              ['Sonstige Einnahmen', `+${formatEUR(noiIst.otherIncome)}`, '#34c759'],
              ['NOI (Ist)', formatEUR(noiIst.noi), noiIst.noi > 0 ? '#34c759' : '#f87171'],
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

  const renderMarketTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.55)' }}>Marktannahmen für DCF-Bewertung</div>
        <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => {
          const allUnits = pd.unitsAsIs.length > 0 ? pd.unitsAsIs : pd.unitsTarget;
          if (allUnits.length === 0) return;
          const updated = buildMarketAssumptionsFromRentRoll(allUnits, pd.marketAssumptions, getDefaultErvGrowth, getDefaultExitCapRate);
          setPd({ marketAssumptions: updated });
        }}>Aus Rent Roll befüllen</button>
      </div>
      {pd.marketAssumptions.perUsageType.map((m, idx) => (
        <GlassPanel key={m.usageType} style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#007aff', marginBottom: 12 }}>{m.usageType}</div>
          <div className="grid grid-cols-3 gap-3">
            <div><label style={labelS}>ERV aus Rent Roll (€/m²/Mon)</label><div style={{ fontSize: 14, fontWeight: 700, padding: '9px 0' }}>{m.ervFromRentRoll.toFixed(2)} €</div></div>
            <div>
              <label style={labelS}>ERV-Wachstum p.a. (%)</label>
              <input type="number" step="0.1" className="input-glass" style={inputS} value={m.ervGrowthRatePercent}
                onChange={e => { const arr = [...pd.marketAssumptions.perUsageType]; arr[idx] = { ...m, ervGrowthRatePercent: parseFloat(e.target.value) || 0 }; setPd({ marketAssumptions: { ...pd.marketAssumptions, perUsageType: arr } }); }} />
            </div>
            <div>
              <label style={labelS}>Exit-Cap-Rate (%)</label>
              <input type="number" step="0.1" className="input-glass" style={inputS} value={m.exitCapRatePercent}
                onChange={e => { const cap = parseFloat(e.target.value) || 0; const arr = [...pd.marketAssumptions.perUsageType]; arr[idx] = { ...m, exitCapRatePercent: cap, exitMultiplier: cap > 0 ? 100 / cap : 0 }; setPd({ marketAssumptions: { ...pd.marketAssumptions, perUsageType: arr } }); }} />
              {m.exitCapRatePercent > 0 && <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', marginTop: 3 }}>= {(100 / m.exitCapRatePercent).toFixed(1)}x Multiple</div>}
            </div>
          </div>
        </GlassPanel>
      ))}
      <GlassPanel style={{ padding: 16 }}>
        <SectionHeader title="Globale Annahmen" />
        <div className="grid grid-cols-3 gap-4">
          {[
            ['Opex-Inflation (%)', 'opexInflationPercent'],
            ['Capex-Inflation (%)', 'capexInflationPercent'],
            ['Verkaufskosten (%)', 'salesCostPercent'],
          ].map(([l, k]) => (
            <div key={k}>
              <label style={labelS}>{l}</label>
              <input type="number" step="0.1" className="input-glass" style={inputS}
                value={(pd.marketAssumptions as any)[k] || ''}
                onChange={e => setPd({ marketAssumptions: { ...pd.marketAssumptions, [k]: parseFloat(e.target.value) || 0 } })} />
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

  const renderDevelopmentTab = () => (
    <div className="space-y-4">
      <GlassPanel style={{ padding: 20 }}>
        <SectionHeader title="Projektdetails" />
        <div className="grid grid-cols-2 gap-4">
          <div><label style={labelS}>Baustart</label><input type="date" className="input-glass" style={inputS} value={pd.projectStart} onChange={e => setPd({ projectStart: e.target.value })} /></div>
          <div><label style={labelS}>Contingency (%)</label><input type="number" step="1" className="input-glass" style={inputS} value={pd.contingencyPercent} onChange={e => setPd({ contingencyPercent: parseFloat(e.target.value) || 0 })} /></div>
        </div>
      </GlassPanel>
      <GlassPanel style={{ padding: 20 }}>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader title="Gewerke" />
          <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => setPd({ gewerke: [...pd.gewerke, newGewerk()] })}>+ Gewerk</button>
        </div>
        {pd.gewerke.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8" style={{ color: 'rgba(60,60,67,0.35)' }}>
            <HardHat size={28} /><div style={{ fontSize: 13 }}>Keine Gewerke erfasst.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 680 }}>
              <thead><tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                {['Gewerk', 'Budget (€)', 'Start Woche', 'Dauer Wo.', 'Status', ''].map(h => <th key={h} style={{ ...thS, textAlign: 'left' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {pd.gewerke.map((g, idx) => (
                  <tr key={g.id} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={tdS}><select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={g.category} onChange={e => { const gs = [...pd.gewerke]; gs[idx] = { ...g, category: e.target.value }; setPd({ gewerke: gs }); }}>{DEFAULT_GEWERKE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></td>
                    <td style={tdS}><input type="number" style={{ ...inputS, width: 100, padding: '4px 6px', fontSize: 11 }} value={g.budgetTotal || ''} onChange={e => { const b = parseFloat(e.target.value) || 0; const gs = [...pd.gewerke]; gs[idx] = { ...g, budgetTotal: b, budgetAmount: b }; setPd({ gewerke: gs }); }} /></td>
                    <td style={tdS}><input type="number" style={{ ...inputS, width: 60, padding: '4px 6px', fontSize: 11 }} value={g.startWeek} onChange={e => { const gs = [...pd.gewerke]; gs[idx] = { ...g, startWeek: parseInt(e.target.value) || 1 }; setPd({ gewerke: gs }); }} /></td>
                    <td style={tdS}><input type="number" style={{ ...inputS, width: 60, padding: '4px 6px', fontSize: 11 }} value={g.durationWeeks} onChange={e => { const gs = [...pd.gewerke]; gs[idx] = { ...g, durationWeeks: parseInt(e.target.value) || 1 }; setPd({ gewerke: gs }); }} /></td>
                    <td style={tdS}><select style={{ ...inputS, padding: '4px 6px', fontSize: 11 }} value={g.status} onChange={e => { const gs = [...pd.gewerke]; gs[idx] = { ...g, status: e.target.value as any }; setPd({ gewerke: gs }); }}>{['Geplant', 'Beauftragt', 'Laufend', 'Abgeschlossen'].map(s => <option key={s}>{s}</option>)}</select></td>
                    <td style={tdS}><button onClick={() => setPd({ gewerke: pd.gewerke.filter(x => x.id !== g.id) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 11 }}>Gesamt (inkl. {pd.contingencyPercent}% Puffer)</td>
                  <td style={{ ...tdS, fontWeight: 700, color: '#007aff' }}>{formatEUR(totalDevBudget)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </GlassPanel>
    </div>
  );

  const renderFinanzierungTab = () => (
    <div className="space-y-4">
      <GlassPanel style={{ padding: 18 }}>
        <SectionHeader title="Kapitalbedarfsübersicht" />
        <div className="grid grid-cols-4 gap-3">
          {[
            ['Kaufpreis', formatEUR(pd.purchasePrice, true), '#1c1c1e'],
            ['Nebenkosten', formatEUR(totalAcqCosts, true), '#fbbf24'],
            isDev ? ['Baukosten', formatEUR(totalDevBudget, true), '#a78bfa'] : null,
            ['Gesamtinvestition', formatEUR(totalCapReq, true), '#007aff'],
            ['Fremdkapital', formatEUR(totalLoan, true), '#34c759'],
            ['Eigenkapital', formatEUR(equity, true), equity > 0 ? '#f97316' : '#f87171'],
          ].filter(Boolean).map(([l, v, c]) => (
            <KpiChip key={l as string} label={l as string} value={v as string} color={c as string} />
          ))}
        </div>
      </GlassPanel>
      <GlassPanel style={{ padding: 18 }}>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader title="Finanzierungstranchen" />
          <button className="btn-glass text-xs px-3 py-1.5 rounded-lg" onClick={() => setPd({ financingTranches: [...pd.financingTranches, newTranche()] })}>+ Tranche</button>
        </div>
        {pd.financingTranches.map((t, idx) => (
          <div key={t.id} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', marginBottom: 10, position: 'relative' }}>
            <button onClick={() => setPd({ financingTranches: pd.financingTranches.filter(x => x.id !== t.id) })} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><X size={14} /></button>
            <div className="grid grid-cols-3 gap-3">
              {[['Name', 'name', 'text'], ['Betrag (€)', 'loanAmount', 'number'], ['Zinssatz (%)', 'interestRate', 'number'], ['Laufzeit (J)', 'loanTerm', 'number'], ['Tilgung (%)', 'amortizationRate', 'number']].map(([l, k, tp]) => (
                <div key={k as string}>
                  <label style={labelS}>{l as string}</label>
                  <input type={tp as string} step="0.1" className="input-glass" style={inputS}
                    value={(t as any)[k as string] || ''}
                    onChange={e => { const ts = [...pd.financingTranches]; ts[idx] = { ...t, [k as string]: tp === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value }; setPd({ financingTranches: ts }); }} />
                </div>
              ))}
            </div>
            {t.loanAmount > 0 && <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>LTV: {formatPct(t.loanAmount / (totalCapReq || 1) * 100, 1)} · Jahreszins: {formatEUR(t.loanAmount * t.interestRate / 100)}</div>}
          </div>
        ))}
      </GlassPanel>
    </div>
  );

  const renderCashflowTab = () => {
    if (!cfRows || cfRows.length === 0) return (
      <div className="flex flex-col items-center gap-4 py-20" style={{ color: 'rgba(60,60,67,0.35)' }}>
        <BarChart3 size={36} /><div style={{ fontSize: 13 }}>Kaufpreis und mindestens eine Einheit im Rent Roll erforderlich.</div>
      </div>
    );
    const chartData = cfRows.slice(0, 11).map(r => ({ year: `J${r.yearIndex}`, NOI: Math.round(r.noi / 1000), CF: Math.round(r.freeCashflow / 1000) }));
    return (
      <div className="space-y-5">
        {kpis && (
          <div className="grid grid-cols-4 gap-3">
            {[
              ['IRR (10J)', `${kpis.irr10Year.toFixed(1)}%`, kpis.irr10Year > 12 ? '#34c759' : '#fbbf24'],
              ['Equity Multiple', `${kpis.equityMultiple10Year.toFixed(2)}x`, '#007aff'],
              ['Cash-on-Cash (Ø)', formatPct(kpis.cashOnCash10YearAvg), '#1c1c1e'],
              ['Payback', `J. ${kpis.paybackPeriodYears}`, '#fbbf24'],
            ].map(([l, v, c]) => <KpiChip key={l as string} label={l as string} value={v as string} color={c as string} />)}
          </div>
        )}
        <GlassPanel style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.5)', marginBottom: 8, textTransform: 'uppercase' }}>NOI & Free CF (€k)</div>
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
              {['Jahr', 'Bruttomiete', 'Opex', 'NOI', 'Transaktion', 'Finanzierung', 'Free CF', 'Kumulativ'].map(h => <th key={h} style={thS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {cfRows.map(r => (
                <tr key={r.yearIndex} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  <td style={{ ...tdS, fontWeight: 700 }}>{r.calendarYear}</td>
                  <td style={{ ...tdS, color: '#007aff' }}>{formatEUR(r.grossRentalIncome, true)}</td>
                  <td style={{ ...tdS, color: '#f87171' }}>−{formatEUR(r.operatingCosts, true)}</td>
                  <td style={{ ...tdS, fontWeight: 600 }}>{formatEUR(r.noi, true)}</td>
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

  const renderDokumenteTab = () => (
    <GlassPanel style={{ padding: 18 }}>
      <SectionHeader title="Dokumente" />
      {deal.documents.length === 0 ? <div style={{ color: 'rgba(60,60,67,0.35)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Keine Dokumente vorhanden.</div> : (
        <div className="space-y-2">
          {deal.documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.02)' }}>
              <FileText size={14} color="rgba(60,60,67,0.5)" />
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{doc.name}</div><div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>{doc.category} · {doc.fileSize}</div></div>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );

  const renderBilderTab = () => <ImageManager entityId={deal.id} entityType="deal" />;

  // ── Tab config ────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'stammdaten', label: 'Stammdaten' },
    { id: 'acquisition', label: 'Ankauf' },
    { id: 'rentroll', label: 'Rent Roll' },
    { id: 'opex', label: 'Opex' },
    { id: 'market', label: 'Markt' },
    ...(isDev ? [{ id: 'development', label: 'Development' }] : []),
    { id: 'finanzierung', label: 'Finanzierung' },
    { id: 'cashflow', label: 'Cashflow' },
    { id: 'dokumente', label: 'Dokumente' },
    { id: 'bilder', label: 'Bilder' },
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link to="/acquisition" style={{ color: 'rgba(60,60,67,0.45)', marginTop: 4 }}><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1c1c1e', margin: 0 }}>{deal.name}</h1>
            <CompletenessRing score={deal.completenessScore} size={40} />
          </div>
          <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.55)', marginTop: 4 }}>{deal.address}, {deal.city} · {deal.dealType} · {deal.usageType}</div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <select className="input-glass" style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, border: '1.5px solid rgba(0,0,0,0.12)', background: 'white' }}
              value={deal.stage}
              onChange={e => { updateDeal(deal.id, { stage: e.target.value as any }); addActivityToDeal(deal.id, { id: `act-${Date.now()}`, dealId: deal.id, date: new Date().toISOString(), type: 'Status', title: `Stage: ${e.target.value}`, description: `Stage von ${deal.stage} zu ${e.target.value} geändert.`, user: 'M. Wagner' } as any); }}>
              {STAGE_ORDER.map(s => <option key={s}>{s}</option>)}
            </select>
            {isDev && (
              <button className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2" onClick={() => setShowDevModal(true)}>
                <HardHat size={14} /> In Development
              </button>
            )}
            <button className="btn-glass px-3 py-2 rounded-xl text-sm flex items-center gap-2 text-red-400" onClick={() => setShowDeleteModal(true)}>
              <Trash2 size={14} /> Löschen
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <div className="flex gap-1" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: 0, minWidth: 'max-content' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#007aff' : 'rgba(60,60,67,0.55)', background: 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #007aff' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'summary' && renderSummaryTab()}
        {activeTab === 'stammdaten' && renderStammdatenTab()}
        {activeTab === 'acquisition' && renderAcquisitionTab()}
        {activeTab === 'rentroll' && renderRentRollTab()}
        {activeTab === 'opex' && renderOpexTab()}
        {activeTab === 'market' && renderMarketTab()}
        {activeTab === 'development' && isDev && renderDevelopmentTab()}
        {activeTab === 'finanzierung' && renderFinanzierungTab()}
        {activeTab === 'cashflow' && renderCashflowTab()}
        {activeTab === 'dokumente' && renderDokumenteTab()}
        {activeTab === 'bilder' && renderBilderTab()}
      </div>

      {/* Modals */}
      {showDevModal && (
        <Modal onClose={() => setShowDevModal(false)} title="In Development überführen">
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.65)', marginBottom: 20 }}>
              Der Deal <strong>{deal.name}</strong> wird als Development-Projekt angelegt. Ein Snapshot der aktuellen PropertyData wird als Underwriting-Referenz gespeichert.
            </div>
            <div className="flex gap-3">
              <button className="btn-glass flex-1 py-2 rounded-xl" onClick={() => setShowDevModal(false)}>Abbrechen</button>
              <button className="btn-primary flex-1 py-2 rounded-xl" onClick={handleTransferDev}>Überführen</button>
            </div>
          </div>
        </Modal>
      )}
      {showDeleteModal && (
        <Modal onClose={() => setShowDeleteModal(false)} title="Deal löschen">
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.65)', marginBottom: 20 }}>
              Deal <strong>{deal.name}</strong> unwiderruflich löschen?
            </div>
            <div className="flex gap-3">
              <button className="btn-glass flex-1 py-2 rounded-xl" onClick={() => setShowDeleteModal(false)}>Abbrechen</button>
              <button style={{ flex: 1, background: '#f87171', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 0', cursor: 'pointer', fontWeight: 700 }} onClick={() => { deleteDeal(deal.id); navigate('/acquisition'); }}>Löschen</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

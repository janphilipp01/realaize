import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Plus, Edit3, Save, X, AlertTriangle,
  CheckCircle, Bot, Download, Upload, Trash2, Building2, Calendar,
  TrendingUp, BarChart3, FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useStore } from '../store/useStore';
import {
  GlassPanel, PageHeader, KPICard, SectionHeader, StatusBadge,
  CompletenessRing, Modal, Tabs
} from '../components/shared';
import ImageManager, { TitleImageDisplay } from '../components/ImageManager';
import { formatEUR, formatPct } from '../utils/kpiEngine';
import { analyzeHoldSell } from '../utils/irrCalculator';
import { useLanguage } from '../i18n/LanguageContext';
import type { GeverkPosition, GeverkCategory, ActivityEntry } from '../models/types';

const GEWERK_CATEGORIES: GeverkCategory[] = [
  'Abbruch & Entsorgung', 'Rohbau', 'Dach & Abdichtung', 'Fassade & Außenanlagen',
  'Fenster & Türen', 'Innenausbau', 'TGA – Heizung', 'TGA – Sanitär',
  'TGA – Elektro', 'TGA – Lüftung', 'Aufzug', 'Außenanlagen & Tiefbau',
  'Planung & Architektur', 'Genehmigungen & Gebühren', 'Reserve / Unvorhergesehenes', 'Sonstiges',
];

const STATUS_COLORS: Record<string, string> = {
  'Offen': 'badge-neutral', 'Ausgeschrieben': 'badge-info',
  'Angebot': 'badge-warning', 'Vergeben': 'badge-accent', 'Abgeschlossen': 'badge-success',
};

const DEV_STATUS_COLOR: Record<string, string> = {
  'Planung': '#007aff', 'Genehmigung': '#af52de', 'Ausschreibung': '#ff9500',
  'Bau': '#34c759', 'Abnahme': '#5ac8fa', 'Fertiggestellt': '#1a7f37',
};

// ─── Developments List ──────────────────────────────────────────────────────
export function DevelopmentsPage() {
  const { developments } = useStore();
  const { t, lang } = useLanguage();
  const dateLocale = lang === 'de' ? 'de-DE' : 'en-GB';

  const totalBudget = developments.reduce((s, d) => s + d.totalBudget, 0);
  const totalSpent = developments.reduce((s, d) =>
    s + d.gewerke.reduce((gs, g) => gs + (g.actualCost || 0), 0), 0);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title={t('dev.title')}
        subtitle={`${developments.length} ${lang === 'de' ? 'Projekte' : 'Projects'} · ${formatEUR(totalBudget, true)} ${lang === 'de' ? 'Gesamtbudget' : 'Total Budget'}`}
        badge="Development"
        actions={
          <button className="btn-glass px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <Plus size={14} /> {t('dev.newProject')}
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Projects" value={`${developments.length}`} status="neutral" />
        <KPICard label="Total Budget" value={formatEUR(totalBudget, true)} status="neutral" />
        <KPICard label="Spent to Date" value={formatEUR(totalSpent, true)} status="neutral" sub={formatPct((totalSpent / totalBudget) * 100, 1) + (lang === 'de' ? ' des Budgets' : ' of Budget')} />
        <KPICard label="Active Projects" value={`${developments.filter(d => d.status === 'Bau').length}`} status="good" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        {developments.map(dev => {
          const totalActual = dev.gewerke.reduce((s, g) => s + (g.actualCost || 0), 0);
          const totalContract = dev.gewerke.reduce((s, g) => s + (g.contractAmount || 0), 0);
          const budgetUsage = dev.totalBudget > 0 ? (totalContract / dev.totalBudget) * 100 : 0;
          return (
            <Link key={dev.id} to={`/developments/${dev.id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <TitleImageDisplay entityId={dev.id} height={150} />
                <div style={{ padding: 20 }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{dev.name}</h3>
                      <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.50)', marginTop: 2 }}>{dev.city} · {dev.developmentType}</div>
                    </div>
                    <CompletenessRing score={dev.completenessScore} size={38} />
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span style={{ background: `rgba(${DEV_STATUS_COLOR[dev.status] === '#34c759' ? '52,199,89' : '0,122,255'},0.10)`, color: DEV_STATUS_COLOR[dev.status], border: `1px solid ${DEV_STATUS_COLOR[dev.status]}30`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      {dev.status}
                    </span>
                    <span className="badge-neutral">{dev.usageType}</span>
                    {dev.holdSellDecision !== 'Offen' && (
                      <span className={dev.holdSellDecision === 'Hold' ? 'badge-success' : 'badge-info'}>{dev.holdSellDecision}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Budget</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e' }}>{formatEUR(dev.totalBudget, true)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Vergaben</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: budgetUsage > 90 ? '#cc1a14' : budgetUsage > 70 ? '#b25000' : '#1a7f37' }}>{formatEUR(totalContract, true)}</div>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(budgetUsage, 100)}%`, background: budgetUsage > 90 ? '#ff3b30' : budgetUsage > 70 ? '#ff9500' : '#007aff' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)', marginTop: 6 }}>
                    {budgetUsage.toFixed(1)}% vergeben · Ende: {new Date(dev.plannedEndDate).toLocaleDateString(dateLocale)}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Development Detail ─────────────────────────────────────────────────────
export function DevelopmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { developments, updateDevelopment, updateGewerk, addGewerk, deleteGewerk, addActivityToDevelopment, transferDevToBestand, transferDevToSale, contacts, settings } = useStore();
  const { t, lang } = useLanguage();
  const dateLocale = lang === 'de' ? 'de-DE' : 'en-GB';
  const dev = developments.find(d => d.id === id);
  const [activeTab, setActiveTab] = useState('overview');
  const [showHoldSellModal, setShowHoldSellModal] = useState<'Hold' | 'Sell' | null>(null);
  const [advisorInput, setAdvisorInput] = useState('');
  const [advisorMessages, setAdvisorMessages] = useState(dev?.advisorMessages || []);
  const [editingGw, setEditingGw] = useState<string | null>(null);
  const [gwEdits, setGwEdits] = useState<Partial<GeverkPosition>>({});

  if (!dev) return <div className="p-8"><Link to="/developments" style={{ color: '#007aff' }}>{t('common.back')}</Link></div>;

  const totalBudget = dev.gewerke.reduce((s, g) => s + g.underwritingBudget, 0);
  const totalOffer = dev.gewerke.reduce((s, g) => s + (g.offerAmount || 0), 0);
  const totalContract = dev.gewerke.reduce((s, g) => s + (g.contractAmount || 0), 0);
  const totalActual = dev.gewerke.reduce((s, g) => s + (g.actualCost || 0), 0);
  const totalCost = dev.purchasePrice + totalBudget;

  const analysis = dev.underwritingCashFlows && dev.projectedSalePrice
    ? analyzeHoldSell({
        purchasePrice: dev.purchasePrice,
        totalDevelopmentCost: totalBudget,
        annualCashFlows: dev.underwritingCashFlows,
        projectedSalePrice: dev.projectedSalePrice,
        hurrleRate: settings.hurrleRate,
        taxRate: settings.taxRate,
        exitMultiplier: settings.defaultExitMultiplier,
        developmentStartDate: dev.startDate,
        developmentEndDate: dev.actualEndDate || dev.plannedEndDate,
      })
    : null;

  // Gantt data
  const now = new Date();
  const ganttMonths = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(2024, 5 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Construction Advisor response
  const ADVISOR_RESPONSES: Record<string, string> = {
    default: 'Für dieses Development empfehle ich folgende Budgetpositionen basierend auf aktuellen Marktbenchmarks (DACH, Q1/2025): Rohbau 140–165 €/m², TGA komplett 180–220 €/m², Innenausbau 110–140 €/m². Soll ich konkrete Positionen für Ihr Projekt vorschlagen?',
    neubau: 'Bei einem Neubau kalkulieren Sie bitte: GU-Pauschalangebot 1.600–2.200 €/m² BGF (einfacher Standard) bis 2.800–3.500 €/m² (gehoben). Wichtig: Erschließungskosten, Anschlussgebühren und Außenanlagen separat budgetieren (ca. 80–150 €/m² GF).',
    sanierung: 'Kernsanierung Richtwerte: Entkernung 30–60 €/m², TGA-Erneuerung 200–280 €/m², Fassade 180–320 €/m² (je nach Denkmalschutz), Fenster 350–600 €/Stk. Empfehle Reserve von 15–20% bei Bestandsgebäuden.',
    tga: 'TGA-Benchmarks: Heizung (Wärmepumpe inkl. FBH) 85–120 €/m², Sanitär 65–90 €/m², Elektro 55–80 €/m², Lüftung 45–70 €/m². Gesamte TGA bei Sanierung: 250–360 €/m².',
  };

  const getAdvisorResponse = (input: string) => {
    const l = input.toLowerCase();
    if (l.includes('neubau') || l.includes('neu bauen')) return ADVISOR_RESPONSES.neubau;
    if (l.includes('sanierung') || l.includes('kernsanierung') || l.includes('sanieren')) return ADVISOR_RESPONSES.sanierung;
    if (l.includes('tga') || l.includes('heizung') || l.includes('elektro') || l.includes('sanitär')) return ADVISOR_RESPONSES.tga;
    return ADVISOR_RESPONSES.default;
  };

  const handleAdvisorSend = () => {
    if (!advisorInput.trim()) return;
    const userMsg = { id: `adv-${Date.now()}-u`, role: 'user' as const, content: advisorInput, timestamp: new Date().toISOString() };
    const advMsg = { id: `adv-${Date.now()}-a`, role: 'advisor' as const, content: getAdvisorResponse(advisorInput), timestamp: new Date().toISOString() };
    const updated = [...advisorMessages, userMsg, advMsg];
    setAdvisorMessages(updated);
    updateDevelopment(dev.id, { advisorMessages: updated });
    setAdvisorInput('');
  };

  const handleHoldSellConfirm = (decision: 'Hold' | 'Sell') => {
    if (decision === 'Hold') transferDevToBestand(dev.id);
    else transferDevToSale(dev.id);
    setShowHoldSellModal(null);
    navigate('/developments');
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <Link to="/developments" style={{ color: 'rgba(60,60,67,0.55)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={13} /> Developments
        </Link>
        <ChevronRight size={13} color="rgba(60,60,67,0.35)" />
        <span style={{ fontSize: 13, color: 'rgba(60,60,67,0.70)' }}>{dev.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <CompletenessRing score={dev.completenessScore} size={52} />
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', color: '#1c1c1e', margin: 0 }}>{dev.name}</h1>
            <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.55)', marginTop: 4 }}>{dev.address}, {dev.city} · {dev.developmentType}</div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span style={{ background: 'rgba(52,199,89,0.10)', color: DEV_STATUS_COLOR[dev.status], border: `1px solid ${DEV_STATUS_COLOR[dev.status]}30`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{dev.status}</span>
              <span className="badge-neutral">{dev.usageType}</span>
              <span style={{ fontSize: 12, color: 'rgba(60,60,67,0.45)' }}>Fertig: {new Date(dev.plannedEndDate).toLocaleDateString(dateLocale)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-glass px-4 py-2 rounded-xl text-sm flex items-center gap-2"><Download size={14} /> Export</button>
          <button onClick={() => setShowHoldSellModal('Hold')} className="btn-glass px-4 py-2 rounded-xl text-sm flex items-center gap-2" style={{ color: '#1a7f37', borderColor: 'rgba(52,199,89,0.3)' }}>
            <CheckCircle size={14} /> Hold → Bestand
          </button>
          <button onClick={() => setShowHoldSellModal('Sell')} className="btn-accent px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <TrendingUp size={14} /> Sell → Sales
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard label="Kaufpreis" value={formatEUR(dev.purchasePrice, true)} status="neutral" />
        <KPICard label="Gesamtbudget Bau" value={formatEUR(totalBudget, true)} status="neutral" />
        <KPICard label="Vergaben" value={formatEUR(totalContract, true)} sub={formatPct((totalContract / totalBudget) * 100, 1) + ' des Budgets'} status={totalContract > totalBudget ? 'danger' : 'good'} />
        <KPICard label="Ist-Kosten" value={formatEUR(totalActual, true)} status="neutral" />
        <KPICard label="Proj. Verkaufspreis" value={formatEUR(dev.projectedSalePrice || 0, true)} status={analysis ? (analysis.recommendation === 'Sell' ? 'good' : 'neutral') : 'neutral'} />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs
          tabs={[
            { key: 'overview', label: 'Übersicht' },
            { key: 'budget', label: 'Kosten & Budget', count: dev.gewerke.length },
            { key: 'gantt', label: 'Gantt' },
            { key: 'advisor', label: 'Construction Advisor' },
            { key: 'holdsell', label: 'Hold / Sell' },
            { key: 'images', label: 'Bilder' },
            { key: 'documents', label: 'Dokumente', count: dev.documents.length },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6 animate-fade-in">
          <GlassPanel style={{ padding: 24 }}>
            <SectionHeader title="Budget-Übersicht" />
            <div className="space-y-3">
              {[
                { label: 'Underwriting-Budget', value: totalBudget, color: '#1c1c1e' },
                { label: 'Angebote gesamt', value: totalOffer, color: totalOffer > totalBudget ? '#cc1a14' : '#1c1c1e' },
                { label: 'Vergaben gesamt', value: totalContract, color: totalContract > totalBudget ? '#cc1a14' : '#1a7f37' },
                { label: 'Ist-Kosten', value: totalActual, color: '#1c1c1e' },
                { label: 'Gesamtinvestition (inkl. Kauf)', value: totalCost, color: '#007aff', bold: true },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2 px-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(60,60,67,0.65)' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: row.bold ? 700 : 600, color: row.color, fontFamily: 'ui-monospace, monospace' }}>{formatEUR(row.value)}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
          <GlassPanel style={{ padding: 24 }}>
            <SectionHeader title="Budget nach Gewerk" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dev.gewerke.map(g => ({ name: g.category.split(' ')[0], Budget: Math.round(g.underwritingBudget / 1000), Vergabe: Math.round((g.contractAmount || 0) / 1000) }))}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(60,60,67,0.45)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'rgba(60,60,67,0.45)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}k`} />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 10, fontSize: 11 }} />
                <Bar dataKey="Budget" fill="rgba(0,122,255,0.25)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Vergabe" fill="#007aff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassPanel>
        </div>
      )}

      {/* ── BUDGET ── */}
      {activeTab === 'budget' && (
        <div className="animate-fade-in">
          <div className="flex justify-between mb-4">
            <SectionHeader title="Kosten nach Gewerk" />
            <button
              onClick={() => {
                const newGw: GeverkPosition = {
                  id: `gw-${Date.now()}`, developmentId: dev.id, category: 'Sonstiges',
                  description: 'Neue Position', unit: 'Pauschal', quantity: 1,
                  underwritingBudget: 0, status: 'Offen',
                };
                addGewerk(dev.id, newGw);
              }}
              className="btn-glass px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"
            >
              <Plus size={12} /> Gewerk hinzufügen
            </button>
          </div>
          <GlassPanel style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  {['Gewerk', 'Beschreibung', 'Underwriting', 'Angebot', 'Vergabe', 'Ist', 'Δ Budget', 'Status', 'Auftragnehmer', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: 'rgba(60,60,67,0.45)', textAlign: 'left', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dev.gewerke.map(gw => {
                  const delta = (gw.contractAmount || gw.offerAmount || gw.underwritingBudget) - gw.underwritingBudget;
                  const contractor = contacts.find(c => c.id === gw.contractorId);
                  const isEditing = editingGw === gw.id;
                  return (
                    <tr key={gw.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding: '10px 12px', minWidth: 140 }}>
                        {isEditing ? (
                          <select className="input-glass" style={{ fontSize: 11, padding: '4px 6px' }} value={gwEdits.category || gw.category} onChange={e => setGwEdits(p => ({ ...p, category: e.target.value as GeverkCategory }))}>
                            {GEWERK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1c1e' }}>{gw.category}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', minWidth: 160 }}>
                        {isEditing ? (
                          <input className="input-glass" style={{ fontSize: 11, padding: '4px 6px' }} value={gwEdits.description ?? gw.description} onChange={e => setGwEdits(p => ({ ...p, description: e.target.value }))} />
                        ) : (
                          <span style={{ fontSize: 12, color: 'rgba(60,60,67,0.70)' }}>{gw.description}</span>
                        )}
                      </td>
                      {['underwritingBudget', 'offerAmount', 'contractAmount', 'actualCost'].map(key => (
                        <td key={key} style={{ padding: '10px 12px' }}>
                          {isEditing ? (
                            <input type="number" className="input-glass" style={{ fontSize: 11, padding: '4px 6px', width: 90 }}
                              value={(gwEdits as any)[key] ?? (gw as any)[key] ?? ''}
                              onChange={e => setGwEdits(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                            />
                          ) : (
                            <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: (gw as any)[key] ? '#1c1c1e' : 'rgba(60,60,67,0.30)' }}>
                              {(gw as any)[key] ? formatEUR((gw as any)[key], true) : '—'}
                            </span>
                          )}
                        </td>
                      ))}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'ui-monospace, monospace', color: delta > 0 ? '#cc1a14' : delta < 0 ? '#1a7f37' : 'rgba(60,60,67,0.45)' }}>
                          {delta !== 0 ? `${delta > 0 ? '+' : ''}${formatEUR(delta, true)}` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {isEditing ? (
                          <select className="input-glass" style={{ fontSize: 11, padding: '4px 6px' }} value={gwEdits.status || gw.status} onChange={e => setGwEdits(p => ({ ...p, status: e.target.value as any }))}>
                            {['Offen', 'Ausgeschrieben', 'Angebot', 'Vergeben', 'Abgeschlossen'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={STATUS_COLORS[gw.status]}>{gw.status}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: 'rgba(60,60,67,0.55)' }}>
                        {contractor ? `${contractor.firstName} ${contractor.lastName}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={() => { updateGewerk(dev.id, gw.id, gwEdits); setEditingGw(null); setGwEdits({}); }} style={{ background: '#007aff', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 8px', color: '#fff', fontSize: 11 }}>✓</button>
                              <button onClick={() => { setEditingGw(null); setGwEdits({}); }} style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 6px', fontSize: 11 }}>✕</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingGw(gw.id); setGwEdits({}); }} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 6px' }}><Edit3 size={11} color="rgba(60,60,67,0.55)" /></button>
                              <button onClick={() => deleteGewerk(dev.id, gw.id)} style={{ background: 'rgba(255,59,48,0.08)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 6px' }}><Trash2 size={11} color="#cc1a14" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)' }}>
                  <td colSpan={2} style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#1c1c1e' }}>GESAMT</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: '#1c1c1e' }}>{formatEUR(totalBudget, true)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: '#1c1c1e' }}>{totalOffer ? formatEUR(totalOffer, true) : '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: totalContract > totalBudget ? '#cc1a14' : '#1a7f37' }}>{formatEUR(totalContract, true)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{formatEUR(totalActual, true)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: (totalContract - totalBudget) > 0 ? '#cc1a14' : '#1a7f37' }}>
                    {totalContract - totalBudget !== 0 ? `${totalContract - totalBudget > 0 ? '+' : ''}${formatEUR(totalContract - totalBudget, true)}` : '—'}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </GlassPanel>
        </div>
      )}

      {/* ── GANTT ── */}
      {activeTab === 'gantt' && (
        <div className="animate-fade-in">
          <GlassPanel style={{ padding: 24, overflowX: 'auto' }}>
            <SectionHeader title="Bauzeitenplan nach Gewerk" />
            <div style={{ minWidth: 900 }}>
              {/* Header months */}
              <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(24, 1fr)', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: 4 }}>
                <div style={{ padding: '6px 8px', fontSize: 11, fontWeight: 700, color: 'rgba(60,60,67,0.45)' }}>GEWERK</div>
                {ganttMonths.map(m => {
                  const d = new Date(m);
                  return (
                    <div key={m} style={{ padding: '6px 2px', fontSize: 9, fontWeight: 600, color: 'rgba(60,60,67,0.40)', textAlign: 'center', letterSpacing: '0.02em' }}>
                      {d.toLocaleDateString(dateLocale, { month: 'short' })}
                      <div style={{ fontSize: 8, color: 'rgba(60,60,67,0.30)' }}>{d.getFullYear().toString().slice(2)}</div>
                    </div>
                  );
                })}
              </div>
              {/* Rows */}
              {dev.gewerke.filter(g => g.ganttStart || g.ganttDurationMonths).map((gw, idx) => {
                const startIdx = ganttMonths.indexOf(gw.ganttStart || '');
                const dur = gw.ganttDurationMonths || 1;
                return (
                  <div key={gw.id} style={{ display: 'grid', gridTemplateColumns: '200px repeat(24, 1fr)', marginBottom: 3, background: idx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent', borderRadius: 6 }}>
                    <div style={{ padding: '8px 8px', fontSize: 12, fontWeight: 500, color: '#1c1c1e', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={STATUS_COLORS[gw.status]} style={{ fontSize: 9, padding: '1px 4px' }}>●</span>
                      {gw.category.split(' – ').pop()?.split(' & ')[0]}
                    </div>
                    {ganttMonths.map((m, mi) => {
                      const inRange = startIdx >= 0 && mi >= startIdx && mi < startIdx + dur;
                      const isFirst = mi === startIdx;
                      const isLast = mi === startIdx + dur - 1;
                      return (
                        <div key={m} style={{ padding: '4px 1px', display: 'flex', alignItems: 'center' }}>
                          {inRange && (
                            <div style={{
                              height: 20, width: '100%',
                              background: gw.status === 'Abgeschlossen' ? '#34c759' : gw.status === 'Vergeben' ? '#007aff' : gw.status === 'Angebot' ? '#ff9500' : 'rgba(0,122,255,0.35)',
                              borderRadius: `${isFirst ? 6 : 0}px ${isLast ? 6 : 0}px ${isLast ? 6 : 0}px ${isFirst ? 6 : 0}px`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isFirst && dur > 2 && (
                                <span style={{ fontSize: 8, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', paddingLeft: 4 }}>
                                  {formatEUR(gw.contractAmount || gw.underwritingBudget, true)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[['Offen', 'rgba(0,122,255,0.35)'], ['Angebot', '#ff9500'], ['Vergeben', '#007aff'], ['Abgeschlossen', '#34c759']].map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2">
                    <div style={{ width: 14, height: 8, borderRadius: 2, background: color }} />
                    <span style={{ fontSize: 11, color: 'rgba(60,60,67,0.55)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── CONSTRUCTION ADVISOR ── */}
      {activeTab === 'advisor' && (
        <div className="animate-fade-in">
          <div className="p-3 rounded-xl mb-4 flex items-center gap-3" style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.12)' }}>
            <Bot size={16} color="#007aff" />
            <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.75)' }}>
              <strong style={{ color: '#007aff' }}>Construction Advisor</strong> — Simulierter Kostenberater. Benchmarks basieren auf DACH-Marktdaten Q1/2025. Manuell überschreibbar.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <GlassPanel style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 420, overflowY: 'auto', padding: 20 }}>
                <div className="space-y-3">
                  {advisorMessages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 32, color: 'rgba(60,60,67,0.40)', fontSize: 13 }}>
                      Beschreiben Sie Ihr Development — Art, Größe, Zustand.<br />Der Advisor liefert Kostenbenchmarks.
                    </div>
                  )}
                  {advisorMessages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: msg.role === 'advisor' ? 'rgba(0,122,255,0.10)' : 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: msg.role === 'advisor' ? '#007aff' : 'rgba(60,60,67,0.60)' }}>
                        {msg.role === 'advisor' ? '🤖' : 'MW'}
                      </div>
                      <div style={{ maxWidth: '78%', background: msg.role === 'advisor' ? 'rgba(0,0,0,0.04)' : 'rgba(0,122,255,0.10)', border: `1px solid ${msg.role === 'advisor' ? 'rgba(0,0,0,0.06)' : 'rgba(0,122,255,0.18)'}`, borderRadius: msg.role === 'advisor' ? '4px 14px 14px 14px' : '14px 4px 14px 14px', padding: '10px 14px', fontSize: 13, color: 'rgba(60,60,67,0.80)', lineHeight: 1.6 }}>
                        {msg.content}
                        <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.35)', marginTop: 4 }}>{new Date(msg.timestamp).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: 14 }}>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {['Neubau Kosten', 'Kernsanierung', 'TGA Benchmarks', 'Außenanlagen'].map(s => (
                    <button key={s} onClick={() => setAdvisorInput(s)} style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6, cursor: 'pointer', padding: '3px 8px', fontSize: 11, color: 'rgba(60,60,67,0.65)' }}>{s}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="input-glass flex-1" placeholder="Frage eingeben..." value={advisorInput} onChange={e => setAdvisorInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdvisorSend()} style={{ fontSize: 13 }} />
                  <button onClick={handleAdvisorSend} className="btn-accent px-4 py-2 rounded-xl text-sm">Senden</button>
                </div>
              </div>
            </GlassPanel>

            {/* Benchmark Reference */}
            <GlassPanel style={{ padding: 20 }}>
              <SectionHeader title="Kostenbenchmarks DACH" />
              <div className="space-y-2">
                {[
                  { label: 'Rohbau', range: '130–165 €/m²' },
                  { label: 'Dach komplett', range: '120–220 €/m²' },
                  { label: 'Fassade (WDVS)', range: '80–140 €/m²' },
                  { label: 'Fenster (3-fach Holz-Alu)', range: '400–700 €/Stk.' },
                  { label: 'TGA Heizung (WP + FBH)', range: '85–125 €/m²' },
                  { label: 'TGA Sanitär', range: '65–95 €/m²' },
                  { label: 'TGA Elektro', range: '55–85 €/m²' },
                  { label: 'Innenausbau', range: '110–160 €/m²' },
                  { label: 'Trockenbau', range: '40–65 €/m²' },
                  { label: 'Aufzug (4 Haltestellen)', range: '45.000–80.000 €' },
                  { label: 'Planung & Architektur', range: '8–12% der Baukosten' },
                  { label: 'Reserve', range: '10–20% Gesamt' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2 px-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.03)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(60,60,67,0.65)' }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#007aff', fontFamily: 'ui-monospace, monospace' }}>{row.range}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.35)', marginTop: 12, fontStyle: 'italic' }}>
                Quellen: BKI Baukosten 2024, SIRADOS, Marktbefragung · Stand Q1/2025
              </div>
            </GlassPanel>
          </div>
        </div>
      )}

      {/* ── HOLD / SELL ── */}
      {activeTab === 'holdsell' && (
        <div className="animate-fade-in">
          {analysis ? (
            <div className="space-y-5">
              {/* Recommendation banner */}
              <div className="p-5 rounded-2xl" style={{
                background: analysis.recommendation === 'Hold' ? 'rgba(52,199,89,0.08)' : analysis.recommendation === 'Sell' ? 'rgba(0,122,255,0.08)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${analysis.recommendation === 'Hold' ? 'rgba(52,199,89,0.20)' : analysis.recommendation === 'Sell' ? 'rgba(0,122,255,0.20)' : 'rgba(0,0,0,0.08)'}`,
              }}>
                <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.55)', marginBottom: 4 }}>EMPFEHLUNG</div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: analysis.recommendation === 'Hold' ? '#1a7f37' : analysis.recommendation === 'Sell' ? '#007aff' : '#1c1c1e', marginBottom: 8 }}>
                  {analysis.recommendation === 'Hold' ? '📈 HOLD — Im Portfolio halten' : analysis.recommendation === 'Sell' ? '💰 SELL — Verkauf empfohlen' : '⚖️ Neutral — Strategische Entscheidung'}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(60,60,67,0.70)', lineHeight: 1.6 }}>{analysis.reasoning}</div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Hold */}
                <GlassPanel style={{ padding: 22 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a7f37', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>📈 Hold-Szenario (10 Jahre)</div>
                  {[
                    { label: '10-Jahres IRR', value: `${analysis.holdIRR.toFixed(1)}%`, highlight: true },
                    { label: 'Hurdle Rate', value: `${settings.hurrleRate}%` },
                    { label: 'IRR über Hurdle', value: `${(analysis.holdIRR - settings.hurrleRate).toFixed(1)}%`, color: analysis.holdIRR >= settings.hurrleRate ? '#1a7f37' : '#cc1a14' },
                    { label: 'Gesamtinvestition', value: formatEUR(analysis.totalCost) },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-2 px-3 rounded-xl mb-1" style={{ background: 'rgba(0,0,0,0.03)' }}>
                      <span style={{ fontSize: 13, color: 'rgba(60,60,67,0.65)' }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: row.highlight ? 700 : 600, color: row.color || (row.highlight ? '#1a7f37' : '#1c1c1e'), fontFamily: 'ui-monospace, monospace' }}>{row.value}</span>
                    </div>
                  ))}
                  {/* CF chart */}
                  <div className="mt-4">
                    <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Netto-Cashflow Prognose</div>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={dev.underwritingCashFlows?.map(cf => ({ Jahr: `J${cf.year}`, NCF: Math.round(cf.netCashFlow / 1000) })) || []}>
                        <XAxis dataKey="Jahr" tick={{ fontSize: 10, fill: 'rgba(60,60,67,0.45)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(60,60,67,0.45)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}k`} />
                        <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, fontSize: 11 }} />
                        <Line type="monotone" dataKey="NCF" stroke="#34c759" strokeWidth={2} dot={{ r: 3, fill: '#34c759' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <button onClick={() => setShowHoldSellModal('Hold')} className="btn-glass w-full mt-4 py-2 rounded-xl text-sm font-semibold" style={{ color: '#1a7f37', borderColor: 'rgba(52,199,89,0.3)', display: 'block', textAlign: 'center' }}>
                    ✓ In Bestand überführen (Hold)
                  </button>
                </GlassPanel>

                {/* Sell */}
                <GlassPanel style={{ padding: 22 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#007aff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>💰 Sell-Szenario</div>
                  <div className="mb-3">
                    <label style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Proj. Verkaufspreis (editierbar)</label>
                    <input
                      type="number"
                      className="input-glass"
                      value={dev.projectedSalePrice || ''}
                      onChange={e => updateDevelopment(dev.id, { projectedSalePrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  {[
                    { label: 'Bruttogewinn', value: formatEUR((dev.projectedSalePrice || 0) - analysis.totalCost) },
                    { label: `Steuer (${settings.taxRate}%)`, value: `− ${formatEUR(Math.max(0, ((dev.projectedSalePrice || 0) - analysis.totalCost)) * settings.taxRate / 100)}` },
                    { label: 'Nettogewinn', value: formatEUR(analysis.sellNetProfit), highlight: true },
                    { label: 'ROI (nach Steuer)', value: `${analysis.sellROI.toFixed(1)}%`, color: analysis.sellROI > 15 ? '#1a7f37' : '#b25000' },
                    { label: 'Sell-IRR', value: `${analysis.sellIRR.toFixed(1)}%` },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-2 px-3 rounded-xl mb-1" style={{ background: 'rgba(0,0,0,0.03)' }}>
                      <span style={{ fontSize: 13, color: 'rgba(60,60,67,0.65)' }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: row.highlight ? 700 : 600, color: row.color || (row.highlight ? '#007aff' : '#1c1c1e'), fontFamily: 'ui-monospace, monospace' }}>{row.value}</span>
                    </div>
                  ))}
                  <button onClick={() => setShowHoldSellModal('Sell')} className="btn-accent w-full mt-4 py-2 rounded-xl text-sm font-semibold" style={{ display: 'block', textAlign: 'center' }}>
                    → In Sales überführen (Sell)
                  </button>
                </GlassPanel>
              </div>

              <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.35)', textAlign: 'center', fontStyle: 'italic' }}>
                * IRR-Berechnung deterministisch. Steuer: {settings.taxRate}% pauschal (in Einstellungen anpassbar). Cashflows manuell editierbar.
              </div>
            </div>
          ) : (
            <GlassPanel style={{ padding: 48, textAlign: 'center' }}>
              <BarChart3 size={32} color="rgba(60,60,67,0.30)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(60,60,67,0.50)' }}>Hold/Sell-Analyse nicht verfügbar</div>
              <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.35)', marginTop: 4 }}>Bitte Cashflow-Prognose und Verkaufspreis hinterlegen.</div>
            </GlassPanel>
          )}
        </div>
      )}

      {/* ── IMAGES ── */}
      {activeTab === 'images' && (
        <GlassPanel style={{ padding: 24 }} className="animate-fade-in">
          <SectionHeader title="Bilder" />
          <ImageManager entityId={dev.id} entityType="Development" />
        </GlassPanel>
      )}

      {/* ── DOCUMENTS ── */}
      {activeTab === 'documents' && (
        <GlassPanel style={{ padding: 24 }} className="animate-fade-in">
          <div className="flex justify-between mb-4">
            <SectionHeader title="Dokumente" />
            <button className="btn-glass px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"><Upload size={12} /> Hochladen</button>
          </div>
          <div className="space-y-2">
            {dev.documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
                <FileText size={15} color="#007aff" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{doc.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>{doc.fileSize} · {doc.uploadedBy}</div>
                </div>
                <div className="flex gap-1">{doc.tags.map(t => <span key={t} className="badge-neutral" style={{ fontSize: 10 }}>{t}</span>)}</div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Hold/Sell Confirmation Modal */}
      {showHoldSellModal && (
        <Modal
          title={showHoldSellModal === 'Hold' ? 'In Bestand überführen' : 'In Sales überführen'}
          onClose={() => setShowHoldSellModal(null)}
          actions={
            <>
              <button onClick={() => setShowHoldSellModal(null)} className="btn-glass px-4 py-2 rounded-xl text-sm">Abbrechen</button>
              <button onClick={() => handleHoldSellConfirm(showHoldSellModal)} className={`${showHoldSellModal === 'Hold' ? 'btn-glass' : 'btn-accent'} px-5 py-2 rounded-xl text-sm`} style={showHoldSellModal === 'Hold' ? { color: '#1a7f37', borderColor: 'rgba(52,199,89,0.3)' } : {}}>
                Bestätigen & {showHoldSellModal === 'Hold' ? 'in Bestand' : 'in Sales'} überführen
              </button>
            </>
          }
        >
          <div style={{ fontSize: 14, color: 'rgba(60,60,67,0.70)', lineHeight: 1.7 }}>
            <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.12)' }}>
              <strong style={{ color: '#007aff' }}>{dev.name}</strong> wird {showHoldSellModal === 'Hold' ? 'als neues Asset in den Bestand' : 'in die Sales-Pipeline'} überführt.
            </div>
            {analysis && (
              <div>IRR (Hold): <strong>{analysis.holdIRR.toFixed(1)}%</strong> · Nettogewinn (Sell): <strong>{formatEUR(analysis.sellNetProfit)}</strong></div>
            )}
            <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.40)', marginTop: 12 }}>Diese Aktion erstellt einen Audit-Log-Eintrag und kann nicht rückgängig gemacht werden.</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

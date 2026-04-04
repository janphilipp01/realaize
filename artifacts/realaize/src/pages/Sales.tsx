import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Plus, Download, Upload, FileText,
  User, Mail, Phone, Building2, Edit3, Save, X, TrendingUp
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  GlassPanel, PageHeader, KPICard, SectionHeader, StatusBadge, Tabs, Modal, CompletenessRing
} from '../components/shared';
import ImageManager, { TitleImageDisplay } from '../components/ImageManager';
import { formatEUR, formatPct } from '../utils/kpiEngine';
import { useLanguage } from '../i18n/LanguageContext';
import type { BuyerLead, BuyerStage } from '../models/types';

const BUYER_STAGES: BuyerStage[] = [
  'Kontaktiert', 'Besichtigung', 'NDA', 'Angebot', 'LOI', 'Due Diligence', 'Signing', 'Closing', 'Abgesagt'
];

const STAGE_COLOR: Record<string, string> = {
  'Kontaktiert': 'badge-neutral', 'Besichtigung': 'badge-info', 'NDA': 'badge-info',
  'Angebot': 'badge-warning', 'LOI': 'badge-accent', 'Due Diligence': 'badge-accent',
  'Signing': 'badge-success', 'Closing': 'badge-success', 'Abgesagt': 'badge-danger',
};

// ─── Sales List ─────────────────────────────────────────────────────────────
export function SalesPage() {
  const { sales } = useStore();
  const { t, lang } = useLanguage();
  const totalVolume = sales.reduce((s, sale) => s + sale.askingPrice, 0);
  const totalProfit = sales.reduce((s, sale) => s + (sale.askingPrice - sale.totalCost), 0);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title={t('sales.title')}
        subtitle={`${sales.length} ${t('portfolio.objects')} · ${formatEUR(totalVolume, true)} ${t('sales.totalVolume')}`}
        badge={lang === 'de' ? 'Verkauf' : 'Sales'}
        actions={
          <button className="btn-glass px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <Plus size={14} /> {t('common.add')}
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Assets for Sale" value={`${sales.length}`} status="neutral" />
        <KPICard label="Asking Volume" value={formatEUR(totalVolume, true)} status="neutral" />
        <KPICard label="Est. Gross Profit" value={formatEUR(totalProfit, true)} status={totalProfit > 0 ? 'good' : 'danger'} />
        <KPICard label="Active Buyers" value={`${sales.flatMap(s => s.buyers).filter(b => b.stage !== 'Abgesagt').length}`} status="good" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        {sales.map(sale => {
          const activeBuyers = sale.buyers.filter(b => b.stage !== 'Abgesagt');
          const leadBuyer = sale.buyers.find(b => b.stage === 'Due Diligence' || b.stage === 'LOI' || b.stage === 'Signing');
          const grossProfit = sale.askingPrice - sale.totalCost;
          return (
            <Link key={sale.id} to={`/sales/${sale.id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <TitleImageDisplay entityId={sale.id} height={150} />
                <div style={{ padding: 20 }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', margin: 0 }}>{sale.name}</h3>
                      <div style={{ fontSize: 12, color: 'rgba(60,60,67,0.50)', marginTop: 2 }}>{sale.city} · {sale.usageType}</div>
                    </div>
                    <span className={sale.status === 'Aktiv' ? 'badge-success' : sale.status === 'Closing' ? 'badge-accent' : 'badge-neutral'}>{sale.status}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>Asking Price</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#007aff' }}>{formatEUR(sale.askingPrice, true)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(60,60,67,0.45)', textTransform: 'uppercase' }}>Bruttogewinn</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: grossProfit > 0 ? '#1a7f37' : '#cc1a14' }}>{formatEUR(grossProfit, true)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge-neutral">{activeBuyers.length} Interessenten</span>
                    {leadBuyer && <span className={STAGE_COLOR[leadBuyer.stage]}>{leadBuyer.name} — {leadBuyer.stage}</span>}
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

// ─── Sale Detail ──────────────────────────────────────────────────────────────
export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { sales, updateSale, addBuyer, updateBuyer } = useStore();
  const { t, lang } = useLanguage();
  const dateLocale = lang === 'de' ? 'de-DE' : 'en-GB';
  const sale = sales.find(s => s.id === id);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddBuyer, setShowAddBuyer] = useState(false);
  const [newBuyer, setNewBuyer] = useState<Partial<BuyerLead>>({ stage: 'Kontaktiert' });

  if (!sale) return <div className="p-8"><Link to="/sales" style={{ color: '#007aff' }}>{t('common.back')}</Link></div>;

  const grossProfit = sale.askingPrice - sale.totalCost;
  const bestOffer = Math.max(...sale.buyers.filter(b => b.offeredPrice).map(b => b.offeredPrice!), 0);

  const handleAddBuyer = () => {
    if (!newBuyer.name) return;
    const buyer: BuyerLead = {
      id: `buyer-${Date.now()}`,
      saleId: sale.id,
      name: newBuyer.name || '',
      company: newBuyer.company,
      email: newBuyer.email,
      phone: newBuyer.phone,
      stage: newBuyer.stage || 'Kontaktiert',
      offeredPrice: newBuyer.offeredPrice,
      notes: newBuyer.notes,
      lastContact: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    addBuyer(sale.id, buyer);
    setShowAddBuyer(false);
    setNewBuyer({ stage: 'Kontaktiert' });
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <Link to="/sales" style={{ color: 'rgba(60,60,67,0.55)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={13} /> Sales
        </Link>
        <ChevronRight size={13} color="rgba(60,60,67,0.35)" />
        <span style={{ fontSize: 13, color: 'rgba(60,60,67,0.70)' }}>{sale.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', color: '#1c1c1e', margin: 0 }}>{sale.name}</h1>
          <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.55)', marginTop: 4 }}>{sale.address}, {sale.city}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className={sale.status === 'Aktiv' ? 'badge-success' : 'badge-neutral'}>{sale.status}</span>
            <span className="badge-neutral">{sale.usageType}</span>
            <span className="badge-neutral">{sale.sourceType}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn-glass px-4 py-2 rounded-xl text-sm flex items-center gap-2"><Download size={14} /> Investment Memo</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard label="Asking Price" value={formatEUR(sale.askingPrice, true)} status="neutral" />
        <KPICard label="Mindestpreis" value={formatEUR(sale.minimumPrice, true)} status="neutral" />
        <KPICard label="Gesamtkosten" value={formatEUR(sale.totalCost, true)} status="neutral" />
        <KPICard label="Bruttogewinn" value={formatEUR(grossProfit, true)} status={grossProfit > 0 ? 'good' : 'danger'} />
        <KPICard label="Bestes Angebot" value={bestOffer > 0 ? formatEUR(bestOffer, true) : '—'} status={bestOffer >= sale.minimumPrice ? 'good' : bestOffer > 0 ? 'warning' : 'neutral'} />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs
          tabs={[
            { key: 'overview', label: 'Übersicht' },
            { key: 'buyers', label: 'Käufer-Pipeline', count: sale.buyers.length },
            { key: 'dataroom', label: 'Datenraum', count: sale.documents.length },
            { key: 'images', label: 'Bilder' },
            { key: 'activity', label: 'Aktivitäten' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6 animate-fade-in">
          <GlassPanel style={{ padding: 24 }}>
            <SectionHeader title="Objekt-Details" />
            <div className="space-y-2">
              {[
                { label: 'Asking Price', value: formatEUR(sale.askingPrice) },
                { label: 'Mindestpreis', value: formatEUR(sale.minimumPrice) },
                { label: 'Gesamtkosten (inkl. Erwerb)', value: formatEUR(sale.totalCost) },
                { label: 'Bruttogewinn', value: formatEUR(grossProfit), color: grossProfit > 0 ? '#1a7f37' : '#cc1a14' },
                { label: 'Fläche', value: sale.area ? `${sale.area.toLocaleString(dateLocale)} m²` : '—' },
                { label: 'Jahresnettomiete', value: sale.annualRent ? formatEUR(sale.annualRent) : '—' },
                { label: 'NOI', value: sale.noi ? formatEUR(sale.noi) : '—' },
                { label: 'Kaufpreisfaktor', value: sale.annualRent ? `${(sale.askingPrice / sale.annualRent).toFixed(1)}x` : '—' },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2 px-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(60,60,67,0.65)' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: row.color || '#1c1c1e', fontFamily: 'ui-monospace, monospace' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Buyer summary */}
          <GlassPanel style={{ padding: 24 }}>
            <SectionHeader title="Käufer Überblick" />
            {sale.buyers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'rgba(60,60,67,0.40)', fontSize: 13 }}>Noch keine Käuferinteressenten.</div>
            ) : (
              <div className="space-y-2">
                {sale.buyers.map(buyer => (
                  <div key={buyer.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,122,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#007aff' }}>
                      {buyer.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{buyer.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.50)' }}>{buyer.company}</div>
                    </div>
                    <div className="text-right">
                      <span className={STAGE_COLOR[buyer.stage]}>{buyer.stage}</span>
                      {buyer.offeredPrice && (
                        <div style={{ fontSize: 11, color: '#007aff', fontWeight: 600, marginTop: 2 }}>{formatEUR(buyer.offeredPrice, true)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>
        </div>
      )}

      {/* ── BUYERS PIPELINE ── */}
      {activeTab === 'buyers' && (
        <div className="animate-fade-in">
          <div className="flex justify-between mb-4">
            <SectionHeader title="Käufer-Pipeline" />
            <button onClick={() => setShowAddBuyer(true)} className="btn-accent px-3 py-1.5 rounded-xl text-xs flex items-center gap-1">
              <Plus size={12} /> Interessent hinzufügen
            </button>
          </div>
          <GlassPanel style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  {['Interessent', 'Firma', 'Kontakt', 'Phase', 'Angebot', 'Letzter Kontakt', 'Notizen', 'Aktion'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'rgba(60,60,67,0.45)', textAlign: 'left', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sale.buyers.map(buyer => (
                  <tr key={buyer.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{buyer.name}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'rgba(60,60,67,0.65)' }}>{buyer.company || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {buyer.email && <a href={`mailto:${buyer.email}`}><Mail size={13} color="#007aff" /></a>}
                        {buyer.phone && <a href={`tel:${buyer.phone}`}><Phone size={13} color="#34c759" /></a>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <select
                        className="input-glass"
                        value={buyer.stage}
                        onChange={e => updateBuyer(sale.id, buyer.id, { stage: e.target.value as BuyerStage })}
                        style={{ fontSize: 11, padding: '3px 6px', width: 130 }}
                      >
                        {BUYER_STAGES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: buyer.offeredPrice && buyer.offeredPrice >= sale.minimumPrice ? '#1a7f37' : buyer.offeredPrice ? '#b25000' : 'rgba(60,60,67,0.35)' }}>
                      {buyer.offeredPrice ? formatEUR(buyer.offeredPrice, true) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(60,60,67,0.50)' }}>
                      {new Date(buyer.lastContact).toLocaleDateString(dateLocale)}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(60,60,67,0.65)', maxWidth: 200 }}>
                      {buyer.notes || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => updateBuyer(sale.id, buyer.id, { lastContact: new Date().toISOString().split('T')[0] })}
                        style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6, cursor: 'pointer', padding: '3px 8px', fontSize: 11, color: 'rgba(60,60,67,0.65)' }}
                      >
                        Kontakt ✓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sale.buyers.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: 'rgba(60,60,67,0.40)', fontSize: 13 }}>Noch keine Interessenten eingetragen.</div>
            )}
          </GlassPanel>
        </div>
      )}

      {/* ── DATAROOM ── */}
      {activeTab === 'dataroom' && (
        <GlassPanel style={{ padding: 24 }} className="animate-fade-in">
          <div className="flex justify-between mb-4">
            <SectionHeader title="Verkaufs-Datenraum" />
            <button className="btn-glass px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"><Upload size={12} /> Hochladen</button>
          </div>
          {sale.documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'rgba(60,60,67,0.40)', fontSize: 13 }}>Datenraum leer. Dokumente aus dem Bestand werden automatisch übernommen.</div>
          ) : (
            <div className="space-y-2">
              {sale.documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <FileText size={15} color="#007aff" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.45)' }}>{doc.category} · {doc.fileSize}</div>
                  </div>
                  <div className="flex gap-1">{doc.tags.map(t => <span key={t} className="badge-neutral" style={{ fontSize: 10 }}>{t}</span>)}</div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      )}

      {/* ── IMAGES ── */}
      {activeTab === 'images' && (
        <GlassPanel style={{ padding: 24 }} className="animate-fade-in">
          <SectionHeader title="Bilder" />
          <ImageManager entityId={sale.id} entityType="Sale" />
        </GlassPanel>
      )}

      {/* ── ACTIVITY ── */}
      {activeTab === 'activity' && (
        <GlassPanel style={{ padding: 24 }} className="animate-fade-in">
          <SectionHeader title="Aktivitäten" />
          <div className="space-y-4">
            {sale.activityLog.map((entry, i) => (
              <div key={entry.id} className="flex gap-3">
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,122,255,0.10)', border: '1px solid rgba(0,122,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11 }}>●</div>
                <div style={{ paddingBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>{entry.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(60,60,67,0.65)', marginTop: 2 }}>{entry.description}</div>
                  <div style={{ fontSize: 11, color: 'rgba(60,60,67,0.40)', marginTop: 4 }}>{new Date(entry.timestamp).toLocaleString(dateLocale)} · {entry.user}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Add Buyer Modal */}
      {showAddBuyer && (
        <Modal title="Interessent hinzufügen" onClose={() => setShowAddBuyer(false)}
          actions={
            <>
              <button onClick={() => setShowAddBuyer(false)} className="btn-glass px-4 py-2 rounded-xl text-sm">Abbrechen</button>
              <button onClick={handleAddBuyer} className="btn-accent px-5 py-2 rounded-xl text-sm">Hinzufügen</button>
            </>
          }
        >
          <div className="space-y-3">
            {[{ label: 'Name *', key: 'name' }, { label: 'Firma', key: 'company' }, { label: 'E-Mail', key: 'email' }, { label: 'Telefon', key: 'phone' }].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.50)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
                <input className="input-glass" value={(newBuyer as any)[f.key] || ''} onChange={e => setNewBuyer(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.50)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phase</label>
              <select className="input-glass" value={newBuyer.stage} onChange={e => setNewBuyer(p => ({ ...p, stage: e.target.value as BuyerStage }))}>
                {BUYER_STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.50)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Angebot (EUR)</label>
              <input type="number" className="input-glass" value={newBuyer.offeredPrice || ''} onChange={e => setNewBuyer(p => ({ ...p, offeredPrice: parseFloat(e.target.value) || undefined }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(60,60,67,0.50)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Notizen</label>
              <textarea className="input-glass" rows={2} value={newBuyer.notes || ''} onChange={e => setNewBuyer(p => ({ ...p, notes: e.target.value }))} style={{ resize: 'none' }} />
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.12)' }}>
              <div style={{ fontSize: 12, color: '#007aff' }}>💡 Kontakt wird automatisch ins Adressbuch (Potentieller Käufer) übernommen.</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

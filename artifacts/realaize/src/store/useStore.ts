import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Asset, AcquisitionDeal, MarketLocation, MarketBenchmark, MarketUpdateEntry, AuditLogEntry, ActivityEntry, DevelopmentProject, SaleObject, Contact, ProjectImage, GeverkPosition, BuyerLead, DailyIntelligenceReport, Document, DealRadarListing, DealRadarSearchCriteria, Appointment } from '../models/types';
import { mockAssets, mockDeals, mockMarketLocations, mockAuditLog, mockDevelopments, mockSales, mockContacts } from '../data/mockData';

interface AppSettings {
  hurrleRate: number; // percent, default 15
  taxRate: number; // percent, default 25
  advisorLanguage: 'de' | 'en';
  minDSCR: number;
  maxLTV: number;
  targetNIY: number;
  defaultExitMultiplier: number; // e.g. 18 for 18x NOI terminal value
  // Default Operating Costs for new assets
  defaultVacancyRate: number;     // %, default 5
  defaultMgmtCostPct: number;     // %, default 3
  defaultMaintenancePerSqm: number; // €/m²/yr, default 10
  defaultClosingCostPct: number;  // %, default 6.5
  defaultBrokerFeePct: number;    // %, default 1.5
}

interface AppState {
  assets: Asset[];
  deals: AcquisitionDeal[];
  developments: DevelopmentProject[];
  sales: SaleObject[];
  contacts: Contact[];
  appointments: Appointment[];
  images: ProjectImage[];
  marketLocations: MarketLocation[];
  auditLog: AuditLogEntry[];
  newsReports: DailyIntelligenceReport[];
  dealRadarListings: DealRadarListing[];
  dealRadarCriteria: DealRadarSearchCriteria;
  settings: AppSettings;

  // Asset
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;

  // Deal
  addDeal: (deal: AcquisitionDeal) => void;
  updateDeal: (id: string, patch: Partial<AcquisitionDeal>) => void;
  addActivityToDeal: (dealId: string, entry: ActivityEntry) => void;
  deleteDeal: (dealId: string) => void;
  transferToBestand: (dealId: string) => void;
  transferToDevelopment: (dealId: string) => void;

  // Development
  updateDevelopment: (id: string, patch: Partial<DevelopmentProject>) => void;
  deleteDevelopment: (id: string) => void;
  addGewerk: (devId: string, gw: GeverkPosition) => void;
  updateGewerk: (devId: string, gwId: string, patch: Partial<GeverkPosition>) => void;
  deleteGewerk: (devId: string, gwId: string) => void;
  addActivityToDevelopment: (devId: string, entry: ActivityEntry) => void;
  addDevUnit: (devId: string, unit: Unit) => void;
  updateDevUnit: (devId: string, unitId: string, patch: Partial<Unit>) => void;
  deleteDevUnit: (devId: string, unitId: string) => void;
  transferDevToBestand: (devId: string) => void;
  transferDevToSale: (devId: string) => void;

  // Sales
  updateSale: (id: string, patch: Partial<SaleObject>) => void;
  deleteSale: (id: string) => void;
  markSaleAsSold: (id: string, soldPrice: number, soldAt: string) => void;
  returnSaleToBestand: (id: string) => void;
  addBuyer: (saleId: string, buyer: BuyerLead) => void;
  updateBuyer: (saleId: string, buyerId: string, patch: Partial<BuyerLead>) => void;

  // Contacts
  addContact: (contact: Contact) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  // Appointments
  addAppointment: (appt: Appointment) => void;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;

  // Images
  addImage: (image: ProjectImage) => void;
  setTitleImage: (entityId: string, imageId: string) => void;
  deleteImage: (imageId: string) => void;

  // Documents
  addDocumentToAsset: (assetId: string, doc: Document) => void;
  addDocumentToDeal: (dealId: string, doc: Document) => void;
  deleteDocument: (entityType: 'asset' | 'deal', entityId: string, docId: string) => void;

  // Market
  updateMarketLocation: (id: string, patch: Partial<MarketLocation>) => void;
  addMarketLocation: (loc: MarketLocation) => void;
  upsertMarketBenchmarks: (cityId: string, benchmarks: MarketBenchmark[], updateEntry: MarketUpdateEntry) => void;

  // Audit
  addAuditEntry: (entry: AuditLogEntry) => void;

  // News
  addNewsReport: (report: DailyIntelligenceReport) => void;
  pruneOldReports: () => void; // keep only last 7 days

  // Deal Radar
  addRadarListings: (listings: DealRadarListing[]) => void;
  updateRadarListing: (id: string, patch: Partial<DealRadarListing>) => void;
  dismissRadarListing: (id: string, note?: string) => void;
  convertToAcquisition: (listingId: string) => void;
  updateRadarCriteria: (criteria: Partial<DealRadarSearchCriteria>) => void;

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Reset
  resetToMockData: () => void;
}

const defaultSettings: AppSettings = {
  hurrleRate: 15,
  taxRate: 25,
  advisorLanguage: 'de',
  minDSCR: 1.25,
  maxLTV: 65,
  targetNIY: 4.5,
  defaultExitMultiplier: 18,
  defaultVacancyRate: 5,
  defaultMgmtCostPct: 3,
  defaultMaintenancePerSqm: 10,
  defaultClosingCostPct: 6.5,
  defaultBrokerFeePct: 1.5,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      assets: mockAssets,
      deals: mockDeals,
      developments: mockDevelopments,
      sales: mockSales,
      contacts: mockContacts,
      appointments: [],
      images: [],
      marketLocations: mockMarketLocations,
      auditLog: mockAuditLog,
      newsReports: [],
      dealRadarListings: [],
      dealRadarCriteria: {
        cities: ['Berlin', 'München', 'Hamburg', 'Frankfurt am Main', 'Düsseldorf'],
        usageTypes: ['Wohnen', 'Büro', 'Logistik'],
        priceMin: 2_000_000,
        priceMax: 50_000_000,
        minArea: 500,
        maxArea: 50_000,
      },
      settings: defaultSettings,

      updateAsset: (id, patch) =>
        set(s => ({ assets: s.assets.map(a => a.id === id ? { ...a, ...patch } : a) })),

      deleteAsset: (id) =>
        set(s => ({ assets: s.assets.filter(a => a.id !== id) })),

      addDeal: (deal) =>
        set(s => ({
          deals: [...s.deals, deal],
          auditLog: [{
            id: `audit-${Date.now()}`,
            action: 'New Deal Created',
            entityType: 'Deal',
            entityId: deal.id,
            entityName: deal.name,
            user: 'M. Wagner',
            timestamp: new Date().toISOString(),
            details: `Deal "${deal.name}" created in stage ${deal.stage}.`,
          }, ...s.auditLog],
        })),

      updateDeal: (id, patch) =>
        set(s => ({ deals: s.deals.map(d => d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d) })),

      addActivityToDeal: (dealId, entry) =>
        set(s => ({ deals: s.deals.map(d => d.id === dealId ? { ...d, activityLog: [entry, ...d.activityLog] } : d) })),

      deleteDeal: (dealId) =>
        set(s => ({ deals: s.deals.filter(d => d.id !== dealId) })),

      transferToBestand: (dealId) => {
        const deal = get().deals.find(d => d.id === dealId);
        if (!deal) return;
        const newAsset: Asset = {
          id: `asset-${Date.now()}`, name: deal.name, address: deal.address, city: deal.city, zip: deal.zip,
          usageType: deal.usageType, status: 'Bestand', acquisitionDate: new Date().toISOString().split('T')[0],
          purchasePrice: deal.underwritingAssumptions.purchasePrice, currentValue: deal.underwritingAssumptions.purchasePrice,
          totalArea: deal.totalArea || deal.underwritingAssumptions.area, lettableArea: deal.underwritingAssumptions.area,
          occupancyRate: 1 - deal.underwritingAssumptions.vacancyRatePercent / 100,
          annualRent: deal.underwritingAssumptions.annualGrossRent,
          operatingCosts: {
            vacancyRatePercent: deal.underwritingAssumptions.vacancyRatePercent,
            managementCostPercent: deal.underwritingAssumptions.managementCostPercent,
            maintenanceReservePerSqm: deal.underwritingAssumptions.maintenanceReservePerSqm,
            nonRecoverableOpex: deal.underwritingAssumptions.nonRecoverableOpex,
            otherOperatingIncome: deal.underwritingAssumptions.otherOperatingIncome,
          },
          units: [], debtInstruments: [], covenants: [], cashFlows: [], documents: deal.documents, capexProjects: [],
          completenessScore: 40,
        };
        set(s => ({
          assets: [...s.assets, newAsset],
          deals: s.deals.filter(d => d.id !== dealId),
          auditLog: [{ id: `audit-${Date.now()}`, action: 'In Bestand überführt', entityType: 'Asset', entityId: newAsset.id, entityName: deal.name, user: 'M. Wagner', timestamp: new Date().toISOString(), details: `Deal "${deal.name}" in Bestand überführt.` }, ...s.auditLog],
        }));
      },

      transferToDevelopment: (dealId) => {
        const deal = get().deals.find(d => d.id === dealId);
        if (!deal) return;
        const newDev: DevelopmentProject = {
          id: `dev-${Date.now()}`, dealId, name: deal.name, address: deal.address, city: deal.city, zip: deal.zip,
          usageType: deal.usageType, developmentType: 'Modernisierung', status: 'Planung',
          totalArea: deal.totalArea || deal.underwritingAssumptions.area,
          startDate: new Date().toISOString().split('T')[0],
          plannedEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString().split('T')[0],
          purchasePrice: deal.underwritingAssumptions.purchasePrice,
          totalBudget: deal.underwritingAssumptions.initialCapex,
          gewerke: [], documents: deal.documents, activityLog: [], advisorMessages: [], images: [],
          completenessScore: 30, holdSellDecision: 'Offen',
        };
        set(s => ({
          developments: [...s.developments, newDev],
          deals: s.deals.filter(d => d.id !== dealId),
          auditLog: [{ id: `audit-${Date.now()}`, action: 'In Development überführt', entityType: 'Asset', entityId: newDev.id, entityName: deal.name, user: 'M. Wagner', timestamp: new Date().toISOString(), details: `Deal "${deal.name}" in Development überführt.` }, ...s.auditLog],
        }));
      },

      updateDevelopment: (id, patch) =>
        set(s => ({ developments: s.developments.map(d => d.id === id ? { ...d, ...patch } : d) })),

      deleteDevelopment: (id) =>
        set(s => ({ developments: s.developments.filter(d => d.id !== id) })),

      addGewerk: (devId, gw) =>
        set(s => ({ developments: s.developments.map(d => d.id === devId ? { ...d, gewerke: [...d.gewerke, gw] } : d) })),

      updateGewerk: (devId, gwId, patch) =>
        set(s => ({ developments: s.developments.map(d => d.id === devId ? { ...d, gewerke: d.gewerke.map(g => g.id === gwId ? { ...g, ...patch } : g) } : d) })),

      deleteGewerk: (devId, gwId) =>
        set(s => ({ developments: s.developments.map(d => d.id === devId ? { ...d, gewerke: d.gewerke.filter(g => g.id !== gwId) } : d) })),

      addActivityToDevelopment: (devId, entry) =>
        set(s => ({ developments: s.developments.map(d => d.id === devId ? { ...d, activityLog: [entry, ...d.activityLog] } : d) })),

      addDevUnit: (devId, unit) =>
        set(s => ({ developments: s.developments.map(d => d.id === devId ? { ...d, units: [...(d.units || []), unit] } : d) })),

      updateDevUnit: (devId, unitId, patch) =>
        set(s => ({ developments: s.developments.map(d => d.id === devId ? { ...d, units: (d.units || []).map(u => u.id === unitId ? { ...u, ...patch } : u) } : d) })),

      deleteDevUnit: (devId, unitId) =>
        set(s => ({ developments: s.developments.map(d => d.id === devId ? { ...d, units: (d.units || []).filter(u => u.id !== unitId) } : d) })),

      transferDevToBestand: (devId) => {
        const dev = get().developments.find(d => d.id === devId);
        if (!dev) return;
        const newAssetId = `asset-${Date.now()}`;
        const units = (dev.units || []).map(u => ({ ...u, assetId: newAssetId }));
        const annualRent = units.reduce((s, u) => s + u.monthlyRent * 12, 0);
        const lettedUnits = units.filter(u => u.leaseType === 'Vermietet');
        const occupancyRate = units.length > 0 ? lettedUnits.length / units.length : 0;
        const newAsset: Asset = {
          id: newAssetId, name: dev.name, address: dev.address, city: dev.city, zip: dev.zip,
          usageType: dev.usageType, status: 'Bestand', acquisitionDate: new Date().toISOString().split('T')[0],
          purchasePrice: dev.purchasePrice + dev.totalBudget, currentValue: dev.projectedSalePrice || dev.purchasePrice + dev.totalBudget,
          totalArea: dev.totalArea, lettableArea: dev.totalArea * 0.9,
          occupancyRate, annualRent,
          operatingCosts: {
            vacancyRatePercent: 5,
            managementCostPercent: 3,
            maintenanceReservePerSqm: 10,
            nonRecoverableOpex: 0,
            otherOperatingIncome: 0,
          },
          units, debtInstruments: [], covenants: [], cashFlows: [], documents: dev.documents, capexProjects: [],
          completenessScore: 45,
        };
        set(s => ({
          assets: [...s.assets, newAsset],
          developments: s.developments.map(d => d.id === devId ? { ...d, status: 'Fertiggestellt', holdSellDecision: 'Hold' } : d),
          auditLog: [{ id: `audit-${Date.now()}`, action: 'Development → Bestand', entityType: 'Asset', entityId: newAsset.id, entityName: dev.name, user: 'M. Wagner', timestamp: new Date().toISOString(), details: `Development "${dev.name}" in Bestand überführt.` }, ...s.auditLog],
        }));
      },

      transferDevToSale: (devId) => {
        const dev = get().developments.find(d => d.id === devId);
        if (!dev) return;
        const newSale: SaleObject = {
          id: `sale-${Date.now()}`, sourceType: 'Development', sourceId: devId,
          name: `${dev.name} — Verkauf`, address: dev.address, city: dev.city, zip: dev.zip,
          usageType: dev.usageType, status: 'Vorbereitung',
          targetPrice: dev.projectedSalePrice || dev.purchasePrice * 1.3,
          minimumPrice: (dev.purchasePrice + dev.totalBudget) * 1.1,
          askingPrice: dev.projectedSalePrice || dev.purchasePrice * 1.35,
          totalCost: dev.purchasePrice + dev.totalBudget,
          area: dev.totalArea, documents: dev.documents, buyers: [], activityLog: [], images: [],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        set(s => ({
          sales: [...s.sales, newSale],
          developments: s.developments.map(d => d.id === devId ? { ...d, status: 'Fertiggestellt', holdSellDecision: 'Sell' } : d),
          auditLog: [{ id: `audit-${Date.now()}`, action: 'Development → Sales', entityType: 'Asset', entityId: newSale.id, entityName: dev.name, user: 'M. Wagner', timestamp: new Date().toISOString(), details: `Development "${dev.name}" in Sales überführt.` }, ...s.auditLog],
        }));
      },

      updateSale: (id, patch) =>
        set(s => ({ sales: s.sales.map(sale => sale.id === id ? { ...sale, ...patch, updatedAt: new Date().toISOString() } : sale) })),

      deleteSale: (id) =>
        set(s => ({ sales: s.sales.filter(sale => sale.id !== id) })),

      markSaleAsSold: (id, soldPrice, soldAt) =>
        set(s => ({
          sales: s.sales.map(sale => sale.id === id
            ? { ...sale, status: 'Verkauft' as const, soldPrice, soldAt, disposalGain: soldPrice - sale.totalCost, updatedAt: new Date().toISOString() }
            : sale),
        })),

      returnSaleToBestand: (id) => {
        const sale = get().sales.find(s => s.id === id);
        if (!sale) return;
        const newAsset: import('../models/types').Asset = {
          id: `asset-${Date.now()}`,
          name: sale.name,
          address: sale.address,
          city: sale.city,
          zip: sale.zip,
          usageType: sale.usageType,
          currentValue: sale.askingPrice,
          purchasePrice: sale.totalCost,
          annualRent: sale.annualRent || 0,
          occupancyRate: 1,
          area: sale.area || 0,
          debtInstruments: [],
          covenants: [],
          leases: [],
          capexItems: [],
          documents: [],
          activityLog: [],
          purchaseDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(s => ({ sales: s.sales.filter(sale => sale.id !== id), assets: [...s.assets, newAsset] }));
      },

      addBuyer: (saleId, buyer) =>
        set(s => ({ sales: s.sales.map(sale => sale.id === saleId ? { ...sale, buyers: [...sale.buyers, buyer] } : sale) })),

      updateBuyer: (saleId, buyerId, patch) =>
        set(s => ({ sales: s.sales.map(sale => sale.id === saleId ? { ...sale, buyers: sale.buyers.map(b => b.id === buyerId ? { ...b, ...patch } : b) } : sale) })),

      addContact: (contact) => set(s => ({ contacts: [...s.contacts, contact] })),
      updateContact: (id, patch) => set(s => ({ contacts: s.contacts.map(c => c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c) })),
      deleteContact: (id) => set(s => ({ contacts: s.contacts.filter(c => c.id !== id) })),

      addImage: (image) => set(s => ({ images: [...s.images, image] })),
      setTitleImage: (entityId, imageId) =>
        set(s => ({ images: s.images.map(img => img.entityId === entityId ? { ...img, isTitleImage: img.id === imageId } : img) })),
      deleteImage: (imageId) => set(s => ({ images: s.images.filter(img => img.id !== imageId) })),

      addDocumentToAsset: (assetId, doc) =>
        set(s => ({ assets: s.assets.map(a => a.id === assetId ? { ...a, documents: [...a.documents, doc] } : a) })),

      addDocumentToDeal: (dealId, doc) =>
        set(s => ({ deals: s.deals.map(d => d.id === dealId ? { ...d, documents: [...d.documents, doc] } : d) })),

      deleteDocument: (entityType, entityId, docId) =>
        set(s => entityType === 'asset'
          ? { assets: s.assets.map(a => a.id === entityId ? { ...a, documents: a.documents.filter(d => d.id !== docId) } : a) }
          : { deals: s.deals.map(d => d.id === entityId ? { ...d, documents: d.documents.filter(doc => doc.id !== docId) } : d) }
        ),

      updateMarketLocation: (id, patch) =>
        set(s => ({ marketLocations: s.marketLocations.map(l => l.id === id ? { ...l, ...patch } : l) })),

      addMarketLocation: (loc) =>
        set(s => ({ marketLocations: [...s.marketLocations, loc] })),

      upsertMarketBenchmarks: (cityId, benchmarks, updateEntry) =>
        set(s => ({
          marketLocations: s.marketLocations.map(loc => {
            if (loc.id !== cityId) return loc;
            // Merge: update existing benchmarks by usageType, add new ones
            const updated = [...loc.benchmarks];
            for (const bm of benchmarks) {
              const idx = updated.findIndex(b => b.usageType === bm.usageType);
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], ...bm };
              } else {
                updated.push(bm);
              }
            }
            return {
              ...loc,
              benchmarks: updated,
              updateLog: [updateEntry, ...loc.updateLog],
              lastUpdated: new Date().toISOString().split('T')[0],
            };
          }),
        })),

      addAuditEntry: (entry) => set(s => ({ auditLog: [entry, ...s.auditLog] })),

      addNewsReport: (report) =>
        set(s => {
          // Replace if same date exists, otherwise prepend
          const existing = s.newsReports.findIndex(r => r.date === report.date);
          if (existing >= 0) {
            const updated = [...s.newsReports];
            updated[existing] = report;
            return { newsReports: updated };
          }
          return { newsReports: [report, ...s.newsReports] };
        }),

      pruneOldReports: () =>
        set(s => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 7);
          const cutoffStr = cutoff.toISOString().split('T')[0];
          return { newsReports: s.newsReports.filter(r => r.date >= cutoffStr) };
        }),

      // Deal Radar
      addRadarListings: (listings) =>
        set(s => {
          const existingIds = new Set(s.dealRadarListings.map(l => l.id));
          const newOnes = listings.filter(l => !existingIds.has(l.id));
          return { dealRadarListings: [...newOnes, ...s.dealRadarListings] };
        }),

      updateRadarListing: (id, patch) =>
        set(s => ({ dealRadarListings: s.dealRadarListings.map(l => l.id === id ? { ...l, ...patch } : l) })),

      dismissRadarListing: (id, note) =>
        set(s => ({ dealRadarListings: s.dealRadarListings.map(l =>
          l.id === id ? { ...l, status: 'dismissed' as const, reviewedAt: new Date().toISOString(), reviewNote: note || 'Abgelehnt' } : l
        )})),

      convertToAcquisition: (listingId) =>
        set(s => {
          const listing = s.dealRadarListings.find(l => l.id === listingId);
          if (!listing) return {};
          const now = new Date().toISOString();
          const newDeal: AcquisitionDeal = {
            id: `deal-${Date.now()}`,
            name: listing.title,
            address: listing.address,
            city: listing.city,
            zip: listing.zip,
            usageType: listing.usageType,
            dealType: 'Investment',
            stage: 'Screening',
            askingPrice: listing.askingPrice,
            underwritingAssumptions: {
              purchasePrice: listing.askingPrice,
              closingCostPercent: s.settings.defaultClosingCostPct,
              brokerFeePercent: s.settings.defaultBrokerFeePct,
              initialCapex: 0,
              annualGrossRent: 0,
              vacancyRatePercent: s.settings.defaultVacancyRate,
              managementCostPercent: s.settings.defaultMgmtCostPct,
              maintenanceReservePerSqm: s.settings.defaultMaintenancePerSqm,
              nonRecoverableOpex: 0,
              area: listing.totalArea,
              rentPerSqm: 0,
              otherOperatingIncome: 0,
            },
            financingAssumptions: { loanAmount: Math.round(listing.askingPrice * 0.65), interestRate: 4.0, amortizationRate: 2.0, loanTerm: 10, lenderName: '', fixedRatePeriod: 5 },
            documents: [], activityLog: [{ id: `act-${Date.now()}`, date: now, type: 'Note', title: 'Aus Deal Radar übernommen', description: `Quelle: ${listing.sourceLabel}\nURL: ${listing.sourceUrl}\nAI-Notizen: ${listing.aiNotes}`, user: 'M. Wagner' }],
            aiRecommendations: [], completenessScore: 25, createdAt: now, updatedAt: now,
            totalArea: listing.totalArea, broker: listing.sourceLabel,
          };
          return {
            deals: [...s.deals, newDeal],
            dealRadarListings: s.dealRadarListings.map(l => l.id === listingId ? { ...l, status: 'converted' as const, reviewedAt: now } : l),
          };
        }),

      updateRadarCriteria: (criteria) =>
        set(s => ({ dealRadarCriteria: { ...s.dealRadarCriteria, ...criteria } })),

      addAppointment: (appt) => set(s => ({ appointments: [...s.appointments, appt] })),
      updateAppointment: (id, patch) => set(s => ({ appointments: s.appointments.map(a => a.id === id ? { ...a, ...patch } : a) })),
      deleteAppointment: (id) => set(s => ({ appointments: s.appointments.filter(a => a.id !== id) })),

      updateSettings: (patch) => set(s => ({ settings: { ...s.settings, ...patch } })),

      resetToMockData: () => set({ assets: mockAssets, deals: mockDeals, developments: mockDevelopments, sales: mockSales, contacts: mockContacts, images: [], marketLocations: mockMarketLocations, auditLog: mockAuditLog, newsReports: [], dealRadarListings: [], dealRadarCriteria: { cities: ['Berlin', 'München', 'Hamburg', 'Frankfurt am Main', 'Düsseldorf'], usageTypes: ['Wohnen', 'Büro', 'Logistik'], priceMin: 2_000_000, priceMax: 50_000_000, minArea: 500, maxArea: 50_000 }, settings: defaultSettings }),
    }),
    {
      name: 'restate-storage-v2',
      partialize: (s) => ({ assets: s.assets, deals: s.deals, developments: s.developments, sales: s.sales, contacts: s.contacts, appointments: s.appointments, images: s.images, marketLocations: s.marketLocations, auditLog: s.auditLog, newsReports: s.newsReports, dealRadarListings: s.dealRadarListings, dealRadarCriteria: s.dealRadarCriteria, settings: s.settings }),
    }
  )
);

import type {
  Asset, AcquisitionDeal, MarketLocation, AuditLogEntry,
  Unit, DebtInstrument, Covenant, CashFlowEntry, Document,
  DevelopmentProject, SaleObject, Contact
} from '../models/types';

// ─── Assets (Owned Portfolio) ─────────────────────────────────────────────────

export const mockAssets: Asset[] = [
  {
    id: 'asset-001',
    name: 'Westend Plaza',
    address: 'Bockenheimer Landstraße 47',
    city: 'Frankfurt',
    zip: '60325',
    usageType: 'Büro',
    status: 'Bestand',
    acquisitionDate: '2021-03-15',
    purchasePrice: 18_500_000,
    currentValue: 21_200_000,
    totalArea: 4_850,
    lettableArea: 4_600,
    occupancyRate: 0.89,
    annualRent: 1_105_200,
    operatingCosts: {
      vacancyRatePercent: 5,
      managementCostPercent: 3,
      maintenanceReservePerSqm: 12,
      nonRecoverableOpex: 85_000,
      otherOperatingIncome: 16_800,
    },
    completenessScore: 88,
    notes: 'Hauptmieter Laufzeit bis 2027. Gespräche über Verlängerung laufen.',
    units: [
      { id: 'u-001-1', assetId: 'asset-001', unitNumber: 'EG-01', floor: 0, area: 580, usageType: 'Büro', tenant: 'Kanzlei Müller & Partner', rentPerSqm: 21.5, monthlyRent: 12_470, leaseStart: '2020-01-01', leaseEnd: '2027-12-31', leaseType: 'Vermietet' },
      { id: 'u-001-2', assetId: 'asset-001', unitNumber: '1.OG-01', floor: 1, area: 720, usageType: 'Büro', tenant: 'FinServ GmbH', rentPerSqm: 22.0, monthlyRent: 15_840, leaseStart: '2021-06-01', leaseEnd: '2026-05-31', leaseType: 'Vermietet' },
      { id: 'u-001-3', assetId: 'asset-001', unitNumber: '1.OG-02', floor: 1, area: 340, usageType: 'Büro', rentPerSqm: 0, monthlyRent: 0, leaseType: 'Leerstand' },
      { id: 'u-001-4', assetId: 'asset-001', unitNumber: '2.OG-01', floor: 2, area: 860, usageType: 'Büro', tenant: 'Consulting AG', rentPerSqm: 20.8, monthlyRent: 17_888, leaseStart: '2022-01-01', leaseEnd: '2027-12-31', leaseType: 'Vermietet' },
      { id: 'u-001-5', assetId: 'asset-001', unitNumber: '3.OG-01', floor: 3, area: 950, usageType: 'Büro', tenant: 'TechVenture SE', rentPerSqm: 23.5, monthlyRent: 22_325, leaseStart: '2023-03-01', leaseEnd: '2028-02-29', leaseType: 'Vermietet' },
      { id: 'u-001-6', assetId: 'asset-001', unitNumber: 'UG-Parking', floor: -1, area: 400, usageType: 'Sonstiges' as any, tenant: 'Diverse Mieter', rentPerSqm: 3.5, monthlyRent: 1_400, leaseStart: '2021-03-01', leaseEnd: '2024-02-29', leaseType: 'Vermietet' },
    ],
    debtInstruments: [
      { id: 'debt-001-1', assetId: 'asset-001', lender: 'Deutsche Pfandbriefbank', type: 'Senior', amount: 12_000_000, outstandingAmount: 11_200_000, interestRate: 3.45, interestType: 'Fest', maturityDate: '2028-03-15', amortizationRate: 2.0, drawdownDate: '2021-03-15', currency: 'EUR', covenants: [] }
    ],
    covenants: [
      { id: 'cov-001-1', assetId: 'asset-001', name: 'LTV Covenant', type: 'LTV', threshold: 60, currentValue: 52.8, status: 'OK', testDate: '2024-12-31', description: 'Max. LTV 60%' },
      { id: 'cov-001-2', assetId: 'asset-001', name: 'DSCR Covenant', type: 'DSCR', threshold: 1.25, currentValue: 1.42, status: 'OK', testDate: '2024-12-31', description: 'Min. DSCR 1.25x' },
    ],
    cashFlows: generateCashFlows('asset-001', 1_105_200, -420_000),
    documents: [
      { id: 'doc-001-1', assetId: 'asset-001', name: 'Kaufvertrag Westend Plaza.pdf', category: 'Kaufvertrag', uploadDate: '2021-03-10', fileSize: '2.4 MB', tags: ['KV', 'Notariat'], uploadedBy: 'M. Wagner' },
      { id: 'doc-001-2', assetId: 'asset-001', name: 'Mietvertrag Kanzlei Müller.pdf', category: 'Mietvertrag', uploadDate: '2021-01-15', fileSize: '1.8 MB', tags: ['MV', 'Büro'], uploadedBy: 'S. Klein' },
      { id: 'doc-001-3', assetId: 'asset-001', name: 'Wertgutachten 2023.pdf', category: 'Gutachten', uploadDate: '2023-11-20', fileSize: '4.2 MB', tags: ['Bewertung', 'CBRE'], uploadedBy: 'M. Wagner' },
    ],
    capexProjects: [
      { id: 'capex-001-1', assetId: 'asset-001', name: 'Lobby-Renovation EG', budget: 280_000, spent: 195_000, status: 'Laufend', startDate: '2024-01-01', endDate: '2024-06-30' }
    ],
  },
  {
    id: 'asset-002',
    name: 'Schwabing Wohnpark',
    address: 'Leopoldstraße 124',
    city: 'München',
    zip: '80804',
    usageType: 'Wohnen',
    status: 'Bestand',
    acquisitionDate: '2019-09-01',
    purchasePrice: 8_200_000,
    currentValue: 11_500_000,
    totalArea: 2_150,
    lettableArea: 2_080,
    occupancyRate: 0.96,
    annualRent: 598_080,
    operatingCosts: {
      vacancyRatePercent: 3,
      managementCostPercent: 4,
      maintenanceReservePerSqm: 10,
      nonRecoverableOpex: 42_000,
      otherOperatingIncome: 8_400,
    },
    completenessScore: 95,
    units: [
      { id: 'u-002-1', assetId: 'asset-002', unitNumber: '1a', floor: 1, area: 68, usageType: 'Wohnen', tenant: 'Fam. Bauer', rentPerSqm: 19.5, monthlyRent: 1_326, leaseStart: '2020-01-01', leaseEnd: '2025-12-31', leaseType: 'Vermietet' },
      { id: 'u-002-2', assetId: 'asset-002', unitNumber: '1b', floor: 1, area: 52, usageType: 'Wohnen', tenant: 'P. Schmidt', rentPerSqm: 20.0, monthlyRent: 1_040, leaseStart: '2021-03-01', leaseEnd: '2026-02-28', leaseType: 'Vermietet' },
      { id: 'u-002-3', assetId: 'asset-002', unitNumber: '2a', floor: 2, area: 85, usageType: 'Wohnen', tenant: 'T. Hofmann', rentPerSqm: 21.0, monthlyRent: 1_785, leaseStart: '2019-10-01', leaseEnd: '2027-09-30', leaseType: 'Vermietet' },
      { id: 'u-002-4', assetId: 'asset-002', unitNumber: '2b', floor: 2, area: 72, usageType: 'Wohnen', rentPerSqm: 0, monthlyRent: 0, leaseType: 'Leerstand' },
      { id: 'u-002-5', assetId: 'asset-002', unitNumber: '3a', floor: 3, area: 92, usageType: 'Wohnen', tenant: 'K. Richter', rentPerSqm: 22.5, monthlyRent: 2_070, leaseStart: '2022-06-01', leaseEnd: '2025-05-31', leaseType: 'Vermietet' },
    ],
    debtInstruments: [
      { id: 'debt-002-1', assetId: 'asset-002', lender: 'Bayerische Landesbank', type: 'Senior', amount: 5_500_000, outstandingAmount: 4_900_000, interestRate: 2.10, interestType: 'Fest', maturityDate: '2026-09-01', amortizationRate: 2.5, drawdownDate: '2019-09-01', currency: 'EUR', covenants: [] }
    ],
    covenants: [
      { id: 'cov-002-1', assetId: 'asset-002', name: 'LTV Covenant', type: 'LTV', threshold: 65, currentValue: 42.6, status: 'OK', testDate: '2024-12-31' },
      { id: 'cov-002-2', assetId: 'asset-002', name: 'DSCR Covenant', type: 'DSCR', threshold: 1.20, currentValue: 1.85, status: 'OK', testDate: '2024-12-31' },
    ],
    cashFlows: generateCashFlows('asset-002', 598_080, -180_000),
    documents: [
      { id: 'doc-002-1', assetId: 'asset-002', name: 'Kaufvertrag Schwabing.pdf', category: 'Kaufvertrag', uploadDate: '2019-08-25', fileSize: '1.9 MB', tags: ['KV'], uploadedBy: 'M. Wagner' },
    ],
    capexProjects: [],
  },
  {
    id: 'asset-003',
    name: 'Hafenviertel Logistik',
    address: 'Am Lagerhaus 15',
    city: 'Hamburg',
    zip: '20457',
    usageType: 'Logistik',
    status: 'Bestand',
    acquisitionDate: '2022-06-01',
    purchasePrice: 22_000_000,
    currentValue: 24_800_000,
    totalArea: 12_500,
    lettableArea: 12_000,
    occupancyRate: 1.0,
    annualRent: 1_080_000,
    operatingCosts: {
      vacancyRatePercent: 0,
      managementCostPercent: 2.5,
      maintenanceReservePerSqm: 6,
      nonRecoverableOpex: 95_000,
      otherOperatingIncome: 24_000,
    },
    completenessScore: 72,
    units: [
      { id: 'u-003-1', assetId: 'asset-003', unitNumber: 'Halle A', floor: 0, area: 6_000, usageType: 'Logistik', tenant: 'LogisTrans GmbH', rentPerSqm: 7.5, monthlyRent: 45_000, leaseStart: '2022-06-01', leaseEnd: '2032-05-31', leaseType: 'Vermietet' },
      { id: 'u-003-2', assetId: 'asset-003', unitNumber: 'Halle B', floor: 0, area: 6_000, usageType: 'Logistik', tenant: 'E-Commerce GmbH', rentPerSqm: 7.5, monthlyRent: 45_000, leaseStart: '2022-06-01', leaseEnd: '2029-05-31', leaseType: 'Vermietet' },
    ],
    debtInstruments: [
      { id: 'debt-003-1', assetId: 'asset-003', lender: 'Berlin Hyp', type: 'Senior', amount: 15_000_000, outstandingAmount: 14_400_000, interestRate: 4.25, interestType: 'Fest', maturityDate: '2025-06-01', amortizationRate: 2.0, drawdownDate: '2022-06-01', currency: 'EUR', covenants: [] }
    ],
    covenants: [
      { id: 'cov-003-1', assetId: 'asset-003', name: 'LTV Covenant', type: 'LTV', threshold: 65, currentValue: 58.1, status: 'Warning', testDate: '2024-12-31', description: 'Annäherung an Schwellenwert. Refinanzierung in Vorbereitung.' },
      { id: 'cov-003-2', assetId: 'asset-003', name: 'DSCR Covenant', type: 'DSCR', threshold: 1.20, currentValue: 1.18, status: 'Breach', testDate: '2024-12-31', description: 'Covenant verletzt. Gespräche mit Lender laufen.' },
    ],
    cashFlows: generateCashFlows('asset-003', 1_080_000, -380_000),
    documents: [],
    capexProjects: [],
  },
];

function generateCashFlows(assetId: string, annualRent: number, annualOpex: number) {
  const flows: CashFlowEntry[] = [];
  const now = new Date();
  for (let i = -11; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const isForecast = i > 0;
    const variance = 1 + (Math.random() - 0.5) * 0.08;
    flows.push({
      id: `cf-${assetId}-${period}-in`,
      assetId, period, isForecast,
      category: 'Mieteinnahmen',
      description: 'Nettomieteinnahmen',
      amount: Math.round((annualRent / 12) * variance),
    });
    flows.push({
      id: `cf-${assetId}-${period}-out`,
      assetId, period, isForecast,
      category: 'Instandhaltung',
      description: 'Betriebskosten & Instandhaltung',
      amount: Math.round((annualOpex / 12) * variance),
    });
  }
  return flows;
}

// ─── Acquisition Deals ────────────────────────────────────────────────────────

export const mockDeals: AcquisitionDeal[] = [
  {
    id: 'deal-001',
    name: 'Prenzlauer Berg Portfolio',
    address: 'Schönhauser Allee 82',
    city: 'Berlin',
    zip: '10439',
    usageType: 'Wohnen',
    dealType: 'Investment',
    stage: 'Due Diligence',
    askingPrice: 14_200_000,
    completenessScore: 74,
    createdAt: '2024-11-01',
    updatedAt: '2024-12-15',
    broker: 'JLL Berlin',
    vendorName: 'Berliner Wohnbau GmbH',
    totalArea: 3_280,
    marketLocationId: 'loc-berlin',
    targetYield: 4.2,
    underwritingAssumptions: {
      purchasePrice: 14_200_000,
      closingCostPercent: 6.5,
      brokerFeePercent: 1.5,
      initialCapex: 320_000,
      annualGrossRent: 624_000,
      vacancyRatePercent: 5.0,
      managementCostPercent: 4.0,
      maintenanceReservePerSqm: 12,
      nonRecoverableOpex: 45_000,
      area: 3_280,
      rentPerSqm: 15.85,
      otherOperatingIncome: 18_000,
    },
    financingAssumptions: {
      loanAmount: 9_230_000,
      interestRate: 4.45,
      amortizationRate: 2.0,
      loanTerm: 10,
      lenderName: 'Deutsche Hypo',
      fixedRatePeriod: 10,
    },
    documents: [
      { id: 'dd-001-1', dealId: 'deal-001', name: 'Exposé Prenzlauer Berg.pdf', category: 'Due Diligence', uploadDate: '2024-11-05', fileSize: '8.2 MB', tags: ['Exposé', 'JLL'], uploadedBy: 'M. Wagner' },
      { id: 'dd-001-2', dealId: 'deal-001', name: 'Mieterliste Nov 2024.xlsx', category: 'Due Diligence', uploadDate: '2024-11-18', fileSize: '0.4 MB', tags: ['Mieterliste', 'Rent Roll'], uploadedBy: 'S. Klein' },
      { id: 'dd-001-3', dealId: 'deal-001', name: 'IC Memo v1.docx', category: 'IC Memo', uploadDate: '2024-12-01', fileSize: '1.2 MB', tags: ['IC', 'intern'], uploadedBy: 'M. Wagner' },
    ],
    activityLog: [
      { id: 'act-001-1', dealId: 'deal-001', type: 'Status', title: 'Deal in Due Diligence', description: 'LOI wurde unterzeichnet. DD-Phase gestartet.', timestamp: '2024-12-01T10:00:00', user: 'M. Wagner' },
      { id: 'act-001-2', dealId: 'deal-001', type: 'Document', title: 'IC Memo hochgeladen', description: 'Erste Version des IC Memos verfügbar.', timestamp: '2024-12-01T14:30:00', user: 'M. Wagner' },
      { id: 'act-001-3', dealId: 'deal-001', type: 'Note', title: 'Vendor-Feedback', description: 'Verkäufer signalisiert Preisflexibilität bis 13,8M.', timestamp: '2024-12-10T09:15:00', user: 'S. Klein' },
      { id: 'act-001-4', dealId: 'deal-001', type: 'AI', title: 'AI Researcher aktualisiert', description: 'Mietannahmen wurden gegen Marktdaten validiert.', timestamp: '2024-12-15T11:00:00', user: 'System' },
    ],
    aiRecommendations: [
      {
        id: 'ai-001-1', dealId: 'deal-001', type: 'Miete',
        title: 'Mietannahme leicht über Markt',
        body: 'Die angesetzte Miete von 15,85 €/m² liegt 4,5% über dem Medianwert des Berliner Wohnmarktes für vergleichbare Lagen (15,17 €/m²). Bei Neuvermietungen ist ein Abschlag möglich.',
        confidence: 'Mittel', deviationPercent: 4.5, benchmarkLabel: 'Berlin Wohnen – Prenzlauer Berg',
        benchmarkValue: 15.17, userValue: 15.85, generatedAt: '2024-12-15T11:00:00', isAlert: true,
      },
      {
        id: 'ai-001-2', dealId: 'deal-001', type: 'Kaufpreis',
        title: 'Kaufpreisfaktor im oberen Marktbereich',
        body: 'Der implizite Faktor von 22,8x liegt im oberen Quartil des Berliner Wohnmarktes (Benchmark: 19–24x). Bei Stress-Szenario (Zinsen +100 bps) sinkt die CoC auf 1,2%.',
        confidence: 'Hoch', deviationPercent: 8.2, benchmarkLabel: 'Berlin Wohnen – Multiplikatoren',
        benchmarkValue: 21.0, userValue: 22.8, generatedAt: '2024-12-15T11:00:00', isAlert: false,
      },
      {
        id: 'ai-001-3', dealId: 'deal-001', type: 'Finanzierung',
        title: 'Zinsbindung prüfen',
        body: 'Bei einem 10-Jahres-Darlehen auf aktuellem Zinsniveau (4,45%) ist eine partielle Absicherung via Cap empfehlenswert. Refi-Risiko 2034 beachten.',
        confidence: 'Mittel', generatedAt: '2024-12-15T11:00:00', isAlert: false,
      },
    ],
    icMemo: {
      dealId: 'deal-001',
      executiveSummary: 'Erwerb eines Berliner Wohnportfolios (3.280 m² Wohnfläche) im Prenzlauer Berg. Stabilisiertes Objekt mit 94% Vermietungsstand und indexierten Mietverträgen.',
      investmentRationale: 'Demographisch starker Mikrostandort. Knapper Neubau im Segment. Langfristige Mietsteigerungserwartung. Objekt als Core-Plus mit Upside durch Leerstands-Aktivierung.',
      riskFactors: ['Mietpreisbremse Berlin', 'Steigende Instandhaltungsanforderungen', 'Zinsänderungsrisiko bei Refinanzierung 2034', 'Regulatorisches Risiko Wohnungsmarkt'],
      exitStrategy: '7-10 Jahre Haltedauer. Exit als Gesamtportfolio oder Block/Teileigentumsverkauf.',
      recommendedAction: 'Empfehlung: Investition bei Kaufpreis ≤ 13,8 Mio. EUR (entspricht 4,35% Net Initial Yield).',
      preparedBy: 'M. Wagner',
      preparedAt: '2024-12-01T14:00:00',
    },
  },
  {
    id: 'deal-002',
    name: 'Zollhafen Office Tower',
    address: 'Zollhafenstraße 2-4',
    city: 'Mainz',
    zip: '55118',
    usageType: 'Büro',
    dealType: 'Development',
    stage: 'LOI',
    askingPrice: 31_500_000,
    completenessScore: 52,
    createdAt: '2024-12-01',
    updatedAt: '2024-12-20',
    broker: 'Savills Frankfurt',
    totalArea: 6_800,
    marketLocationId: 'loc-frankfurt',
    targetYield: 5.8,
    underwritingAssumptions: {
      purchasePrice: 31_500_000,
      closingCostPercent: 6.5,
      brokerFeePercent: 2.0,
      initialCapex: 850_000,
      annualGrossRent: 2_040_000,
      vacancyRatePercent: 12.0,
      managementCostPercent: 3.5,
      maintenanceReservePerSqm: 18,
      nonRecoverableOpex: 120_000,
      area: 6_800,
      rentPerSqm: 25.0,
      otherOperatingIncome: 35_000,
    },
    financingAssumptions: {
      loanAmount: 20_475_000,
      interestRate: 4.85,
      amortizationRate: 2.0,
      loanTerm: 7,
      lenderName: 'Berlin Hyp',
      fixedRatePeriod: 7,
    },
    documents: [
      { id: 'dd-002-1', dealId: 'deal-002', name: 'Exposé Zollhafen.pdf', category: 'Due Diligence', uploadDate: '2024-12-05', fileSize: '12.1 MB', tags: ['Exposé'], uploadedBy: 'M. Wagner' },
    ],
    activityLog: [
      { id: 'act-002-1', dealId: 'deal-002', type: 'Status', title: 'LOI eingereicht', description: 'Absichtserklärung an Vendor übermittelt.', timestamp: '2024-12-15T09:00:00', user: 'M. Wagner' },
    ],
    aiRecommendations: [
      {
        id: 'ai-002-1', dealId: 'deal-002', type: 'Kaufpreis',
        title: 'Kaufpreisfaktor hoch bei erhöhter Vakanz',
        body: 'Bei 12% Vakanz und geplantem CapEx liegt der adjustierte Faktor bei 17,5x. Marktbenchmark Frankfurt Büro: 14–19x. Assumption vertretbar, aber Upside erfordert Vermietungserfolg.',
        confidence: 'Mittel', deviationPercent: -2.1, benchmarkLabel: 'Frankfurt Büro – Multiplikatoren',
        benchmarkValue: 17.0, userValue: 17.5, generatedAt: '2024-12-20T10:00:00', isAlert: false,
      },
    ],
  },
  {
    id: 'deal-003',
    name: 'Münchner Tor Retail',
    address: 'Ingolstädter Str. 88',
    city: 'München',
    zip: '80939',
    usageType: 'Einzelhandel',
    dealType: 'Investment',
    stage: 'Screening',
    askingPrice: 7_800_000,
    completenessScore: 31,
    createdAt: '2024-12-10',
    updatedAt: '2024-12-22',
    broker: 'CBRE München',
    totalArea: 1_450,
    marketLocationId: 'loc-muenchen',
    targetYield: 6.5,
    underwritingAssumptions: {
      purchasePrice: 7_800_000,
      closingCostPercent: 6.5,
      brokerFeePercent: 1.5,
      initialCapex: 120_000,
      annualGrossRent: 552_000,
      vacancyRatePercent: 8.0,
      managementCostPercent: 4.0,
      maintenanceReservePerSqm: 15,
      nonRecoverableOpex: 35_000,
      area: 1_450,
      rentPerSqm: 31.7,
      otherOperatingIncome: 0,
    },
    financingAssumptions: {
      loanAmount: 5_070_000,
      interestRate: 5.10,
      amortizationRate: 2.5,
      loanTerm: 5,
      lenderName: 'Offen',
      fixedRatePeriod: 5,
    },
    documents: [],
    activityLog: [
      { id: 'act-003-1', dealId: 'deal-003', type: 'Note', title: 'Erstscreening', description: 'Objekt von Broker eingereicht. Erstprüfung läuft.', timestamp: '2024-12-10T14:00:00', user: 'S. Klein' },
    ],
    aiRecommendations: [
      {
        id: 'ai-003-1', dealId: 'deal-003', type: 'Miete',
        title: 'Mietannahme deutlich über Markt',
        body: 'Angenommene Einzelhandelsmiete (31,7 €/m²) liegt 18% über dem Münchner Retail-Benchmark für Stadtrandlage (26,8 €/m²). Prüfung der Mietvertragslaufzeit empfohlen.',
        confidence: 'Hoch', deviationPercent: 18.3, benchmarkLabel: 'München Einzelhandel – Stadtrand',
        benchmarkValue: 26.8, userValue: 31.7, generatedAt: '2024-12-22T09:00:00', isAlert: true,
      },
    ],
  },
];

// ─── Market Locations ─────────────────────────────────────────────────────────

export const mockMarketLocations: MarketLocation[] = [
  {
    id: 'loc-berlin',
    city: 'Berlin',
    submarket: 'Prenzlauer Berg / Pankow',
    region: 'Berlin-Brandenburg',
    lastUpdated: '2024-12-15',
    benchmarks: [
      {
        id: 'bm-berlin-wohnen', locationId: 'loc-berlin', usageType: 'Wohnen',
        rentMin: 13.5, rentMax: 18.5, rentMedian: 15.2,
        purchasePriceMin: 4_500, purchasePriceMax: 7_200, purchasePriceMedian: 5_800,
        multiplierMin: 19, multiplierMax: 24, multiplierMedian: 21,
        vacancyRatePercent: 1.2, confidenceScore: 88,
        sourceLabel: 'JLL Wohnmarktreport Q4/2024', lastUpdated: '2024-12-15',
        notes: 'Mietpreisbremse aktiv. Neuvermietung an Mietspiegel orientiert.',
      },
      {
        id: 'bm-berlin-buero', locationId: 'loc-berlin', usageType: 'Büro',
        rentMin: 18.0, rentMax: 35.0, rentMedian: 25.5,
        purchasePriceMin: 8_000, purchasePriceMax: 16_000, purchasePriceMedian: 11_500,
        multiplierMin: 16, multiplierMax: 26, multiplierMedian: 20,
        vacancyRatePercent: 5.8, confidenceScore: 75,
        sourceLabel: 'CBRE Office Market Berlin Q3/2024', lastUpdated: '2024-11-30',
      },
    ],
    updateLog: [
      { id: 'ul-berlin-1', locationId: 'loc-berlin', timestamp: '2024-12-15T10:00:00', updatedBy: 'M. Wagner', changes: 'Wohnmarkt-Mieten Q4/2024 aktualisiert', sourceLabel: 'JLL Report' },
      { id: 'ul-berlin-2', locationId: 'loc-berlin', timestamp: '2024-11-30T14:00:00', updatedBy: 'System', changes: 'Büromarkt Q3/2024 importiert', sourceLabel: 'CBRE' },
    ],
  },
  {
    id: 'loc-frankfurt',
    city: 'Frankfurt am Main',
    submarket: 'CBD / Bankenviertel',
    region: 'Rhein-Main',
    lastUpdated: '2024-12-10',
    benchmarks: [
      {
        id: 'bm-frankfurt-buero', locationId: 'loc-frankfurt', usageType: 'Büro',
        rentMin: 22.0, rentMax: 48.0, rentMedian: 32.5,
        purchasePriceMin: 10_000, purchasePriceMax: 22_000, purchasePriceMedian: 15_000,
        multiplierMin: 14, multiplierMax: 22, multiplierMedian: 17.5,
        vacancyRatePercent: 8.2, confidenceScore: 82,
        sourceLabel: 'Savills Office Frankfurt Q4/2024', lastUpdated: '2024-12-10',
      },
      {
        id: 'bm-frankfurt-wohnen', locationId: 'loc-frankfurt', usageType: 'Wohnen',
        rentMin: 14.0, rentMax: 22.0, rentMedian: 17.5,
        purchasePriceMin: 5_000, purchasePriceMax: 9_500, purchasePriceMedian: 7_200,
        multiplierMin: 20, multiplierMax: 26, multiplierMedian: 22.5,
        vacancyRatePercent: 1.8, confidenceScore: 80,
        sourceLabel: 'empirica Wohnmarkt Rhein-Main Q3/2024', lastUpdated: '2024-11-15',
      },
    ],
    updateLog: [
      { id: 'ul-ffm-1', locationId: 'loc-frankfurt', timestamp: '2024-12-10T09:00:00', updatedBy: 'S. Klein', changes: 'Büromieten Savills Q4/2024', sourceLabel: 'Savills' },
    ],
  },
  {
    id: 'loc-muenchen',
    city: 'München',
    submarket: 'Stadtrand Nord',
    region: 'Oberbayern',
    lastUpdated: '2024-12-20',
    benchmarks: [
      {
        id: 'bm-munich-wohnen', locationId: 'loc-muenchen', usageType: 'Wohnen',
        rentMin: 17.0, rentMax: 28.0, rentMedian: 22.0,
        purchasePriceMin: 8_500, purchasePriceMax: 16_000, purchasePriceMedian: 12_000,
        multiplierMin: 25, multiplierMax: 38, multiplierMedian: 30,
        vacancyRatePercent: 0.8, confidenceScore: 90,
        sourceLabel: 'CBRE Wohnmarkt München Q4/2024', lastUpdated: '2024-12-20',
      },
      {
        id: 'bm-munich-retail', locationId: 'loc-muenchen', usageType: 'Einzelhandel',
        rentMin: 18.0, rentMax: 38.0, rentMedian: 26.8,
        purchasePriceMin: 5_500, purchasePriceMax: 12_000, purchasePriceMedian: 8_500,
        multiplierMin: 12, multiplierMax: 18, multiplierMedian: 14.5,
        vacancyRatePercent: 6.5, confidenceScore: 65,
        sourceLabel: 'BNP Paribas Retail München Q3/2024', lastUpdated: '2024-12-01',
        notes: 'Stadtrand-Einzelhandel unter Druck durch E-Commerce.',
      },
    ],
    updateLog: [
      { id: 'ul-muc-1', locationId: 'loc-muenchen', timestamp: '2024-12-20T11:00:00', updatedBy: 'M. Wagner', changes: 'Wohnmarkt Q4/2024', sourceLabel: 'CBRE' },
    ],
  },
  {
    id: 'loc-hamburg',
    city: 'Hamburg',
    submarket: 'Hafen / HafenCity',
    region: 'Metropolregion Hamburg',
    lastUpdated: '2024-11-25',
    benchmarks: [
      {
        id: 'bm-hamburg-logistik', locationId: 'loc-hamburg', usageType: 'Logistik',
        rentMin: 6.5, rentMax: 9.5, rentMedian: 7.8,
        purchasePriceMin: 1_200, purchasePriceMax: 2_200, purchasePriceMedian: 1_700,
        multiplierMin: 13, multiplierMax: 19, multiplierMedian: 16,
        vacancyRatePercent: 2.5, confidenceScore: 78,
        sourceLabel: 'JLL Industrial Hamburg Q3/2024', lastUpdated: '2024-11-25',
      },
    ],
    updateLog: [
      { id: 'ul-hh-1', locationId: 'loc-hamburg', timestamp: '2024-11-25T14:00:00', updatedBy: 'System', changes: 'Logistikmarkt Q3/2024', sourceLabel: 'JLL' },
    ],
  },
];

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const mockAuditLog: AuditLogEntry[] = [
  { id: 'audit-001', action: 'Asset erstellt', entityType: 'Asset', entityId: 'asset-001', entityName: 'Westend Plaza', user: 'M. Wagner', timestamp: '2021-03-15T10:00:00', details: 'Asset nach Closing in Bestand überführt.' },
  { id: 'audit-002', action: 'Dokument hochgeladen', entityType: 'Document', entityId: 'doc-001-3', entityName: 'Wertgutachten 2023.pdf', user: 'M. Wagner', timestamp: '2023-11-20T14:00:00', details: 'Gutachten für Asset Westend Plaza.' },
  { id: 'audit-003', action: 'Marktdaten aktualisiert', entityType: 'MarketData', entityId: 'loc-berlin', entityName: 'Berlin – Prenzlauer Berg', user: 'M. Wagner', timestamp: '2024-12-15T10:00:00', details: 'JLL Wohnmarktreport Q4/2024 importiert.' },
  { id: 'audit-004', action: 'AI Empfehlungen generiert', entityType: 'AI', entityId: 'deal-001', entityName: 'Prenzlauer Berg Portfolio', user: 'System', timestamp: '2024-12-15T11:00:00', details: '3 Empfehlungen basierend auf Marktdaten generiert.' },
  { id: 'audit-005', action: 'Export erstellt', entityType: 'Export', entityId: 'deal-001', entityName: 'Prenzlauer Berg Portfolio', user: 'M. Wagner', timestamp: '2024-12-16T09:00:00', details: 'Investment Memo als PDF exportiert.' },
];

// ─── Mock Developments ────────────────────────────────────────────────────────

export const mockDevelopments: DevelopmentProject[] = [
  {
    id: 'dev-001',
    dealId: 'deal-001',
    name: 'Prenzlauer Berg Revitalisierung',
    address: 'Schönhauser Allee 82',
    city: 'Berlin',
    zip: '10439',
    usageType: 'Wohnen',
    developmentType: 'Kernsanierung',
    status: 'Bau',
    totalArea: 3280,
    startDate: '2024-06-01',
    plannedEndDate: '2025-12-31',
    purchasePrice: 13_800_000,
    totalBudget: 2_850_000,
    completenessScore: 68,
    projectedSalePrice: 19_500_000,
    holdSellDecision: 'Offen',
    images: [],
    documents: [
      { id: 'dev-doc-001', assetId: 'dev-001', name: 'Baugenehmigung Berlin.pdf', category: 'Sonstiges', uploadDate: '2024-05-15', fileSize: '3.2 MB', tags: ['Genehmigung'], uploadedBy: 'M. Wagner' },
      { id: 'dev-doc-002', assetId: 'dev-001', name: 'Grundriss EG – Stand 05.2024.pdf', category: 'Sonstiges', uploadDate: '2024-05-20', fileSize: '8.1 MB', tags: ['Plan', 'Grundriss'], uploadedBy: 'S. Klein' },
    ],
    activityLog: [
      { id: 'dev-act-001', type: 'Status', title: 'Bau gestartet', description: 'Rohbauarbeiten haben begonnen. GU: Bauer Bau GmbH.', timestamp: '2024-06-01T08:00:00', user: 'M. Wagner' },
      { id: 'dev-act-002', type: 'Note', title: 'Elektro-Vergabe', description: 'Auftrag an ElektroMax GmbH vergeben. Starttermin: 01.09.2024', timestamp: '2024-08-15T10:30:00', user: 'M. Wagner' },
    ],
    advisorMessages: [
      { id: 'adv-001', role: 'advisor', content: 'Für eine Kernsanierung eines Berliner Gründerzeitgebäudes (3.280 m² Wohnfläche) empfehle ich folgende Kostenpositionen. Basierend auf aktuellen Berliner Benchmarks (Q4/2024):', timestamp: '2024-04-01T10:00:00' },
      { id: 'adv-002', role: 'user', content: 'Das Gebäude hat 5 Etagen, Baujahr 1905. Komplette Entkernung geplant, neue TGA, neue Fenster, Dachsanierung.', timestamp: '2024-04-01T09:55:00' },
    ],
    underwritingCashFlows: [
      { year: 1, noi: 280_000, debtService: 210_000, netCashFlow: 70_000 },
      { year: 2, noi: 420_000, debtService: 210_000, netCashFlow: 210_000 },
      { year: 3, noi: 520_000, debtService: 210_000, netCashFlow: 310_000 },
      { year: 4, noi: 545_000, debtService: 210_000, netCashFlow: 335_000 },
      { year: 5, noi: 565_000, debtService: 210_000, netCashFlow: 355_000 },
      { year: 6, noi: 580_000, debtService: 210_000, netCashFlow: 370_000 },
      { year: 7, noi: 595_000, debtService: 210_000, netCashFlow: 385_000 },
      { year: 8, noi: 610_000, debtService: 210_000, netCashFlow: 400_000 },
      { year: 9, noi: 625_000, debtService: 210_000, netCashFlow: 415_000 },
      { year: 10, noi: 640_000, debtService: 210_000, netCashFlow: 430_000 },
    ],
    gewerke: [
      { id: 'gw-001', developmentId: 'dev-001', category: 'Abbruch & Entsorgung', description: 'Komplettentkernung inkl. Entsorgung', unit: 'Pauschal', quantity: 1, underwritingBudget: 120_000, benchmarkPerUnit: 120_000, offerAmount: 115_000, contractAmount: 115_000, actualCost: 108_000, contractorId: 'contact-001', status: 'Abgeschlossen', ganttStart: '2024-06', ganttDurationMonths: 2 },
      { id: 'gw-002', developmentId: 'dev-001', category: 'Rohbau', description: 'Mauerwerk, Decken, Treppenhaus, Estrich', unit: 'm²', quantity: 3280, underwritingBudget: 480_000, benchmarkPerUnit: 146, offerAmount: 495_000, contractAmount: 488_000, actualCost: 412_000, contractorId: 'contact-002', status: 'Vergeben', ganttStart: '2024-07', ganttDurationMonths: 5 },
      { id: 'gw-003', developmentId: 'dev-001', category: 'Dach & Abdichtung', description: 'Neueindeckung + Dampfsperre + Dämmung', unit: 'Pauschal', quantity: 1, underwritingBudget: 185_000, benchmarkPerUnit: 185_000, offerAmount: 192_000, contractAmount: 190_000, status: 'Vergeben', ganttStart: '2024-09', ganttDurationMonths: 2 },
      { id: 'gw-004', developmentId: 'dev-001', category: 'Fenster & Türen', description: 'Holz-Alu Fenster 3-fach, Wohnungstüren', unit: 'Stk', quantity: 84, underwritingBudget: 210_000, benchmarkPerUnit: 2500, offerAmount: 218_000, status: 'Angebot', ganttStart: '2024-10', ganttDurationMonths: 3 },
      { id: 'gw-005', developmentId: 'dev-001', category: 'TGA – Heizung', description: 'Wärmepumpe + Fußbodenheizung', unit: 'Pauschal', quantity: 1, underwritingBudget: 320_000, benchmarkPerUnit: 320_000, status: 'Ausgeschrieben', ganttStart: '2024-11', ganttDurationMonths: 3 },
      { id: 'gw-006', developmentId: 'dev-001', category: 'TGA – Sanitär', description: 'Bäder komplett, Steigstränge', unit: 'Pauschal', quantity: 1, underwritingBudget: 245_000, benchmarkPerUnit: 245_000, status: 'Offen', ganttStart: '2025-01', ganttDurationMonths: 4 },
      { id: 'gw-007', developmentId: 'dev-001', category: 'TGA – Elektro', description: 'Neuverkabelung, Verteilungen, Smart Home vorbereitet', unit: 'Pauschal', quantity: 1, underwritingBudget: 180_000, benchmarkPerUnit: 180_000, contractorId: 'contact-003', status: 'Vergeben', ganttStart: '2024-09', ganttDurationMonths: 5 },
      { id: 'gw-008', developmentId: 'dev-001', category: 'Innenausbau', description: 'Trockenbau, Bodenbeläge, Malerarbeiten', unit: 'm²', quantity: 3280, underwritingBudget: 420_000, benchmarkPerUnit: 128, status: 'Offen', ganttStart: '2025-02', ganttDurationMonths: 5 },
      { id: 'gw-009', developmentId: 'dev-001', category: 'Planung & Architektur', description: 'Architekt, Statik, TGA-Planung, Bauleitung', unit: 'Pauschal', quantity: 1, underwritingBudget: 280_000, benchmarkPerUnit: 280_000, contractAmount: 275_000, contractorId: 'contact-004', status: 'Vergeben', ganttStart: '2024-01', ganttDurationMonths: 24 },
      { id: 'gw-010', developmentId: 'dev-001', category: 'Reserve / Unvorhergesehenes', description: '10% Reserve', unit: 'Pauschal', quantity: 1, underwritingBudget: 280_000, status: 'Offen' },
    ],
    notes: 'Gründerzeitgebäude 1905. Alle 5 Etagen werden entkernt. Ziel: 32 moderne Wohneinheiten nach Fertigstellung.',
  },
];

export const mockSales: SaleObject[] = [
  {
    id: 'sale-001',
    sourceType: 'Asset',
    sourceId: 'asset-003',
    name: 'Hafenviertel Logistik — Verkauf',
    address: 'Am Lagerhaus 15',
    city: 'Hamburg',
    zip: '20457',
    usageType: 'Logistik',
    status: 'Aktiv',
    targetPrice: 27_500_000,
    minimumPrice: 25_000_000,
    askingPrice: 28_000_000,
    totalCost: 22_000_000,
    annualRent: 1_080_000,
    area: 12_000,
    noi: 920_000,
    images: [],
    documents: [
      { id: 'sale-doc-001', assetId: 'sale-001', name: 'Exposé Hafenviertel.pdf', category: 'Sonstiges', uploadDate: '2024-12-01', fileSize: '4.5 MB', tags: ['Exposé', 'Verkauf'], uploadedBy: 'M. Wagner' },
    ],
    buyers: [
      { id: 'buyer-001', saleId: 'sale-001', name: 'Klaus Bergmann', company: 'Logistics RE Fund', email: 'k.bergmann@logfund.de', phone: '+49 40 1234567', dealType: 'Investment',
    stage: 'Due Diligence', offeredPrice: 26_800_000, notes: 'Sehr ernsthafter Interessent. DD läuft seit 01.12.', lastContact: '2024-12-18', createdAt: '2024-11-15' },
      { id: 'buyer-002', saleId: 'sale-001', name: 'Sarah Müller', company: 'Industriepark GmbH', email: 's.mueller@ipgmbh.de', stage: 'NDA', notes: 'NDA unterzeichnet. Besichtigung geplant.', lastContact: '2024-12-10', createdAt: '2024-12-05' },
    ],
    activityLog: [
      { id: 'sale-act-001', type: 'Status', title: 'Vermarktung gestartet', description: 'Exposé veröffentlicht. JLL als Makler mandatiert.', timestamp: '2024-11-01T09:00:00', user: 'M. Wagner' },
      { id: 'sale-act-002', type: 'Note', title: 'Angebot Bergmann', description: 'Angebot 26,8M eingegangen. Über Minimum, Verhandlung läuft.', timestamp: '2024-12-15T14:00:00', user: 'M. Wagner' },
    ],
    createdAt: '2024-11-01',
    updatedAt: '2024-12-18',
    notes: 'Verkauf aufgrund DSCR-Breach und strategischer Portfoliobereinigung.',
  },
];

export const mockContacts: Contact[] = [
  { id: 'contact-001', category: 'Handwerker', subcategory: 'Rohbau', firstName: 'Thomas', lastName: 'Bauer', company: 'Bauer Bau GmbH', position: 'Geschäftsführer', email: 't.bauer@bauerbau.de', phone: '+49 30 1234567', city: 'Berlin', createdAt: '2024-05-01', updatedAt: '2024-05-01', linkedObjectIds: ['dev-001'], tags: ['Zuverlässig', 'Berlin'] },
  { id: 'contact-002', category: 'Handwerker', subcategory: 'Rohbau', firstName: 'Karl', lastName: 'Meister', company: 'Meister Rohbau AG', email: 'k.meister@meister-rohbau.de', phone: '+49 30 9876543', city: 'Berlin', createdAt: '2024-06-01', updatedAt: '2024-06-01', linkedObjectIds: ['dev-001'] },
  { id: 'contact-003', category: 'Handwerker', subcategory: 'Elektro', firstName: 'Max', lastName: 'Volt', company: 'ElektroMax GmbH', email: 'm.volt@elektromax.de', phone: '+49 30 5551234', city: 'Berlin', createdAt: '2024-08-01', updatedAt: '2024-08-01', linkedObjectIds: ['dev-001'] },
  { id: 'contact-004', category: 'Architekt & Planer', firstName: 'Anna', lastName: 'Braun', company: 'Braun Architekten', position: 'Partnerin', email: 'a.braun@braun-arch.de', phone: '+49 30 2223344', city: 'Berlin', website: 'www.braun-architekten.de', createdAt: '2024-03-01', updatedAt: '2024-03-01', linkedObjectIds: ['dev-001'], tags: ['Wohnbau', 'Denkmalschutz'] },
  { id: 'contact-005', category: 'Banker & Finanzierer', firstName: 'Stefan', lastName: 'Kredit', company: 'Deutsche Pfandbriefbank', position: 'Relationship Manager', email: 's.kredit@dpfb.de', phone: '+49 89 1112233', city: 'München', createdAt: '2021-01-01', updatedAt: '2024-01-01', linkedObjectIds: ['asset-001'] },
  { id: 'contact-006', category: 'Makler', firstName: 'Julia', lastName: 'Immо', company: 'JLL Deutschland', position: 'Senior Broker', email: 'j.immo@jll.de', phone: '+49 69 2223344', city: 'Frankfurt', createdAt: '2024-11-01', updatedAt: '2024-11-01', linkedObjectIds: ['sale-001'] },
  { id: 'contact-007', category: 'Potentieller Käufer', firstName: 'Klaus', lastName: 'Bergmann', company: 'Logistics RE Fund', email: 'k.bergmann@logfund.de', phone: '+49 40 1234567', city: 'Hamburg', createdAt: '2024-11-15', updatedAt: '2024-12-18', linkedObjectIds: ['sale-001'] },
  { id: 'contact-008', category: 'Mieter', firstName: 'Hans', lastName: 'Logistik', company: 'LogisTrans GmbH', position: 'Geschäftsführer', email: 'h.logistik@logistrans.de', phone: '+49 40 9988776', city: 'Hamburg', createdAt: '2022-06-01', updatedAt: '2022-06-01', linkedObjectIds: ['asset-003'] },
];

import type {
  PropertyData,
  AcquisitionCostItem,
  RentRollUnit,
  GewerkePosition,
  FinancingTranche,
  PropertyMarketAssumptions,
} from '../models/types';

// ── IRR helper (Newton-Raphson) ──
function computeIRR(cashFlows: number[]): number {
  let rate = 0.1;
  for (let i = 0; i < 200; i++) {
    let npv = 0;
    let dnpv = 0;
    cashFlows.forEach((cf, t) => {
      npv += cf / Math.pow(1 + rate, t);
      dnpv -= t * cf / Math.pow(1 + rate, t + 1);
    });
    if (Math.abs(npv) < 0.01) break;
    if (dnpv === 0) break;
    rate = rate - npv / dnpv;
    if (rate < -0.99) { rate = -0.99; break; }
    if (rate > 10) { rate = 10; break; }
  }
  return isNaN(rate) ? 0 : rate * 100;
}

// ── Core helpers ──

export function computeTotalAcquisitionCosts(purchasePrice: number, costItems: AcquisitionCostItem[]): number {
  const totalPercent = costItems.filter(c => c.active).reduce((sum, c) => sum + c.percent, 0);
  return purchasePrice * totalPercent / 100;
}

export function computeWALT(units: RentRollUnit[], referenceDate: string): number {
  const ref = new Date(referenceDate);
  let weightedSum = 0;
  let totalArea = 0;
  units.forEach(u => {
    if (u.leaseEnd && u.tenant) {
      const end = new Date(u.leaseEnd);
      const remainingYears = Math.max(0, (end.getTime() - ref.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      weightedSum += u.area * remainingYears;
      totalArea += u.area;
    }
  });
  return totalArea > 0 ? weightedSum / totalArea : 0;
}

export function computeTotalArea(units: RentRollUnit[]): number {
  return units.reduce((sum, u) => sum + u.area, 0);
}

export function computeAnnualRent(units: RentRollUnit[]): number {
  return units.reduce((sum, u) => sum + u.monthlyRent, 0) * 12;
}

export function computeWeightedERV(units: RentRollUnit[]): number {
  const totalArea = computeTotalArea(units);
  if (totalArea === 0) return 0;
  return units.reduce((sum, u) => sum + u.ervPerSqm * u.area, 0) / totalArea;
}

export function computeTotalNonRecoverableFromRentRoll(units: RentRollUnit[]): number {
  return units.reduce((sum, u) => sum + u.nonRecoverableOpex, 0) * 12;
}

export function computeTotalDevBudget(gewerke: GewerkePosition[], contingencyPercent: number): number {
  const base = gewerke.reduce((sum, g) => sum + g.budgetTotal, 0);
  return base * (1 + contingencyPercent / 100);
}

export function computeTotalCapitalRequirement(pd: PropertyData): number {
  const acqCosts = computeTotalAcquisitionCosts(pd.purchasePrice, pd.acquisitionCosts);
  const devBudget = pd.dealType === 'Development'
    ? computeTotalDevBudget(pd.gewerke, pd.contingencyPercent)
    : 0;
  return pd.purchasePrice + acqCosts + devBudget;
}

export function computeTotalLoan(tranches: FinancingTranche[]): number {
  return tranches.reduce((sum, t) => sum + t.loanAmount, 0);
}

export function computeEquity(pd: PropertyData): number {
  return computeTotalCapitalRequirement(pd) - computeTotalLoan(pd.financingTranches);
}

export function computeTrancheDebtService(tranche: FinancingTranche): number {
  const interest = tranche.loanAmount * tranche.interestRate / 100;
  const repayment = tranche.repaymentType === 'Endfällig'
    ? 0
    : tranche.loanAmount * tranche.amortizationRate / 100;
  return interest + repayment;
}

export function computeTotalDebtService(tranches: FinancingTranche[]): number {
  return tranches.reduce((sum, t) => sum + computeTrancheDebtService(t), 0);
}

export function computeAnnuity(loanAmount: number, interestRatePct: number, loanTermYears: number): number {
  const r = interestRatePct / 100;
  if (r === 0 || loanTermYears === 0) return loanTermYears > 0 ? loanAmount / loanTermYears : 0;
  return loanAmount * (r * Math.pow(1 + r, loanTermYears)) / (Math.pow(1 + r, loanTermYears) - 1);
}

// ── NOI Calculation ──

export interface PropertyNOI {
  grossRentalIncome: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  nonRecoverableFromRentRoll: number;
  managementCost: number;
  maintenanceReserve: number;
  insurance: number;
  propertyTax: number;
  otherOpex: number;
  totalOperatingExpenses: number;
  otherIncome: number;
  noi: number;
}

export function computePropertyNOI(pd: PropertyData, useTargetRents: boolean): PropertyNOI {
  const units = useTargetRents
    ? (pd.unitsTarget.length > 0 ? pd.unitsTarget : pd.unitsAsIs)
    : pd.unitsAsIs;
  const area = computeTotalArea(units);
  const grossRent = computeAnnualRent(units);
  const vacancy = grossRent * pd.operatingCosts.vacancyRatePercent / 100;
  const egi = grossRent - vacancy;
  const nkFromRentRoll = computeTotalNonRecoverableFromRentRoll(units);
  const mgmt = grossRent * pd.operatingCosts.managementCostPercent / 100;
  const maintenance = area * pd.operatingCosts.maintenanceReservePerSqm;
  const insurance = pd.operatingCosts.insurancePerYear;
  const propTax = pd.operatingCosts.propertyTaxPerYear;
  const otherOpex = pd.operatingCosts.otherOpexPerYear;
  const totalOpex = nkFromRentRoll + mgmt + maintenance + insurance + propTax + otherOpex;
  const otherIncome = pd.operatingCosts.otherIncomePerYear;
  const noi = egi + otherIncome - totalOpex;

  return {
    grossRentalIncome: grossRent,
    vacancyLoss: vacancy,
    effectiveGrossIncome: egi,
    nonRecoverableFromRentRoll: nkFromRentRoll,
    managementCost: mgmt,
    maintenanceReserve: maintenance,
    insurance,
    propertyTax: propTax,
    otherOpex,
    totalOperatingExpenses: totalOpex,
    otherIncome,
    noi,
  };
}

// ── Exit Value ──

export function computeExitValue(
  pd: PropertyData,
  exitYear: number,
  developmentEndYear: number
): number {
  const targetUnits = pd.unitsTarget.length > 0 ? pd.unitsTarget : pd.unitsAsIs;
  const noiBase = computePropertyNOI(pd, true);
  const opexRatio = noiBase.grossRentalIncome > 0
    ? noiBase.totalOperatingExpenses / noiBase.grossRentalIncome
    : 0.25;

  const byUsage: Record<string, { area: number; ervPerSqmWeighted: number }> = {};
  targetUnits.forEach(u => {
    if (!byUsage[u.usageType]) byUsage[u.usageType] = { area: 0, ervPerSqmWeighted: 0 };
    byUsage[u.usageType].area += u.area;
    byUsage[u.usageType].ervPerSqmWeighted += u.ervPerSqm * u.area;
  });

  let totalExitValue = 0;

  for (const [usage, data] of Object.entries(byUsage)) {
    const weightedErv = data.area > 0 ? data.ervPerSqmWeighted / data.area : 0;
    const marketAssumption = pd.marketAssumptions.perUsageType.find(m => m.usageType === usage);
    const ervGrowth = marketAssumption?.ervGrowthRatePercent ?? 2.0;
    const exitCap = marketAssumption?.exitCapRatePercent ?? 5.0;

    const yearsOfGrowth = exitYear - developmentEndYear;
    const futureErvPerSqm = weightedErv * Math.pow(1 + ervGrowth / 100, Math.max(0, yearsOfGrowth));
    const futureAnnualRent = data.area * futureErvPerSqm * 12;
    const futureNOIAnteil = futureAnnualRent * (1 - opexRatio);
    const teilwert = exitCap > 0 ? futureNOIAnteil / (exitCap / 100) : 0;
    totalExitValue += teilwert;
  }

  return totalExitValue;
}

// ── Cashflow Table ──

export interface PropertyCashFlowYear {
  yearIndex: number;
  calendarYear: number;
  grossRentalIncome: number;
  operatingCosts: number;
  capexConstructionCosts: number;
  noi: number;
  acquisitionPrice: number;
  acquisitionCosts: number;
  salesProceeds: number;
  salesCosts: number;
  transactionsCashflow: number;
  loanReceived: number;
  interestPayments: number;
  loanRepayments: number;
  debtCashflow: number;
  freeCashflow: number;
  cumulativeFreeCashflow: number;
}

export function computePropertyCashFlow(pd: PropertyData): PropertyCashFlowYear[] {
  const years: PropertyCashFlowYear[] = [];
  const holdYears = pd.holdingPeriodYears || 10;
  const acqDate = new Date(pd.acquisitionDate || new Date().toISOString());
  const startYear = acqDate.getFullYear();

  const isDev = pd.dealType === 'Development';
  const devStartDate = pd.projectStart ? new Date(pd.projectStart) : acqDate;
  const lastGewerkEndWeek = pd.gewerke.length > 0
    ? Math.max(...pd.gewerke.map(g => g.startWeek + g.durationWeeks))
    : 0;
  const devEndDate = new Date(devStartDate);
  devEndDate.setDate(devEndDate.getDate() + lastGewerkEndWeek * 7);
  const devEndYear = isDev ? devEndDate.getFullYear() - startYear : 0;

  const noiIst = computePropertyNOI(pd, false);
  const noiZiel = computePropertyNOI(pd, true);

  const trancheBalances = pd.financingTranches.map(t => ({ ...t, outstanding: t.loanAmount }));
  const totalAcqCosts = computeTotalAcquisitionCosts(pd.purchasePrice, pd.acquisitionCosts);

  const capexPerYear = new Array(holdYears + 2).fill(0);
  if (isDev) {
    pd.gewerke.forEach(g => {
      const gStartDate = new Date(devStartDate);
      gStartDate.setDate(gStartDate.getDate() + (g.startWeek - 1) * 7);
      const gEndDate = new Date(gStartDate);
      gEndDate.setDate(gEndDate.getDate() + g.durationWeeks * 7);

      for (let yr = 0; yr <= holdYears; yr++) {
        const yearStart = new Date(startYear + yr, 0, 1);
        const yearEnd = new Date(startYear + yr, 11, 31);
        const overlapStart = Math.max(gStartDate.getTime(), yearStart.getTime());
        const overlapEnd = Math.min(gEndDate.getTime(), yearEnd.getTime());
        if (overlapEnd <= overlapStart) continue;
        const overlapWeeks = (overlapEnd - overlapStart) / (7 * 24 * 60 * 60 * 1000);
        const totalWeeks = g.durationWeeks;
        if (totalWeeks === 0) continue;

        let yearFraction: number;
        switch (g.costDistribution) {
          case 'vorauszahlung':
            yearFraction = yr === (gStartDate.getFullYear() - startYear) ? 1 : 0;
            break;
          case 'endfällig':
            yearFraction = yr === (gEndDate.getFullYear() - startYear) ? 1 : 0;
            break;
          default:
            yearFraction = overlapWeeks / totalWeeks;
        }
        capexPerYear[yr] += g.budgetTotal * yearFraction;
      }
    });

    const contingencyMultiplier = 1 + pd.contingencyPercent / 100;
    for (let i = 0; i < capexPerYear.length; i++) {
      capexPerYear[i] *= contingencyMultiplier;
    }
  }

  const exitValue = computeExitValue(pd, holdYears, devEndYear);
  const salesCostAmount = exitValue * pd.marketAssumptions.salesCostPercent / 100;

  let cumulativeCF = 0;

  for (let yr = 0; yr <= holdYears; yr++) {
    const calYear = startYear + yr;

    let grossRent = 0;
    if (isDev && yr <= devEndYear) {
      pd.unitsAsIs.forEach(u => {
        if (u.tenant && u.leaseEnd) {
          const leaseEndDate = new Date(u.leaseEnd);
          if (leaseEndDate.getFullYear() >= calYear) {
            const indexedRent = u.monthlyRent * Math.pow(1 + u.indexationRate / 100, yr);
            grossRent += indexedRent * 12;
          }
        }
      });
    } else {
      const targetUnits = pd.unitsTarget.length > 0 ? pd.unitsTarget : pd.unitsAsIs;
      const yearsPostCompletion = yr - devEndYear;
      targetUnits.forEach(u => {
        const mietbeginn = u.leaseStart ? new Date(u.leaseStart) : devEndDate;
        if (mietbeginn.getFullYear() <= calYear) {
          const marketAssumption = pd.marketAssumptions.perUsageType.find(m => m.usageType === u.usageType);
          const growth = marketAssumption?.ervGrowthRatePercent ?? 2.0;
          const indexedRent = u.monthlyRent * Math.pow(1 + growth / 100, Math.max(0, yearsPostCompletion));
          grossRent += indexedRent * 12;
        }
      });
    }

    const baseOpex = isDev && yr <= devEndYear
      ? noiIst.totalOperatingExpenses * (grossRent / Math.max(noiIst.grossRentalIncome, 1))
      : noiZiel.totalOperatingExpenses;
    const indexedOpex = baseOpex * Math.pow(1 + pd.marketAssumptions.opexInflationPercent / 100, yr);
    const noi = grossRent - indexedOpex;
    const capex = capexPerYear[yr] || 0;

    const isAcqYear = yr === 0;
    const isExitYear = yr === holdYears;
    const acqPrice = isAcqYear ? -pd.purchasePrice : 0;
    const acqCosts = isAcqYear ? -totalAcqCosts : 0;
    const salesProc = isExitYear ? exitValue : 0;
    const salesCost = isExitYear ? -salesCostAmount : 0;
    const txCF = acqPrice + acqCosts + salesProc + salesCost;

    const loanReceived = isAcqYear ? computeTotalLoan(pd.financingTranches) : 0;
    let totalInterest = 0;
    let totalRepayment = 0;
    trancheBalances.forEach(t => {
      if (yr > 0 && t.outstanding > 0 && yr <= t.loanTerm) {
        const interest = t.outstanding * t.interestRate / 100;
        const repayment = t.repaymentType === 'Endfällig'
          ? (yr === t.loanTerm ? t.outstanding : 0)
          : t.outstanding * t.amortizationRate / 100;
        totalInterest += interest;
        totalRepayment += repayment;
        t.outstanding = Math.max(0, t.outstanding - repayment);
      }
    });
    const debtCF = loanReceived - totalInterest - totalRepayment;
    const freeCF = noi - capex + txCF + debtCF;
    cumulativeCF += freeCF;

    years.push({
      yearIndex: yr,
      calendarYear: calYear,
      grossRentalIncome: grossRent,
      operatingCosts: indexedOpex,
      capexConstructionCosts: capex,
      noi,
      acquisitionPrice: acqPrice,
      acquisitionCosts: acqCosts,
      salesProceeds: salesProc,
      salesCosts: salesCost,
      transactionsCashflow: txCF,
      loanReceived,
      interestPayments: -totalInterest,
      loanRepayments: -totalRepayment,
      debtCashflow: debtCF,
      freeCashflow: freeCF,
      cumulativeFreeCashflow: cumulativeCF,
    });
  }

  return years;
}

// ── KPI Calculation ──

export interface PropertyKPIs {
  niyAtAcquisition: number;
  multiple: number;
  dscr: number;
  ltv: number;
  cashOnCashYear1: number;
  gri: number;
  noiIst: number;
  noiZiel: number;
  irr10Year: number;
  equityMultiple10Year: number;
  irrDevelopment: number | null;
  developmentProfit: number;
  profitOnCost: number;
  netDevelopmentYield: number;
  cashOnCash10YearAvg: number;
  peakEquity: number;
  paybackPeriodYears: number;
}

export function computePropertyKPIs(pd: PropertyData): PropertyKPIs {
  const cashflows = computePropertyCashFlow(pd);
  const noiIstObj = computePropertyNOI(pd, false);
  const noiZielObj = computePropertyNOI(pd, true);
  const totalAcqCosts = computeTotalAcquisitionCosts(pd.purchasePrice, pd.acquisitionCosts);
  const totalDevBudget = pd.dealType === 'Development'
    ? computeTotalDevBudget(pd.gewerke, pd.contingencyPercent)
    : 0;
  const totalCapReq = computeTotalCapitalRequirement(pd);
  const totalLoan = computeTotalLoan(pd.financingTranches);
  const equity = Math.max(totalCapReq - totalLoan, 1);
  const totalDebtService = computeTotalDebtService(pd.financingTranches);
  const totalCostBasis = pd.purchasePrice + totalAcqCosts + totalDevBudget;

  const irr10 = computeIRR(cashflows.map(cf => cf.freeCashflow));

  const totalReturn = cashflows.reduce((sum, cf) => sum + cf.freeCashflow, 0);
  const equityMultiple = equity > 0 ? (equity + totalReturn) / equity : 0;

  let irrDev: number | null = null;
  let devProfit = 0;
  const devEndYear = pd.dealType === 'Development'
    ? Math.ceil(pd.gewerke.length > 0
        ? Math.max(...pd.gewerke.map(g => (g.startWeek + g.durationWeeks) * 7 / 365))
        : 2)
    : 0;

  if (pd.dealType === 'Development' && devEndYear > 0) {
    const exitValueAtCompletion = computeExitValue(pd, devEndYear + 1, devEndYear);
    const devCashflows = cashflows.slice(0, devEndYear + 2).map(cf => cf.freeCashflow);
    if (devCashflows.length > 0) {
      devCashflows[devCashflows.length - 1] += exitValueAtCompletion;
    }
    irrDev = computeIRR(devCashflows);

    const finCostsDuringDev = cashflows.slice(0, devEndYear + 1)
      .reduce((sum, cf) => sum + Math.abs(cf.interestPayments), 0);
    devProfit = exitValueAtCompletion - pd.purchasePrice - totalAcqCosts - totalDevBudget - finCostsDuringDev;
  }

  const profitOnCost = totalCostBasis > 0 ? (devProfit / totalCostBasis) * 100 : 0;
  const netDevYield = totalCostBasis > 0 ? (noiZielObj.noi / totalCostBasis) * 100 : 0;

  const annualCoC = cashflows.slice(1).map(cf => {
    const cashAfterDebt = cf.noi + cf.debtCashflow;
    return equity > 0 ? (cashAfterDebt / equity) * 100 : 0;
  });
  const avgCoC = annualCoC.length > 0 ? annualCoC.reduce((s, v) => s + v, 0) / annualCoC.length : 0;

  let peakEquity = 0;
  let paybackYear = pd.holdingPeriodYears;
  cashflows.forEach(cf => {
    if (cf.cumulativeFreeCashflow < peakEquity) peakEquity = cf.cumulativeFreeCashflow;
    if (cf.cumulativeFreeCashflow > 0 && cf.yearIndex < paybackYear) paybackYear = cf.yearIndex;
  });

  return {
    niyAtAcquisition: pd.purchasePrice > 0 ? (noiIstObj.noi / pd.purchasePrice) * 100 : 0,
    multiple: noiIstObj.grossRentalIncome > 0 ? pd.purchasePrice / noiIstObj.grossRentalIncome : 0,
    dscr: totalDebtService > 0 ? noiZielObj.noi / totalDebtService : 999,
    ltv: totalCapReq > 0 ? (totalLoan / totalCapReq) * 100 : 0,
    cashOnCashYear1: equity > 0 ? ((noiIstObj.noi - totalDebtService) / equity) * 100 : 0,
    gri: noiZielObj.grossRentalIncome,
    noiIst: noiIstObj.noi,
    noiZiel: noiZielObj.noi,
    irr10Year: irr10,
    equityMultiple10Year: equityMultiple,
    irrDevelopment: irrDev,
    developmentProfit: devProfit,
    profitOnCost,
    netDevelopmentYield: netDevYield,
    cashOnCash10YearAvg: avgCoC,
    peakEquity: Math.abs(peakEquity),
    paybackPeriodYears: paybackYear,
  };
}

// ── Market Assumptions from Rent Roll ──

export function buildMarketAssumptionsFromRentRoll(
  units: RentRollUnit[],
  existing: PropertyMarketAssumptions,
  defaultErvGrowth: (u: string) => number,
  defaultExitCap: (u: string) => number,
): PropertyMarketAssumptions {
  const usageTypes = Array.from(new Set(units.map(u => u.usageType)));
  const perUsageType = usageTypes.map(usage => {
    const existingEntry = existing.perUsageType.find(e => e.usageType === usage);
    const usageUnits = units.filter(u => u.usageType === usage);
    const totalArea = usageUnits.reduce((s, u) => s + u.area, 0);
    const ervFromRentRoll = totalArea > 0
      ? usageUnits.reduce((s, u) => s + u.ervPerSqm * u.area, 0) / totalArea
      : 0;
    const exitCapRate = existingEntry?.exitCapRatePercent ?? defaultExitCap(usage);
    return {
      usageType: usage,
      ervFromRentRoll,
      ervGrowthRatePercent: existingEntry?.ervGrowthRatePercent ?? defaultErvGrowth(usage),
      exitCapRatePercent: exitCapRate,
      exitMultiplier: exitCapRate > 0 ? 100 / exitCapRate : 20,
      aiSuggested: existingEntry?.aiSuggested,
    };
  });
  return { ...existing, perUsageType };
}

export function computeOccupancyRate(units: RentRollUnit[]): number {
  if (units.length === 0) return 0;
  const occupiedArea = units.filter(u => u.tenant).reduce((s, u) => s + u.area, 0);
  const totalArea = computeTotalArea(units);
  return totalArea > 0 ? occupiedArea / totalArea : 0;
}

// ── Formatting helpers ──
export function fmtEur(value: number): string {
  if (value === 0) return '—';
  return `€ ${Math.round(value).toLocaleString('de-DE')}`;
}

export function fmtPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

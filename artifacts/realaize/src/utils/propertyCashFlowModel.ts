import type { Asset } from '../models/types';
import { computeAssetNOI } from './kpiEngine';
import { calculateIRR, calculateNPV } from './irrCalculator';

// ══════════════════════════════════════════════════════════
// PROPERTY CASHFLOW MODEL — annual DCF over holding period
// ══════════════════════════════════════════════════════════

export interface AnnualPropertyCashFlow {
  year: number;
  grossRent: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  managementCost: number;
  maintenanceReserve: number;
  nonRecoverableOpex: number;
  noi: number;
  debtService: number;
  leveredCashFlow: number;
  cumulative: number;
}

export interface PropertyCashFlowResult {
  annualRows: AnnualPropertyCashFlow[];
  terminalValue: number;
  exitCapRate: number;
  holdingPeriodYears: number;
  totalEquityInvested: number;
  unleveredIRR: number;     // IRR on total asset cost (NOI + terminal)
  leveredIRR: number;       // IRR on equity (levered CF + terminal - debt repaid)
  unleveredNPV: number;     // NPV at hurdle rate
  equityMultiple: number;
  totalNOI: number;
  totalDebtService: number;
}

interface ComputeOptions {
  holdingPeriodYears?: number;
  exitCapRate?: number;        // % — if 0 uses asset field or default
  hurdleRate?: number;         // % for NPV, default 8
  annualDebtService?: number;  // annual total debt service (interest + amort)
  equityInvested?: number;     // equity (purchase price + costs - loan)
}

export function computePropertyCashFlow(
  asset: Asset,
  opts: ComputeOptions = {}
): PropertyCashFlowResult {
  const holdingPeriodYears = opts.holdingPeriodYears ?? asset.holdingPeriodYears ?? 10;
  const exitCap = (opts.exitCapRate && opts.exitCapRate > 0)
    ? opts.exitCapRate
    : (asset.exitCapRate ?? 5.0);
  const hurdleRate = opts.hurdleRate ?? 8.0;
  const annualDebtService = opts.annualDebtService ?? 0;

  // Derive equity
  const totalDebt = asset.debtInstruments.reduce((s, d) => s + d.outstandingAmount, 0);
  const equityInvested = opts.equityInvested ?? (asset.currentValue - totalDebt);

  // Growth rates
  const rentGrowth = (asset.operatingCosts.rentalGrowthRate ?? 2.0) / 100;
  const ervGrowth = rentGrowth; // simplification — can extend

  // Year-1 base from asset NOI
  const baseNOI = computeAssetNOI(asset);

  const annualRows: AnnualPropertyCashFlow[] = [];
  const unleveredFlows: number[] = [];
  const leveredFlows: number[] = [];

  let cumulative = 0;

  for (let year = 1; year <= holdingPeriodYears; year++) {
    const g = Math.pow(1 + rentGrowth, year - 1);
    const grossRent = baseNOI.grossRent * g;
    const vacancyLoss = grossRent * (asset.operatingCosts.vacancyRatePercent / 100);
    const effectiveGrossIncome = grossRent - vacancyLoss + baseNOI.noi - (baseNOI.effectiveGrossIncome - baseNOI.totalOperatingExpenses);
    // Recompute properly:
    const mgmtCost = grossRent * (asset.operatingCosts.managementCostPercent / 100);
    const maintenance = asset.operatingCosts.maintenanceReservePerSqm * asset.lettableArea;
    const nonRecOpex = asset.operatingCosts.nonRecoverableOpex;
    const otherIncome = asset.operatingCosts.otherOperatingIncome ?? 0;
    const egi = grossRent - vacancyLoss + otherIncome;
    const noi = egi - mgmtCost - maintenance - nonRecOpex;
    const leveredCF = noi - annualDebtService;

    cumulative += leveredCF;

    annualRows.push({
      year,
      grossRent,
      vacancyLoss,
      effectiveGrossIncome: egi,
      managementCost: mgmtCost,
      maintenanceReserve: maintenance,
      nonRecoverableOpex: nonRecOpex,
      noi,
      debtService: annualDebtService,
      leveredCashFlow: leveredCF,
      cumulative,
    });

    unleveredFlows.push(noi);
    leveredFlows.push(leveredCF);
  }

  // Terminal value at exit cap rate based on last-year NOI
  const lastYearNOI = annualRows[holdingPeriodYears - 1].noi;
  const terminalValue = exitCap > 0 ? (lastYearNOI / (exitCap / 100)) : 0;

  // Total equity returned = levered CFs + terminal value - remaining debt at exit
  const remainingDebt = totalDebt * Math.pow(1 - (asset.debtInstruments[0]?.amortizationRate ?? 2) / 100, holdingPeriodYears);
  const equityAtExit = terminalValue - remainingDebt;

  // IRR calculations
  const unleveredWithTerminal = [...unleveredFlows];
  unleveredWithTerminal[unleveredWithTerminal.length - 1] += terminalValue;

  const leveredWithTerminal = [...leveredFlows];
  leveredWithTerminal[leveredWithTerminal.length - 1] += equityAtExit;

  const investmentBase = asset.purchasePrice;
  const unleveredIRR = unleveredFlows.length > 0
    ? calculateIRR(unleveredWithTerminal, investmentBase)
    : 0;

  const leveredIRR = leveredFlows.length > 0 && equityInvested > 0
    ? calculateIRR(leveredWithTerminal, equityInvested)
    : 0;

  const unleveredNPV = calculateNPV(unleveredWithTerminal, hurdleRate);

  const totalNOI = annualRows.reduce((s, r) => s + r.noi, 0);
  const totalDebtService = annualDebtService * holdingPeriodYears;

  const totalReturns = totalNOI + terminalValue;
  const equityMultiple = equityInvested > 0 ? (equityInvested + totalNOI - totalDebtService + equityAtExit) / equityInvested : 0;

  return {
    annualRows,
    terminalValue,
    exitCapRate: exitCap,
    holdingPeriodYears,
    totalEquityInvested: equityInvested,
    unleveredIRR,
    leveredIRR,
    unleveredNPV,
    equityMultiple,
    totalNOI,
    totalDebtService,
  };
}

// ══════════════════════════════════════════════════════════
// DEAL-LEVEL CASHFLOW (from underwriting, pre-acquisition)
// ══════════════════════════════════════════════════════════

import type { UnderwritingAssumptions, FinancingAssumptions } from '../models/types';
import { computeDealKPIs } from './kpiEngine';

export interface DealAnnualCashFlow {
  year: number;
  grossRent: number;
  vacancyLoss: number;
  egi: number;
  noi: number;
  annualDebtService: number;
  leveredCashFlow: number;
  cumulative: number;
}

export interface DealCashFlowResult {
  annualRows: DealAnnualCashFlow[];
  terminalValue: number;
  exitCapRate: number;
  holdingPeriodYears: number;
  equityInvested: number;
  unleveredIRR: number;
  leveredIRR: number;
  equityMultiple: number;
}

export function computeDealCashFlow(
  uw: UnderwritingAssumptions,
  fin: FinancingAssumptions
): DealCashFlowResult {
  const kpis = computeDealKPIs(uw, fin);
  const ma = uw.marketAssumptions || { rentGrowthRate: 2, exitCapRate: 5, holdingPeriodYears: 10, ervGrowthRate: 2, rentalGrowthRate: 2 };
  const holdingPeriod = ma.holdingPeriodYears || 10;
  const exitCap = ma.exitCapRate || 5.0;
  const rentGrowthRate = (ma.rentalGrowthRate || 2.0) / 100;

  const rows: DealAnnualCashFlow[] = [];
  const unleveredFlows: number[] = [];
  const leveredFlows: number[] = [];
  let cumulative = 0;

  for (let year = 1; year <= holdingPeriod; year++) {
    const g = Math.pow(1 + rentGrowthRate, year - 1);
    const grossRent = uw.annualGrossRent * g;
    const vacancyLoss = grossRent * (uw.vacancyRatePercent / 100);
    const egi = grossRent - vacancyLoss + uw.otherOperatingIncome;
    const mgmt = grossRent * (uw.managementCostPercent / 100);
    const maint = uw.maintenanceReservePerSqm * uw.area;
    const noi = egi - mgmt - maint - uw.nonRecoverableOpex;
    const debtService = kpis.annualDebtService;
    const levered = noi - debtService;
    cumulative += levered;

    rows.push({ year, grossRent, vacancyLoss, egi, noi, annualDebtService: debtService, leveredCashFlow: levered, cumulative });
    unleveredFlows.push(noi);
    leveredFlows.push(levered);
  }

  const lastNOI = rows[holdingPeriod - 1].noi;
  const terminalValue = exitCap > 0 ? lastNOI / (exitCap / 100) : 0;

  const unleveredWithTV = [...unleveredFlows];
  unleveredWithTV[unleveredWithTV.length - 1] += terminalValue;

  const equityAtExit = terminalValue - fin.loanAmount;
  const leveredWithTV = [...leveredFlows];
  leveredWithTV[leveredWithTV.length - 1] += equityAtExit;

  const unleveredIRR = calculateIRR(unleveredWithTV, uw.purchasePrice);
  const leveredIRR = kpis.equityInvested > 0 ? calculateIRR(leveredWithTV, kpis.equityInvested) : 0;

  const totalLevered = leveredFlows.reduce((s, f) => s + f, 0) + equityAtExit;
  const equityMultiple = kpis.equityInvested > 0 ? (kpis.equityInvested + totalLevered) / kpis.equityInvested : 0;

  return {
    annualRows: rows,
    terminalValue,
    exitCapRate: exitCap,
    holdingPeriodYears: holdingPeriod,
    equityInvested: kpis.equityInvested,
    unleveredIRR,
    leveredIRR,
    equityMultiple,
  };
}

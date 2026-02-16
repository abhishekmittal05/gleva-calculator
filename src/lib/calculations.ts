// Gleva Profit Calculator - Core Calculation Engine
//
// GST LOGIC (SP is always INCLUSIVE of GST):
//
// UNIFIED FORMULA for all non-settlement platforms:
//   GST output = SP × gst/(100+gst)          (extract GST from inclusive SP)
//   GST input on fees:
//     - Fees EXCLUSIVE of tax (Amazon, Blinkit): fees × gst%  (you pay GST on fees, get input credit)
//     - Fees INCLUSIVE of tax (all others):      fees × gst/(100+gst)  (extract GST inside fees)
//   Net GST = GST output - GST input on fees
//   Net received:
//     - Fees EXCLUSIVE: SP - fees - tax on fees - discount  (we pay fees + GST on top)
//     - Fees INCLUSIVE:  SP - fees - discount               (fees already include GST)
//   Profit = Net received - cost - Net GST - ads - returns
//
// FIXED SETTLEMENT (Myntra, Flipkart):
//   GST = settlement × gst/(100+gst)
//   Profit = (settlement - GST) - cost
//
// Cost is always EXCLUSIVE of GST (raw product cost)

export interface SKU {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  gstPercent: number;
  weight: number;
  mrp: number;
  sellingPrice: number;
  notes?: string;
  platformPricing: {
    [platformId: string]: {
      mrp: number;
      sellingPrice: number;
      settlement?: number;
      returnPercent?: number;
      monthlyVolume?: number;
    };
  };
}

export interface CalculationResult {
  platformId: string;
  platformName: string;
  mrp: number;
  sellingPrice: number;
  settlement?: number;
  commission: number;
  commissionLabel: string;
  discount: number;
  shippingFee: number;
  storageFee: number;
  closingFee: number;
  pickAndPackFee: number;
  totalPlatformFees: number;
  netReceived: number;
  productCost: number;
  gstOutput: number;
  gstInputOnCost: number;
  gstInputOnFees: number;
  netGST: number;
  adsCost: number;
  returnCost: number;
  profit: number;
  profitMargin: number;
  monthlyVolume: number;
  monthlyProfit: number;
}

// Fee change log
export interface FeeChangeLog {
  id: string;
  platformId: string;
  platformName: string;
  field: string;
  oldValue: number;
  newValue: number;
  date: string;
}

// Monthly snapshot
export interface MonthlySnapshot {
  id: string;
  month: string; // YYYY-MM
  date: string;
  globalAdsPercent: number;
  platformData: {
    [platformId: string]: {
      adsPercent: number;
      commissionPercent?: number;
    };
  };
  skuResults: {
    skuId: string;
    skuName: string;
    skuCode: string;
    platforms: {
      platformId: string;
      profit: number;
      margin: number;
      volume: number;
      monthlyProfit: number;
    }[];
  }[];
}

// App settings
export interface AppSettings {
  minMarginAlert: number; // minimum acceptable margin %
  darkMode: boolean;
}

interface FeeBreakdown {
  commission: number;
  commissionLabel: string;
  closingFee: number;
  shippingFee: number;
  pickAndPackFee: number;
  discount: number;
  storageFee: number;
}

function calculateAmazonFBA(sp: number, mrp: number): FeeBreakdown {
  let commissionRate = 0;
  let commission = 0;
  if (sp < 300) {
    commissionRate = 0;
    commission = 0;
  } else if (sp < 500) {
    commissionRate = 5;
    commission = sp * 0.05;
  } else {
    commissionRate = 9;
    commission = sp * 0.09;
  }

  let closingFee = 0;
  if (sp < 500) {
    closingFee = 12;
  } else {
    closingFee = 25;
  }

  return {
    commission,
    commissionLabel: `Referral Fee (${commissionRate}%)`,
    closingFee,
    shippingFee: 42,
    pickAndPackFee: 17,
    discount: 0,
    storageFee: 0,
  };
}

function calculateBlinkit(sp: number): FeeBreakdown {
  let commissionRate = 0;
  if (sp >= 0 && sp <= 500) commissionRate = 2;
  else if (sp >= 501 && sp <= 700) commissionRate = 6;
  else if (sp >= 701 && sp <= 900) commissionRate = 13;
  else if (sp >= 901 && sp <= 1200) commissionRate = 16;
  else commissionRate = 18;

  return {
    commission: sp * (commissionRate / 100),
    commissionLabel: `Commission (${commissionRate}%)`,
    closingFee: 0,
    shippingFee: 50,
    pickAndPackFee: 0,
    discount: 0,
    storageFee: sp * 0.19,
  };
}

function calculateSPCommission(sp: number, commissionPercent: number): FeeBreakdown {
  return {
    commission: sp * (commissionPercent / 100),
    commissionLabel: `Commission (${commissionPercent}%)`,
    closingFee: 0, shippingFee: 0, pickAndPackFee: 0, discount: 0, storageFee: 0,
  };
}

function calculateMRPCommission(sp: number, mrp: number, commissionPercent: number): FeeBreakdown {
  return {
    commission: mrp * (commissionPercent / 100),
    commissionLabel: `Commission (${commissionPercent}% on MRP)`,
    closingFee: 0, shippingFee: 0, pickAndPackFee: 0,
    discount: mrp - sp,
    storageFee: 0,
  };
}

export interface PlatformDefinition {
  id: string;
  name: string;
  type: 'amazon_fba' | 'blinkit' | 'sp_commission' | 'mrp_commission' | 'zero_commission' | 'fixed_settlement';
  commissionPercent?: number;
  adsPercent: number;
  feesExclTax?: boolean; // true = fees are exclusive of tax (Amazon, Blinkit), false = inclusive
}

export const DEFAULT_PLATFORMS: PlatformDefinition[] = [
  { id: 'amazon_fba', name: 'Amazon FBA', type: 'amazon_fba', adsPercent: 0, feesExclTax: true },
  { id: 'rk_world', name: 'RK World', type: 'sp_commission', commissionPercent: 32, adsPercent: 0, feesExclTax: false },
  { id: 'blinkit', name: 'Blinkit', type: 'blinkit', adsPercent: 0, feesExclTax: true },
  { id: 'zepto', name: 'Zepto', type: 'mrp_commission', commissionPercent: 36, adsPercent: 0, feesExclTax: false },
  { id: 'instamart', name: 'Instamart', type: 'sp_commission', commissionPercent: 35, adsPercent: 0, feesExclTax: false },
  { id: 'firstcry', name: 'FirstCry', type: 'sp_commission', commissionPercent: 35, adsPercent: 0, feesExclTax: false },
  { id: 'nykaa', name: 'Nykaa', type: 'mrp_commission', commissionPercent: 38, adsPercent: 0, feesExclTax: false },
  { id: 'meesho', name: 'Meesho', type: 'zero_commission', commissionPercent: 0, adsPercent: 0, feesExclTax: false },
  { id: 'myntra', name: 'Myntra', type: 'fixed_settlement', adsPercent: 0 },
  { id: 'flipkart', name: 'Flipkart', type: 'fixed_settlement', adsPercent: 0 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  minMarginAlert: 15,
  darkMode: false,
};

export function calculateProfit(
  sku: SKU,
  platform: PlatformDefinition,
  globalAdsPercent?: number
): CalculationResult {
  const platformPricing = sku.platformPricing[platform.id];
  const mrp = platformPricing?.mrp || sku.mrp;
  const sp = platformPricing?.sellingPrice || sku.sellingPrice;
  const settlement = platformPricing?.settlement;
  const returnPercent = platformPricing?.returnPercent || 0;
  const adsPercent = platform.adsPercent || globalAdsPercent || 0;
  const gstRate = sku.gstPercent / 100; // e.g. 0.18
  const monthlyVolume = platformPricing?.monthlyVolume || 0;
  const productCost = sku.costPrice; // exclusive of GST

  // ============================================
  // FIXED SETTLEMENT (Myntra, Flipkart)
  // GST = settlement × gst/(100+gst)
  // Profit = (settlement - GST) - cost
  // ============================================
  if (platform.type === 'fixed_settlement' && settlement !== undefined) {
    const gstOutput = settlement * gstRate / (1 + gstRate);
    const gstInputOnCost = 0;
    const gstInputOnFees = 0;
    const netGST = gstOutput;
    const adsCost = settlement * (adsPercent / 100);
    const returnCost = settlement * (returnPercent / 100);
    const profit = settlement - gstOutput - productCost - adsCost - returnCost;
    const profitMargin = settlement > 0 ? (profit / settlement) * 100 : 0;

    return {
      platformId: platform.id, platformName: platform.name, mrp, sellingPrice: sp, settlement,
      commission: 0, commissionLabel: 'Fixed Settlement', discount: 0,
      shippingFee: 0, storageFee: 0, closingFee: 0, pickAndPackFee: 0,
      totalPlatformFees: 0, netReceived: settlement, productCost,
      gstOutput, gstInputOnCost, gstInputOnFees, netGST,
      adsCost, returnCost, profit, profitMargin,
      monthlyVolume, monthlyProfit: profit * monthlyVolume,
    };
  }

  // ============================================
  // ALL OTHER PLATFORMS — Unified formula
  // GST output = SP × gst/(100+gst)
  // GST input on fees:
  //   Exclusive (Amazon/Blinkit): fees × gst%
  //   Inclusive (all others):     fees × gst/(100+gst)
  // Net GST = output - input on fees
  // Profit = netReceived - cost - netGST - ads - returns
  // ============================================
  let fees: FeeBreakdown;
  switch (platform.type) {
    case 'amazon_fba': fees = calculateAmazonFBA(sp, mrp); break;
    case 'blinkit': fees = calculateBlinkit(sp); break;
    case 'mrp_commission': fees = calculateMRPCommission(sp, mrp, platform.commissionPercent || 0); break;
    case 'zero_commission': fees = calculateSPCommission(sp, 0); break;
    case 'sp_commission': default: fees = calculateSPCommission(sp, platform.commissionPercent || 0); break;
  }

  const totalPlatformFees = fees.commission + fees.closingFee + fees.shippingFee + fees.pickAndPackFee + fees.storageFee;

  // GST output: always on SP (inclusive)
  const gstOutput = sp * gstRate / (1 + gstRate);

  // GST input on fees & net received
  let gstInputOnFees: number;
  let netReceived: number;
  if (platform.feesExclTax) {
    // Fees are EXCLUSIVE of tax — we pay fees + GST on fees
    // Input credit = fees × gst%
    // Net received = SP - (fees + tax on fees) - discount
    gstInputOnFees = totalPlatformFees * gstRate;
    netReceived = sp - totalPlatformFees - (totalPlatformFees * gstRate) - fees.discount;
  } else {
    // Fees are INCLUSIVE of tax — fees already contain GST
    // Extract GST from inside fees for input credit
    // Net received = SP - fees - discount (fees already include tax)
    gstInputOnFees = (totalPlatformFees + fees.discount) * gstRate / (1 + gstRate);
    netReceived = sp - totalPlatformFees - fees.discount;
  }

  const gstInputOnCost = 0;
  const netGST = gstOutput - gstInputOnFees;

  const adsCost = sp * (adsPercent / 100);
  const returnCost = netReceived * (returnPercent / 100);
  const profit = netReceived - productCost - netGST - adsCost - returnCost;
  const profitMargin = sp > 0 ? (profit / sp) * 100 : 0;

  return {
    platformId: platform.id, platformName: platform.name, mrp, sellingPrice: sp,
    commission: fees.commission, commissionLabel: fees.commissionLabel,
    discount: fees.discount, shippingFee: fees.shippingFee, storageFee: fees.storageFee,
    closingFee: fees.closingFee, pickAndPackFee: fees.pickAndPackFee,
    totalPlatformFees, netReceived, productCost,
    gstOutput, gstInputOnCost, gstInputOnFees, netGST,
    adsCost, returnCost, profit, profitMargin,
    monthlyVolume, monthlyProfit: profit * monthlyVolume,
  };
}

export function calculateAllPlatforms(
  sku: SKU, platforms: PlatformDefinition[], globalAdsPercent?: number
): CalculationResult[] {
  return platforms.map(platform => calculateProfit(sku, platform, globalAdsPercent));
}

// Break-even: find minimum SP for a target margin on a given platform
export function findBreakEvenSP(
  sku: SKU, platform: PlatformDefinition, targetMarginPercent: number, globalAdsPercent?: number
): number {
  // Binary search for the SP that gives targetMarginPercent
  let lo = 1, hi = 10000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const testSku = {
      ...sku,
      platformPricing: {
        ...sku.platformPricing,
        [platform.id]: { ...sku.platformPricing[platform.id], sellingPrice: mid, mrp: Math.max(mid, sku.mrp) },
      },
    };
    const result = calculateProfit(testSku, platform, globalAdsPercent);
    if (result.profitMargin < targetMarginPercent) lo = mid;
    else hi = mid;
  }
  return Math.ceil(hi);
}

// Simulate: calculate with a different SP without modifying actual data
export function simulatePrice(
  sku: SKU, platform: PlatformDefinition, newSP: number, newMRP?: number, globalAdsPercent?: number
): CalculationResult {
  const testSku = {
    ...sku,
    platformPricing: {
      ...sku.platformPricing,
      [platform.id]: {
        ...sku.platformPricing[platform.id],
        sellingPrice: newSP,
        mrp: newMRP || sku.platformPricing[platform.id]?.mrp || sku.mrp,
      },
    },
  };
  return calculateProfit(testSku, platform, globalAdsPercent);
}

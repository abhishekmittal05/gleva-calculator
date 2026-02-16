"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  SKU,
  PlatformDefinition,
  DEFAULT_PLATFORMS,
  calculateProfit,
  simulatePrice,
  findBreakEvenSP,
  CalculationResult,
} from "@/lib/calculations";
import { getSKUs, getPlatforms, getGlobalAdsPercent } from "@/lib/store";

export default function SimulatorPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>(DEFAULT_PLATFORMS);
  const [globalAdsPercent, setGlobalAdsPercent] = useState(0);
  const [selectedSkuId, setSelectedSkuId] = useState("");
  const [selectedPlatformId, setSelectedPlatformId] = useState("");
  const [simSP, setSimSP] = useState("");
  const [simMRP, setSimMRP] = useState("");
  const [targetMargin, setTargetMargin] = useState("15");
  const [loaded, setLoaded] = useState(false);

  const loadData = () => {
    const s = getSKUs();
    const p = getPlatforms();
    setSkus(s);
    setPlatforms(p);
    setGlobalAdsPercent(getGlobalAdsPercent());
    if (s.length > 0) setSelectedSkuId(s[0].id);
    if (p.length > 0) setSelectedPlatformId(p[0].id);
  };

  useEffect(() => {
    loadData();
    setLoaded(true);
    const handler = () => loadData();
    window.addEventListener('sheets-synced', handler);
    return () => window.removeEventListener('sheets-synced', handler);
  }, []);

  const selectedSku = useMemo(() => skus.find((s) => s.id === selectedSkuId), [skus, selectedSkuId]);
  const selectedPlatform = useMemo(
    () => platforms.find((p) => p.id === selectedPlatformId),
    [platforms, selectedPlatformId]
  );

  // Current result
  const currentResult = useMemo(() => {
    if (!selectedSku || !selectedPlatform) return null;
    return calculateProfit(selectedSku, selectedPlatform, globalAdsPercent);
  }, [selectedSku, selectedPlatform, globalAdsPercent]);

  // Simulated result
  const simResult = useMemo(() => {
    if (!selectedSku || !selectedPlatform) return null;
    const sp = parseFloat(simSP);
    const mrp = simMRP ? parseFloat(simMRP) : undefined;
    if (isNaN(sp) || sp <= 0) return null;
    return simulatePrice(selectedSku, selectedPlatform, sp, mrp, globalAdsPercent);
  }, [selectedSku, selectedPlatform, simSP, simMRP, globalAdsPercent]);

  // Break-even SP
  const breakEvenSP = useMemo(() => {
    if (!selectedSku || !selectedPlatform) return null;
    const margin = parseFloat(targetMargin);
    if (isNaN(margin)) return null;
    return findBreakEvenSP(selectedSku, selectedPlatform, margin, globalAdsPercent);
  }, [selectedSku, selectedPlatform, targetMargin, globalAdsPercent]);

  // Update sim fields when SKU/platform changes
  useEffect(() => {
    if (selectedSku && selectedPlatform) {
      const pp = selectedSku.platformPricing[selectedPlatform.id];
      setSimSP((pp?.sellingPrice || selectedSku.sellingPrice).toString());
      setSimMRP((pp?.mrp || selectedSku.mrp).toString());
    }
  }, [selectedSku, selectedPlatform]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Simulator</h1>
          <p className="text-sm text-gray-500 mt-1">
            What-if analysis &amp; break-even calculator
          </p>
        </div>
        <Link
          href="/"
          className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>

      {skus.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500 mb-2">No SKUs added yet.</p>
          <p className="text-sm text-gray-400">Go to the main dashboard to add products first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Select Product &amp; Platform</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">SKU</label>
                  <select
                    value={selectedSkuId}
                    onChange={(e) => setSelectedSkuId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {skus.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Platform</label>
                  <select
                    value={selectedPlatformId}
                    onChange={(e) => setSelectedPlatformId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {platforms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Simulate Price */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Simulate New Price</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">New Selling Price (₹)</label>
                  <input
                    type="number"
                    value={simSP}
                    onChange={(e) => setSimSP(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter new SP"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">New MRP (₹) — optional</label>
                  <input
                    type="number"
                    value={simMRP}
                    onChange={(e) => setSimMRP(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter new MRP"
                  />
                </div>
              </div>
            </div>

            {/* Break-even */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Break-even Calculator</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Target Margin (%)</label>
                  <input
                    type="number"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. 15"
                  />
                </div>
                {breakEvenSP !== null && (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <p className="text-xs text-teal-600 font-medium">
                      Minimum SP for {targetMargin}% margin:
                    </p>
                    <p className="text-2xl font-bold text-teal-700">
                      {"\u20B9"}{breakEvenSP}
                    </p>
                    <p className="text-xs text-teal-500 mt-1">
                      on {selectedPlatform?.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comparison Panel */}
          <div className="lg:col-span-2">
            {currentResult && (
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-4">
                  Side-by-Side Comparison
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-3 py-2 text-gray-600 font-medium">Metric</th>
                        <th className="text-right px-3 py-2 text-gray-600 font-medium">Current</th>
                        {simResult && (
                          <th className="text-right px-3 py-2 text-teal-600 font-medium">
                            Simulated
                          </th>
                        )}
                        {simResult && (
                          <th className="text-right px-3 py-2 text-gray-600 font-medium">
                            Change
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Selling Price", key: "sellingPrice", format: "currency" },
                        { label: "MRP", key: "mrp", format: "currency" },
                        { label: "Commission", key: "commission", format: "currency" },
                        { label: "Discount", key: "discount", format: "currency" },
                        { label: "Shipping Fee", key: "shippingFee", format: "currency" },
                        { label: "Storage Fee", key: "storageFee", format: "currency" },
                        { label: "Closing + Pick&Pack", key: "closingPickPack", format: "currency" },
                        { label: "Total Platform Fees", key: "totalPlatformFees", format: "currency" },
                        { label: "Net Received", key: "netReceived", format: "currency" },
                        { label: "Product Cost", key: "productCost", format: "currency" },
                        { label: "GST Output", key: "gstOutput", format: "currency" },
                        { label: "GST Input (Cost)", key: "gstInputOnCost", format: "currency" },
                        { label: "GST Input (Fees)", key: "gstInputOnFees", format: "currency" },
                        { label: "Net GST", key: "netGST", format: "currency" },
                        { label: "Ads Cost", key: "adsCost", format: "currency" },
                        { label: "Return Cost", key: "returnCost", format: "currency" },
                        { label: "Profit", key: "profit", format: "currency" },
                        { label: "Margin", key: "profitMargin", format: "percent" },
                      ].map((row) => {
                        const getCellValue = (r: CalculationResult): number => {
                          if (row.key === "closingPickPack")
                            return r.closingFee + r.pickAndPackFee;
                          return (r as unknown as Record<string, number>)[row.key] ?? 0;
                        };
                        const curVal = getCellValue(currentResult);
                        const simVal = simResult ? getCellValue(simResult) : 0;
                        const diff = simVal - curVal;
                        const isHighlight = row.key === "profit" || row.key === "profitMargin";
                        return (
                          <tr
                            key={row.key}
                            className={`border-b ${isHighlight ? "bg-gray-50 font-bold" : ""}`}
                          >
                            <td className="px-3 py-2 text-gray-700">{row.label}</td>
                            <td className="px-3 py-2 text-right">
                              {row.format === "currency"
                                ? `\u20B9${curVal.toFixed(2)}`
                                : `${curVal.toFixed(1)}%`}
                            </td>
                            {simResult && (
                              <td className="px-3 py-2 text-right text-teal-700">
                                {row.format === "currency"
                                  ? `\u20B9${simVal.toFixed(2)}`
                                  : `${simVal.toFixed(1)}%`}
                              </td>
                            )}
                            {simResult && (
                              <td
                                className={`px-3 py-2 text-right ${
                                  diff > 0
                                    ? "text-green-600"
                                    : diff < 0
                                    ? "text-red-600"
                                    : "text-gray-400"
                                }`}
                              >
                                {diff > 0 ? "+" : ""}
                                {row.format === "currency"
                                  ? `\u20B9${diff.toFixed(2)}`
                                  : `${diff.toFixed(1)}%`}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Quick Price Ladder */}
            {selectedSku && selectedPlatform && (
              <div className="bg-white rounded-lg shadow-sm border p-4 mt-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Price Ladder</h3>
                <p className="text-xs text-gray-500 mb-3">
                  See how profit changes at different price points
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-2 py-1.5 text-left text-gray-600">SP</th>
                        <th className="px-2 py-1.5 text-right text-gray-600">Fees</th>
                        <th className="px-2 py-1.5 text-right text-gray-600">Net Received</th>
                        <th className="px-2 py-1.5 text-right text-gray-600">GST</th>
                        <th className="px-2 py-1.5 text-right text-gray-600">Profit</th>
                        <th className="px-2 py-1.5 text-right text-gray-600">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const currentSP =
                          selectedSku.platformPricing[selectedPlatform.id]?.sellingPrice ||
                          selectedSku.sellingPrice;
                        const steps = [-200, -100, -50, 0, 50, 100, 200];
                        return steps.map((offset) => {
                          const testSP = currentSP + offset;
                          if (testSP <= 0) return null;
                          const r = simulatePrice(
                            selectedSku,
                            selectedPlatform,
                            testSP,
                            undefined,
                            globalAdsPercent
                          );
                          const isCurrent = offset === 0;
                          return (
                            <tr
                              key={offset}
                              className={`border-b ${
                                isCurrent ? "bg-blue-50 font-bold" : "hover:bg-gray-50"
                              }`}
                            >
                              <td className="px-2 py-1.5">
                                {"\u20B9"}{testSP}
                                {isCurrent && (
                                  <span className="text-blue-600 ml-1">(current)</span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 text-right text-red-600">
                                -{"\u20B9"}{(r.totalPlatformFees + r.discount).toFixed(0)}
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                {"\u20B9"}{r.netReceived.toFixed(0)}
                              </td>
                              <td className="px-2 py-1.5 text-right text-red-600">
                                {"\u20B9"}{r.netGST.toFixed(0)}
                              </td>
                              <td
                                className={`px-2 py-1.5 text-right font-bold ${
                                  r.profit >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {"\u20B9"}{r.profit.toFixed(0)}
                              </td>
                              <td
                                className={`px-2 py-1.5 text-right ${
                                  r.profitMargin >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {r.profitMargin.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        }).filter(Boolean);
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

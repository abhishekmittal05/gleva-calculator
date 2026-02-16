"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  SKU,
  PlatformDefinition,
  DEFAULT_PLATFORMS,
  calculateProfit,
  CalculationResult,
} from "@/lib/calculations";
import {
  getSKUs,
  getPlatforms,
  getGlobalAdsPercent,
} from "@/lib/store";

export default function MarketplacePage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>(DEFAULT_PLATFORMS);
  const [globalAdsPercent, setGlobalAdsPercent] = useState(0);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadData = () => {
    setSkus(getSKUs());
    const p = getPlatforms();
    setPlatforms(p);
    setGlobalAdsPercent(getGlobalAdsPercent());
    if (p.length > 0) setSelectedPlatformId(p[0].id);
  };

  useEffect(() => {
    loadData();
    setLoaded(true);
    const handler = () => loadData();
    window.addEventListener('sheets-synced', handler);
    return () => window.removeEventListener('sheets-synced', handler);
  }, []);

  const selectedPlatform = useMemo(
    () => platforms.find((p) => p.id === selectedPlatformId),
    [platforms, selectedPlatformId]
  );

  // Calculate profit for all SKUs on the selected platform
  const skuResults = useMemo(() => {
    if (!selectedPlatform) return [];
    return skus.map((sku) => ({
      sku,
      result: calculateProfit(sku, selectedPlatform, globalAdsPercent),
    }));
  }, [skus, selectedPlatform, globalAdsPercent]);

  // Filter by search
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return skuResults;
    const q = searchQuery.toLowerCase();
    return skuResults.filter(
      ({ sku }) =>
        sku.name.toLowerCase().includes(q) ||
        sku.sku.toLowerCase().includes(q)
    );
  }, [skuResults, searchQuery]);

  // Sort by profit descending
  const sortedResults = useMemo(
    () => [...filteredResults].sort((a, b) => b.result.profit - a.result.profit),
    [filteredResults]
  );

  // Summary stats
  const totalProfit = sortedResults.reduce((sum, r) => sum + r.result.profit, 0);
  const avgMargin =
    sortedResults.length > 0
      ? sortedResults.reduce((sum, r) => sum + r.result.profitMargin, 0) / sortedResults.length
      : 0;
  const profitableSKUs = sortedResults.filter((r) => r.result.profit > 0).length;

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace View</h1>
          <p className="text-sm text-gray-500 mt-1">
            View all SKUs on a specific marketplace
          </p>
        </div>
        <Link
          href="/"
          className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Marketplace
            </label>
            <select
              value={selectedPlatformId}
              onChange={(e) => setSelectedPlatformId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search SKU
            </label>
            <input
              type="text"
              placeholder="Search by name or SKU code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {selectedPlatform && sortedResults.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 mb-1">Total SKUs</p>
            <p className="text-2xl font-bold text-gray-900">{sortedResults.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 mb-1">Profitable SKUs</p>
            <p className="text-2xl font-bold text-green-600">{profitableSKUs}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 mb-1">Total Profit (all SKUs)</p>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {"\u20B9"}{totalProfit.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-xs text-gray-500 mb-1">Avg. Margin</p>
            <p className={`text-2xl font-bold ${avgMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
              {avgMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* SKU Table */}
      {skus.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500 mb-2">No SKUs added yet.</p>
          <p className="text-sm text-gray-400">
            Go to the main dashboard to add products first.
          </p>
        </div>
      ) : sortedResults.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500">No SKUs match your search.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Product Name</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">SKU</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Cost</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">SP / MRP</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Platform Fees</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Net Received</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Net GST</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Ads</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Profit</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Margin</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map(({ sku, result }, index) => (
                <SKURow key={sku.id} sku={sku} result={result} index={index + 1} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-gray-50 font-bold">
                <td className="px-3 py-2" colSpan={5}>
                  TOTAL ({sortedResults.length} SKUs)
                </td>
                <td className="px-3 py-2 text-right text-red-600">
                  -{"\u20B9"}
                  {sortedResults
                    .reduce((sum, r) => sum + r.result.totalPlatformFees + r.result.discount, 0)
                    .toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {"\u20B9"}
                  {sortedResults.reduce((sum, r) => sum + r.result.netReceived, 0).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-red-600">
                  {"\u20B9"}
                  {sortedResults.reduce((sum, r) => sum + r.result.netGST, 0).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-red-600">
                  {"\u20B9"}
                  {sortedResults.reduce((sum, r) => sum + r.result.adsCost, 0).toFixed(2)}
                </td>
                <td
                  className={`px-3 py-2 text-right ${
                    totalProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {"\u20B9"}{totalProfit.toFixed(2)}
                </td>
                <td
                  className={`px-3 py-2 text-right ${
                    avgMargin >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {avgMargin.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function SKURow({
  sku,
  result,
  index,
}: {
  sku: SKU;
  result: CalculationResult;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2 text-gray-400">{index}</td>
        <td className="px-3 py-2 font-medium">{sku.name}</td>
        <td className="px-3 py-2 text-gray-600">{sku.sku}</td>
        <td className="px-3 py-2 text-right">{"\u20B9"}{sku.costPrice}</td>
        <td className="px-3 py-2 text-right">
          {result.settlement
            ? `${"\u20B9"}${result.settlement} (settle)`
            : `${"\u20B9"}${result.sellingPrice} / ${"\u20B9"}${result.mrp}`}
        </td>
        <td className="px-3 py-2 text-right text-red-600">
          -{"\u20B9"}{(result.totalPlatformFees + result.discount).toFixed(2)}
        </td>
        <td className="px-3 py-2 text-right">{"\u20B9"}{result.netReceived.toFixed(2)}</td>
        <td className="px-3 py-2 text-right text-red-600">
          {"\u20B9"}{result.netGST.toFixed(2)}
        </td>
        <td className="px-3 py-2 text-right text-red-600">
          {result.adsCost > 0 ? `${"\u20B9"}${result.adsCost.toFixed(2)}` : "-"}
        </td>
        <td
          className={`px-3 py-2 text-right font-bold ${
            result.profit >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {"\u20B9"}{result.profit.toFixed(2)}
        </td>
        <td
          className={`px-3 py-2 text-right font-medium ${
            result.profitMargin >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {result.profitMargin.toFixed(1)}%
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={11} className="px-3 py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-white rounded p-2 border">
                <span className="text-gray-500">Commission</span>
                <p className="font-medium text-red-600">
                  -{"\u20B9"}{result.commission.toFixed(2)}
                </p>
                <p className="text-gray-400">{result.commissionLabel}</p>
              </div>
              {result.discount > 0 && (
                <div className="bg-white rounded p-2 border">
                  <span className="text-gray-500">Discount Deducted</span>
                  <p className="font-medium text-red-600">
                    -{"\u20B9"}{result.discount.toFixed(2)}
                  </p>
                </div>
              )}
              {result.shippingFee > 0 && (
                <div className="bg-white rounded p-2 border">
                  <span className="text-gray-500">Shipping</span>
                  <p className="font-medium text-red-600">
                    -{"\u20B9"}{result.shippingFee.toFixed(2)}
                  </p>
                </div>
              )}
              {result.storageFee > 0 && (
                <div className="bg-white rounded p-2 border">
                  <span className="text-gray-500">Storage</span>
                  <p className="font-medium text-red-600">
                    -{"\u20B9"}{result.storageFee.toFixed(2)}
                  </p>
                </div>
              )}
              {(result.closingFee > 0 || result.pickAndPackFee > 0) && (
                <div className="bg-white rounded p-2 border">
                  <span className="text-gray-500">Closing + Pick&amp;Pack</span>
                  <p className="font-medium text-red-600">
                    -{"\u20B9"}{(result.closingFee + result.pickAndPackFee).toFixed(2)}
                  </p>
                </div>
              )}
              <div className="bg-white rounded p-2 border">
                <span className="text-gray-500">GST Output (18% on SP)</span>
                <p className="font-medium text-red-600">{"\u20B9"}{result.gstOutput.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded p-2 border">
                <span className="text-gray-500">GST Input (Cost)</span>
                <p className="font-medium text-green-600">{"\u20B9"}{result.gstInputOnCost.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded p-2 border">
                <span className="text-gray-500">GST Input (Fees)</span>
                <p className="font-medium text-green-600">{"\u20B9"}{result.gstInputOnFees.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded p-2 border">
                <span className="text-gray-500">Net GST Payable</span>
                <p className="font-medium text-red-600">{"\u20B9"}{result.netGST.toFixed(2)}</p>
              </div>
              {result.returnCost > 0 && (
                <div className="bg-white rounded p-2 border">
                  <span className="text-gray-500">Return Cost</span>
                  <p className="font-medium text-red-600">
                    -{"\u20B9"}{result.returnCost.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

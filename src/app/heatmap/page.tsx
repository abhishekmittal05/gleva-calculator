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
import { getSKUs, getPlatforms, getGlobalAdsPercent } from "@/lib/store";

type MetricType = "profit" | "margin" | "monthlyProfit";

function getColor(value: number, metric: MetricType): string {
  if (metric === "margin") {
    if (value >= 30) return "bg-green-600 text-white";
    if (value >= 20) return "bg-green-400 text-white";
    if (value >= 10) return "bg-green-200 text-gray-900";
    if (value >= 0) return "bg-yellow-200 text-gray-900";
    if (value >= -10) return "bg-orange-300 text-gray-900";
    return "bg-red-500 text-white";
  }
  if (value > 100) return "bg-green-600 text-white";
  if (value > 50) return "bg-green-400 text-white";
  if (value > 0) return "bg-green-200 text-gray-900";
  if (value === 0) return "bg-gray-200 text-gray-600";
  if (value > -50) return "bg-orange-300 text-gray-900";
  return "bg-red-500 text-white";
}

export default function HeatmapPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>(DEFAULT_PLATFORMS);
  const [globalAdsPercent, setGlobalAdsPercent] = useState(0);
  const [metric, setMetric] = useState<MetricType>("profit");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSkus(getSKUs());
    setPlatforms(getPlatforms());
    setGlobalAdsPercent(getGlobalAdsPercent());
    setLoaded(true);
  }, []);

  const heatmapData = useMemo(() => {
    return skus.map((sku) => {
      const platformResults: { platform: PlatformDefinition; result: CalculationResult }[] = [];
      platforms.forEach((platform) => {
        const result = calculateProfit(sku, platform, globalAdsPercent);
        platformResults.push({ platform, result });
      });
      return { sku, platformResults };
    });
  }, [skus, platforms, globalAdsPercent]);

  // Find best platform per SKU
  const bestPlatforms = useMemo(() => {
    const map: Record<string, string> = {};
    heatmapData.forEach(({ sku, platformResults }) => {
      let best = platformResults[0];
      platformResults.forEach((pr) => {
        if (pr.result.profit > best.result.profit) best = pr;
      });
      if (best) map[sku.id] = best.platform.id;
    });
    return map;
  }, [heatmapData]);

  const getValue = (result: CalculationResult): number => {
    switch (metric) {
      case "profit": return result.profit;
      case "margin": return result.profitMargin;
      case "monthlyProfit": return result.monthlyProfit;
    }
  };

  const formatValue = (result: CalculationResult): string => {
    switch (metric) {
      case "profit": return `\u20B9${result.profit.toFixed(0)}`;
      case "margin": return `${result.profitMargin.toFixed(1)}%`;
      case "monthlyProfit": return `\u20B9${result.monthlyProfit.toFixed(0)}`;
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[95vw] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit Heatmap</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visual comparison of profitability across all SKUs and platforms
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
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Metric:</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricType)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="profit">Per-Unit Profit (₹)</option>
            <option value="margin">Profit Margin (%)</option>
            <option value="monthlyProfit">Monthly Profit (₹)</option>
          </select>
          <div className="flex items-center gap-2 ml-4 text-xs text-gray-500">
            <span className="inline-block w-4 h-4 rounded bg-green-600"></span> High
            <span className="inline-block w-4 h-4 rounded bg-green-200"></span> Good
            <span className="inline-block w-4 h-4 rounded bg-yellow-200"></span> Low
            <span className="inline-block w-4 h-4 rounded bg-orange-300"></span> Negative
            <span className="inline-block w-4 h-4 rounded bg-red-500"></span> Loss
            <span className="inline-block w-4 h-4 rounded bg-blue-100 border-2 border-blue-500 ml-2"></span> Best
          </div>
        </div>
      </div>

      {skus.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500 mb-2">No SKUs added yet.</p>
          <p className="text-sm text-gray-400">
            Go to the main dashboard to add products first.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2 font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[200px]">
                  SKU
                </th>
                {platforms.map((p) => (
                  <th
                    key={p.id}
                    className="text-center px-2 py-2 font-medium text-gray-600 min-w-[100px]"
                  >
                    <div className="text-xs leading-tight">{p.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map(({ sku, platformResults }) => (
                <tr key={sku.id} className="border-b">
                  <td className="px-3 py-2 sticky left-0 bg-white border-r">
                    <div className="font-medium text-gray-900 text-xs">{sku.name}</div>
                    <div className="text-xs text-gray-400">{sku.sku}</div>
                  </td>
                  {platformResults.map(({ platform, result }) => {
                    const val = getValue(result);
                    const isBest = bestPlatforms[sku.id] === platform.id;
                    return (
                      <td
                        key={platform.id}
                        className={`px-2 py-2 text-center text-xs font-bold ${getColor(val, metric)} ${
                          isBest ? "ring-2 ring-blue-500 ring-inset" : ""
                        }`}
                        title={`${sku.name} on ${platform.name}: Profit ₹${result.profit.toFixed(2)}, Margin ${result.profitMargin.toFixed(1)}%`}
                      >
                        {formatValue(result)}
                        {isBest && <div className="text-[10px] font-normal opacity-75">★ Best</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {heatmapData.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Platform Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {platforms.map((platform) => {
              const profits = heatmapData.map(({ platformResults }) => {
                const pr = platformResults.find((p) => p.platform.id === platform.id);
                return pr ? pr.result.profit : 0;
              });
              const avg = profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
              const profitable = profits.filter((p) => p > 0).length;
              return (
                <div key={platform.id} className="border rounded-lg p-3">
                  <p className="text-xs font-bold text-gray-700">{platform.name}</p>
                  <p className={`text-lg font-bold ${avg >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {"\u20B9"}{avg.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">avg profit/unit</p>
                  <p className="text-xs text-gray-400">
                    {profitable}/{profits.length} profitable
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

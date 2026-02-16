"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  SKU,
  PlatformDefinition,
  DEFAULT_PLATFORMS,
  calculateProfit,
  CalculationResult,
  AppSettings,
  DEFAULT_SETTINGS,
} from "@/lib/calculations";
import {
  getSKUs,
  getPlatforms,
  getGlobalAdsPercent,
  getSettings,
  saveSettings,
} from "@/lib/store";

export default function AlertsPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>(DEFAULT_PLATFORMS);
  const [globalAdsPercent, setGlobalAdsPercent] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState<"all" | "loss" | "low">("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSkus(getSKUs());
    setPlatforms(getPlatforms());
    setGlobalAdsPercent(getGlobalAdsPercent());
    setSettings(getSettings());
    setLoaded(true);
  }, []);

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // All alerts: SKU + platform combos below threshold
  const alerts = useMemo(() => {
    const result: {
      sku: SKU;
      platform: PlatformDefinition;
      calcResult: CalculationResult;
      severity: "loss" | "low";
    }[] = [];

    skus.forEach((sku) => {
      platforms.forEach((platform) => {
        const calcResult = calculateProfit(sku, platform, globalAdsPercent);
        if (calcResult.profitMargin < settings.minMarginAlert) {
          result.push({
            sku,
            platform,
            calcResult,
            severity: calcResult.profit < 0 ? "loss" : "low",
          });
        }
      });
    });

    return result.sort((a, b) => a.calcResult.profitMargin - b.calcResult.profitMargin);
  }, [skus, platforms, globalAdsPercent, settings.minMarginAlert]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;
    if (filterPlatform !== "all") {
      filtered = filtered.filter((a) => a.platform.id === filterPlatform);
    }
    if (filterSeverity !== "all") {
      filtered = filtered.filter((a) => a.severity === filterSeverity);
    }
    return filtered;
  }, [alerts, filterPlatform, filterSeverity]);

  const lossCount = alerts.filter((a) => a.severity === "loss").length;
  const lowMarginCount = alerts.filter((a) => a.severity === "low").length;

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
          <h1 className="text-2xl font-bold text-gray-900">Margin Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">
            SKUs below your minimum margin threshold
          </p>
        </div>
        <Link
          href="/"
          className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Alert Settings</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Minimum Margin Alert (%)
            </label>
            <input
              type="number"
              value={settings.minMarginAlert}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  minMarginAlert: parseFloat(e.target.value) || 0,
                })
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Dark Mode</label>
            <button
              onClick={() =>
                updateSettings({ ...settings, darkMode: !settings.darkMode })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.darkMode ? "bg-indigo-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.darkMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-gray-500 mb-1">Total Alerts</p>
          <p className="text-3xl font-bold text-gray-900">{alerts.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-gray-500 mb-1">Making Loss</p>
          <p className="text-3xl font-bold text-red-600">{lossCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-gray-500 mb-1">Low Margin</p>
          <p className="text-3xl font-bold text-yellow-600">{lowMarginCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-gray-500 mb-1">Min Threshold</p>
          <p className="text-3xl font-bold text-gray-900">{settings.minMarginAlert}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Platform</label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Platforms</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as "all" | "loss" | "low")}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All</option>
              <option value="loss">Loss Only</option>
              <option value="low">Low Margin Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      {alerts.length === 0 ? (
        <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-8 text-center">
          <p className="text-green-700 font-bold text-lg mb-1">All Clear!</p>
          <p className="text-green-600 text-sm">
            All SKU-platform combinations are above your {settings.minMarginAlert}% margin threshold.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Severity</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Product</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">SKU</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Platform</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">SP</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Cost</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Fees + Disc</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Profit</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Margin</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert, index) => (
                <tr
                  key={`${alert.sku.id}-${alert.platform.id}`}
                  className={`border-b ${
                    alert.severity === "loss" ? "bg-red-50" : "bg-yellow-50"
                  }`}
                >
                  <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        alert.severity === "loss"
                          ? "bg-red-200 text-red-800"
                          : "bg-yellow-200 text-yellow-800"
                      }`}
                    >
                      {alert.severity === "loss" ? "LOSS" : "LOW"}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{alert.sku.name}</td>
                  <td className="px-3 py-2 text-gray-500">{alert.sku.sku}</td>
                  <td className="px-3 py-2">{alert.platform.name}</td>
                  <td className="px-3 py-2 text-right">
                    {"\u20B9"}{alert.calcResult.sellingPrice}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {"\u20B9"}{alert.sku.costPrice}
                  </td>
                  <td className="px-3 py-2 text-right text-red-600">
                    -{"\u20B9"}
                    {(alert.calcResult.totalPlatformFees + alert.calcResult.discount).toFixed(2)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-bold ${
                      alert.calcResult.profit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {"\u20B9"}{alert.calcResult.profit.toFixed(2)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-bold ${
                      alert.calcResult.profitMargin >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {alert.calcResult.profitMargin.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 border-t">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </div>
        </div>
      )}
    </div>
  );
}

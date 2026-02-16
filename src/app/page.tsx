"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  SKU,
  PlatformDefinition,
  DEFAULT_PLATFORMS,
  calculateAllPlatforms,
  CalculationResult,
  AppSettings,
  DEFAULT_SETTINGS,
} from "@/lib/calculations";
import {
  getSKUs, saveSKUs, getPlatforms, savePlatforms,
  getGlobalAdsPercent, saveGlobalAdsPercent,
  addFeeChangeLog, getSettings, saveSettings,
  exportToCSV, downloadCSV, parseCSV,
} from "@/lib/store";

type Tab = "dashboard" | "skus" | "platforms";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [skus, setSkus] = useState<SKU[]>([]);
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>(DEFAULT_PLATFORMS);
  const [globalAdsPercent, setGlobalAdsPercent] = useState(0);
  const [selectedSkuId, setSelectedSkuId] = useState<string>("");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSkus(getSKUs());
    setPlatforms(getPlatforms());
    setGlobalAdsPercent(getGlobalAdsPercent());
    setSettings(getSettings());
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveSKUs(skus); }, [skus, loaded]);
  useEffect(() => { if (loaded) savePlatforms(platforms); }, [platforms, loaded]);
  useEffect(() => { if (loaded) saveGlobalAdsPercent(globalAdsPercent); }, [globalAdsPercent, loaded]);
  useEffect(() => { if (loaded) saveSettings(settings); }, [settings, loaded]);

  useEffect(() => {
    if (!selectedSkuId && skus.length > 0) setSelectedSkuId(skus[0].id);
  }, [skus, selectedSkuId]);

  const selectedSku = useMemo(() => skus.find((s) => s.id === selectedSkuId), [skus, selectedSkuId]);
  const results = useMemo(() => {
    if (!selectedSku) return [];
    return calculateAllPlatforms(selectedSku, platforms, globalAdsPercent);
  }, [selectedSku, platforms, globalAdsPercent]);

  // Summary stats across all SKUs
  const allSkuAlerts = useMemo(() => {
    const alerts: { sku: SKU; result: CalculationResult }[] = [];
    skus.forEach(sku => {
      platforms.forEach(platform => {
        const result = calculateAllPlatforms(sku, [platform], globalAdsPercent)[0];
        if (result && result.profitMargin < settings.minMarginAlert) {
          alerts.push({ sku, result });
        }
      });
    });
    return alerts.sort((a, b) => a.result.profitMargin - b.result.profitMargin);
  }, [skus, platforms, globalAdsPercent, settings.minMarginAlert]);

  if (!loaded) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className={`max-w-7xl mx-auto px-4 py-6 ${settings.darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gleva Profit Calculator</h1>
          <p className="text-sm text-gray-500 mt-1">Compare profits across all marketplaces</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/marketplace" className="bg-purple-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-purple-700">Marketplace View</Link>
          <Link href="/heatmap" className="bg-orange-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-orange-700">Heatmap</Link>
          <Link href="/simulator" className="bg-teal-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-teal-700">Price Simulator</Link>
          <Link href="/tracking" className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-700">Monthly Tracking</Link>
          <Link href="/alerts" className="relative bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-red-700">
            Alerts
            {allSkuAlerts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {allSkuAlerts.length > 99 ? '99+' : allSkuAlerts.length}
              </span>
            )}
          </Link>
          <Link href="/changelog" className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-gray-700">Change Log</Link>
        </div>
      </div>

      {/* Summary Cards */}
      {skus.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <p className="text-xs text-gray-500">Total SKUs</p>
            <p className="text-xl font-bold text-gray-900">{skus.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <p className="text-xs text-gray-500">Platforms</p>
            <p className="text-xl font-bold text-gray-900">{platforms.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <p className="text-xs text-gray-500">Low Margin Alerts</p>
            <p className={`text-xl font-bold ${allSkuAlerts.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{allSkuAlerts.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <p className="text-xs text-gray-500">Min Margin Threshold</p>
            <p className="text-xl font-bold text-gray-900">{settings.minMarginAlert}%</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <p className="text-xs text-gray-500">Ads %</p>
            <p className="text-xl font-bold text-gray-900">{globalAdsPercent}%</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { id: "dashboard" as Tab, label: "Dashboard" },
          { id: "skus" as Tab, label: "Manage SKUs" },
          { id: "platforms" as Tab, label: "Platform Fees" },
        ]).map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <DashboardView skus={skus} platforms={platforms} results={results} selectedSkuId={selectedSkuId}
          onSelectSku={setSelectedSkuId} globalAdsPercent={globalAdsPercent}
          onAdsPercentChange={setGlobalAdsPercent} minMargin={settings.minMarginAlert} />
      )}
      {activeTab === "skus" && (
        <SKUManager skus={skus} platforms={platforms} onUpdate={setSkus} />
      )}
      {activeTab === "platforms" && (
        <PlatformManager platforms={platforms} onUpdate={setPlatforms} />
      )}
    </div>
  );
}

// ============ DASHBOARD ============

function DashboardView({ skus, platforms, results, selectedSkuId, onSelectSku, globalAdsPercent, onAdsPercentChange, minMargin }: {
  skus: SKU[]; platforms: PlatformDefinition[]; results: CalculationResult[];
  selectedSkuId: string; onSelectSku: (id: string) => void;
  globalAdsPercent: number; onAdsPercentChange: (v: number) => void; minMargin: number;
}) {
  if (skus.length === 0) {
    return <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
      <p className="text-gray-500 mb-2">No SKUs added yet.</p>
      <p className="text-sm text-gray-400">Go to &quot;Manage SKUs&quot; tab to add your first product.</p>
    </div>;
  }

  const selectedSku = skus.find((s) => s.id === selectedSkuId);
  const sortedResults = [...results].sort((a, b) => b.profit - a.profit);

  // Best platform recommendation
  const bestPlatform = sortedResults[0];
  const worstPlatform = sortedResults[sortedResults.length - 1];

  const handleExport = () => {
    const headers = ['Platform', 'SP', 'MRP', 'Commission', 'Platform Fees', 'Net Received', 'GST Output', 'GST Input', 'Net GST', 'Product Cost', 'Ads', 'Returns', 'Profit', 'Margin %', 'Monthly Vol', 'Monthly Profit'];
    const rows = sortedResults.map(r => [
      r.platformName, r.sellingPrice.toString(), r.mrp.toString(),
      r.commission.toFixed(2), r.totalPlatformFees.toFixed(2), r.netReceived.toFixed(2),
      r.gstOutput.toFixed(2), (r.gstInputOnCost + r.gstInputOnFees).toFixed(2), r.netGST.toFixed(2),
      r.productCost.toString(), r.adsCost.toFixed(2), r.returnCost.toFixed(2),
      r.profit.toFixed(2), r.profitMargin.toFixed(1), r.monthlyVolume.toString(), r.monthlyProfit.toFixed(2),
    ]);
    const csv = exportToCSV(headers, rows);
    downloadCSV(csv, `gleva-${selectedSku?.sku || 'export'}-profit.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select SKU</label>
            <select value={selectedSkuId} onChange={(e) => onSelectSku(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {skus.map((sku) => <option key={sku.id} value={sku.id}>{sku.name} ({sku.sku})</option>)}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ads % (revenue)</label>
            <input type="number" step="0.1" min="0" value={globalAdsPercent}
              onChange={(e) => onAdsPercentChange(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700">
            Export CSV
          </button>
        </div>
      </div>

      {/* SKU Info + Best Platform */}
      {selectedSku && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Product Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">SKU:</span> <span className="font-medium">{selectedSku.sku}</span></div>
              <div><span className="text-gray-500">Cost:</span> <span className="font-medium">{"\u20B9"}{selectedSku.costPrice}</span></div>
              <div><span className="text-gray-500">GST:</span> <span className="font-medium">{selectedSku.gstPercent}%</span></div>
              <div><span className="text-gray-500">Weight:</span> <span className="font-medium">{selectedSku.weight}g</span></div>
            </div>
            {selectedSku.notes && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Note:</strong> {selectedSku.notes}
              </div>
            )}
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
            <h3 className="text-sm font-medium text-green-700 mb-2">Best Platform Recommendation</h3>
            {bestPlatform && (
              <div className="text-sm">
                <p className="text-lg font-bold text-green-700">{bestPlatform.platformName}</p>
                <p className="text-green-600">Profit: {"\u20B9"}{bestPlatform.profit.toFixed(2)} | Margin: {bestPlatform.profitMargin.toFixed(1)}%</p>
                {worstPlatform && worstPlatform.platformId !== bestPlatform.platformId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Worst: {worstPlatform.platformName} ({"\u20B9"}{worstPlatform.profit.toFixed(2)}) — Difference: {"\u20B9"}{(bestPlatform.profit - worstPlatform.profit).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedResults.map((result, index) => (
          <ProfitCard key={result.platformId} result={result} rank={index + 1} minMargin={minMargin} />
        ))}
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        <h3 className="text-sm font-medium text-gray-700 px-4 pt-4 pb-2">Detailed Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-3 py-2 font-medium text-gray-600">Platform</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">SP</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Commission</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Discount</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Other Fees</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Net Received</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Net GST</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Profit</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Margin</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Vol/mo</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Monthly {"\u20B9"}</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((r) => (
              <tr key={r.platformId} className={`border-b hover:bg-gray-50 ${r.profitMargin < minMargin ? 'bg-red-50' : ''}`}>
                <td className="px-3 py-2 font-medium">{r.platformName}</td>
                <td className="px-3 py-2 text-right">{r.settlement ? `${"\u20B9"}${r.settlement}` : `${"\u20B9"}${r.sellingPrice}`}</td>
                <td className="px-3 py-2 text-right text-red-600">{r.commission > 0 ? `-${"\u20B9"}${r.commission.toFixed(2)}` : "-"}</td>
                <td className="px-3 py-2 text-right text-red-600">{r.discount > 0 ? `-${"\u20B9"}${r.discount.toFixed(2)}` : "-"}</td>
                <td className="px-3 py-2 text-right text-red-600">
                  {(r.shippingFee + r.storageFee + r.closingFee + r.pickAndPackFee) > 0
                    ? `-${"\u20B9"}${(r.shippingFee + r.storageFee + r.closingFee + r.pickAndPackFee).toFixed(2)}` : "-"}
                </td>
                <td className="px-3 py-2 text-right font-medium">{"\u20B9"}{r.netReceived.toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-red-600">{"\u20B9"}{r.netGST.toFixed(2)}</td>
                <td className={`px-3 py-2 text-right font-bold ${r.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {"\u20B9"}{r.profit.toFixed(2)}
                </td>
                <td className={`px-3 py-2 text-right font-medium ${r.profitMargin < minMargin ? "text-red-600" : r.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {r.profitMargin.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right text-gray-500">{r.monthlyVolume || "-"}</td>
                <td className={`px-3 py-2 text-right font-medium ${r.monthlyProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {r.monthlyVolume > 0 ? `${"\u20B9"}${r.monthlyProfit.toFixed(0)}` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfitCard({ result, rank, minMargin }: { result: CalculationResult; rank: number; minMargin: number }) {
  const isPositive = result.profit >= 0;
  const belowMin = result.profitMargin < minMargin;
  const bgColor = rank === 1 ? "bg-green-50 border-green-200"
    : belowMin ? "bg-red-50 border-red-200"
    : isPositive ? "bg-white border-gray-200" : "bg-red-50 border-red-200";

  return (
    <div className={`rounded-lg shadow-sm border p-4 ${bgColor}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{result.platformName}</h3>
          <p className="text-xs text-gray-500">{result.commissionLabel}</p>
        </div>
        <div className="flex gap-1">
          {belowMin && <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">Low</span>}
          {rank <= 3 && <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            rank === 1 ? "bg-green-100 text-green-700" : rank === 2 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>#{rank}</span>}
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">{result.settlement ? "Settlement" : "Selling Price"}</span><span>{"\u20B9"}{result.settlement || result.sellingPrice}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Platform Fees</span><span className="text-red-600">-{"\u20B9"}{(result.totalPlatformFees + result.discount).toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Net Received</span><span>{"\u20B9"}{result.netReceived.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Product Cost</span><span className="text-red-600">-{"\u20B9"}{result.productCost.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Net GST</span><span className="text-red-600">-{"\u20B9"}{result.netGST.toFixed(2)}</span></div>
        {result.adsCost > 0 && <div className="flex justify-between"><span className="text-gray-500">Ads</span><span className="text-red-600">-{"\u20B9"}{result.adsCost.toFixed(2)}</span></div>}
        <hr className="my-1" />
        <div className="flex justify-between font-bold"><span>Profit</span><span className={isPositive ? "text-green-600" : "text-red-600"}>{"\u20B9"}{result.profit.toFixed(2)}</span></div>
        <div className="flex justify-between text-xs"><span className="text-gray-500">Margin</span><span className={isPositive ? "text-green-600" : "text-red-600"}>{result.profitMargin.toFixed(1)}%</span></div>
        {result.monthlyVolume > 0 && (
          <div className="flex justify-between text-xs mt-1 pt-1 border-t"><span className="text-gray-500">{result.monthlyVolume} units/mo</span><span className="font-bold">{"\u20B9"}{result.monthlyProfit.toFixed(0)}/mo</span></div>
        )}
      </div>
    </div>
  );
}

// ============ SKU MANAGER (with CSV Import, Notes, Volume) ============

function SKUManager({ skus, platforms, onUpdate }: { skus: SKU[]; platforms: PlatformDefinition[]; onUpdate: (skus: SKU[]) => void }) {
  const [editing, setEditing] = useState<SKU | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const startNew = () => {
    const pp: SKU["platformPricing"] = {};
    platforms.forEach((p) => { pp[p.id] = { mrp: 0, sellingPrice: 0, settlement: p.type === "fixed_settlement" ? 0 : undefined, returnPercent: 0, monthlyVolume: 0 }; });
    setEditing({ id: Date.now().toString(), name: "", sku: "", costPrice: 0, gstPercent: 18, weight: 0, mrp: 0, sellingPrice: 0, notes: "", platformPricing: pp });
    setIsNew(true);
  };

  const save = () => {
    if (!editing) return;
    if (isNew) onUpdate([...skus, editing]);
    else onUpdate(skus.map((s) => (s.id === editing.id ? editing : s)));
    setEditing(null); setIsNew(false);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const rows = parseCSV(text);
      const newSkus: SKU[] = rows.map((row, i) => {
        const pp: SKU["platformPricing"] = {};
        platforms.forEach((p) => {
          const spKey = `${p.name}_SP`;
          const mrpKey = `${p.name}_MRP`;
          const settleKey = `${p.name}_Settlement`;
          const retKey = `${p.name}_Return%`;
          const volKey = `${p.name}_Volume`;
          pp[p.id] = {
            mrp: parseFloat(row[mrpKey]) || parseFloat(row['MRP']) || 0,
            sellingPrice: parseFloat(row[spKey]) || parseFloat(row['SP']) || parseFloat(row['Selling Price']) || 0,
            settlement: p.type === 'fixed_settlement' ? (parseFloat(row[settleKey]) || 0) : undefined,
            returnPercent: parseFloat(row[retKey]) || 0,
            monthlyVolume: parseFloat(row[volKey]) || 0,
          };
        });
        return {
          id: (Date.now() + i).toString(),
          name: row['Name'] || row['Product Name'] || row['name'] || '',
          sku: row['SKU'] || row['sku'] || row['SKU Code'] || '',
          costPrice: parseFloat(row['Cost'] || row['Cost Price'] || row['cost']) || 0,
          gstPercent: parseFloat(row['GST'] || row['GST%'] || row['gst']) || 18,
          weight: parseFloat(row['Weight'] || row['weight']) || 0,
          mrp: parseFloat(row['MRP'] || row['mrp']) || 0,
          sellingPrice: parseFloat(row['SP'] || row['Selling Price'] || row['sp']) || 0,
          notes: row['Notes'] || row['notes'] || '',
          platformPricing: pp,
        };
      }).filter(s => s.name || s.sku);
      if (newSkus.length > 0) onUpdate([...skus, ...newSkus]);
      setShowImport(false);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleExportTemplate = () => {
    const headers = ['Name', 'SKU', 'Cost', 'GST', 'Weight', 'MRP', 'SP', 'Notes'];
    platforms.forEach(p => {
      if (p.type === 'fixed_settlement') headers.push(`${p.name}_Settlement`);
      else { headers.push(`${p.name}_SP`); headers.push(`${p.name}_MRP`); }
      headers.push(`${p.name}_Return%`);
      headers.push(`${p.name}_Volume`);
    });
    const rows = skus.length > 0
      ? skus.map(s => {
          const row = [s.name, s.sku, s.costPrice.toString(), s.gstPercent.toString(), s.weight.toString(), s.mrp.toString(), s.sellingPrice.toString(), s.notes || ''];
          platforms.forEach(p => {
            const pp = s.platformPricing[p.id];
            if (p.type === 'fixed_settlement') row.push((pp?.settlement || 0).toString());
            else { row.push((pp?.sellingPrice || 0).toString()); row.push((pp?.mrp || 0).toString()); }
            row.push((pp?.returnPercent || 0).toString());
            row.push((pp?.monthlyVolume || 0).toString());
          });
          return row;
        })
      : [['Gleva Hair Building Fiber', 'GL-HBF-S-BLK-561', '140', '18', '180', '799', '699', '', ...platforms.flatMap(p => p.type === 'fixed_settlement' ? ['450', '0', '0'] : ['699', '799', '0', '0'])]];
    downloadCSV(exportToCSV(headers, rows), 'gleva-sku-template.csv');
  };

  if (editing) return <SKUForm sku={editing} platforms={platforms} onChange={setEditing} onSave={save} onCancel={() => { setEditing(null); setIsNew(false); }} isNew={isNew} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-900">SKUs ({skus.length})</h2>
        <div className="flex gap-2">
          <button onClick={handleExportTemplate} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200">Export CSV Template</button>
          <button onClick={() => setShowImport(true)} className="bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700">Import CSV</button>
          <button onClick={startNew} className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">+ Add SKU</button>
        </div>
      </div>

      {showImport && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">Import SKUs from CSV</h3>
          <p className="text-xs text-blue-600 mb-3">
            CSV must have headers: Name, SKU, Cost, GST, Weight, MRP, SP. Per-platform columns: [Platform]_SP, [Platform]_MRP, [Platform]_Settlement, [Platform]_Return%, [Platform]_Volume.
            Download the template first to see the exact format.
          </p>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVImport} className="text-sm" />
            <button onClick={() => setShowImport(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {skus.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500">No SKUs yet. Add your first product or import from CSV.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">SKU</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">Cost</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">GST</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">SP</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">MRP</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Notes</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">Actions</th>
            </tr></thead>
            <tbody>{skus.map((sku) => (
              <tr key={sku.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{sku.name}</td>
                <td className="px-4 py-2 text-gray-600">{sku.sku}</td>
                <td className="px-4 py-2 text-right">{"\u20B9"}{sku.costPrice}</td>
                <td className="px-4 py-2 text-right">{sku.gstPercent}%</td>
                <td className="px-4 py-2 text-right">{"\u20B9"}{sku.sellingPrice}</td>
                <td className="px-4 py-2 text-right">{"\u20B9"}{sku.mrp}</td>
                <td className="px-4 py-2 text-gray-500 text-xs max-w-[150px] truncate">{sku.notes || "-"}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => {
                    const up = { ...sku.platformPricing };
                    platforms.forEach((p) => { if (!up[p.id]) up[p.id] = { mrp: sku.mrp, sellingPrice: sku.sellingPrice, settlement: p.type === "fixed_settlement" ? 0 : undefined, returnPercent: 0, monthlyVolume: 0 }; });
                    setEditing({ ...sku, platformPricing: up }); setIsNew(false);
                  }} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                  <button onClick={() => onUpdate(skus.filter((s) => s.id !== sku.id))} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SKUForm({ sku, platforms, onChange, onSave, onCancel, isNew }: {
  sku: SKU; platforms: PlatformDefinition[]; onChange: (sku: SKU) => void; onSave: () => void; onCancel: () => void; isNew: boolean;
}) {
  const updateField = (field: keyof SKU, value: string | number) => onChange({ ...sku, [field]: value });
  const updatePP = (pid: string, field: string, value: number) => {
    const up = { ...sku.platformPricing }; up[pid] = { ...up[pid], [field]: value }; onChange({ ...sku, platformPricing: up });
  };
  const applyDefault = () => {
    const up = { ...sku.platformPricing };
    platforms.forEach((p) => { if (p.type !== "fixed_settlement") up[p.id] = { ...up[p.id], mrp: sku.mrp, sellingPrice: sku.sellingPrice }; });
    onChange({ ...sku, platformPricing: up });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">{isNew ? "Add New SKU" : "Edit SKU"}</h2>
        <div className="space-x-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save SKU</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Product Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-xs text-gray-500 mb-1">Product Name</label><input type="text" value={sku.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Gleva Hair Building Fiber" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">SKU Code</label><input type="text" value={sku.sku} onChange={(e) => updateField("sku", e.target.value)} placeholder="GL-HBF-S-BLK-561" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Cost Price (excl. tax) {"\u20B9"}</label><input type="number" value={sku.costPrice || ""} onChange={(e) => updateField("costPrice", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">GST %</label><input type="number" value={sku.gstPercent || ""} onChange={(e) => updateField("gstPercent", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Weight (grams)</label><input type="number" value={sku.weight || ""} onChange={(e) => updateField("weight", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Notes</h3>
        <textarea value={sku.notes || ""} onChange={(e) => onChange({ ...sku, notes: e.target.value })}
          placeholder="Add notes about this SKU (e.g., 'Discontinuing on Nykaa', 'Running promo this month')"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none" />
      </div>

      {/* Default Pricing */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-700">Default Pricing</h3>
          <button onClick={applyDefault} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Apply to all platforms</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs text-gray-500 mb-1">Default MRP {"\u20B9"}</label><input type="number" value={sku.mrp || ""} onChange={(e) => updateField("mrp", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Default Selling Price {"\u20B9"}</label><input type="number" value={sku.sellingPrice || ""} onChange={(e) => updateField("sellingPrice", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
      </div>

      {/* Per-Platform Pricing with Volume */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Per-Platform Pricing &amp; Volume</h3>
        <div className="space-y-3">
          {platforms.map((p) => {
            const pp = sku.platformPricing[p.id] || { mrp: sku.mrp, sellingPrice: sku.sellingPrice };
            return (
              <div key={p.id} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-center p-3 bg-gray-50 rounded-md">
                <div className="font-medium text-sm text-gray-700 col-span-2 md:col-span-1">{p.name}</div>
                {p.type === "fixed_settlement" ? (
                  <div><label className="block text-xs text-gray-500 mb-1">Settlement {"\u20B9"}</label><input type="number" value={pp.settlement || ""} onChange={(e) => updatePP(p.id, "settlement", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                ) : (<>
                  <div><label className="block text-xs text-gray-500 mb-1">MRP {"\u20B9"}</label><input type="number" value={pp.mrp || ""} onChange={(e) => updatePP(p.id, "mrp", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">SP {"\u20B9"}</label><input type="number" value={pp.sellingPrice || ""} onChange={(e) => updatePP(p.id, "sellingPrice", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                </>)}
                <div><label className="block text-xs text-gray-500 mb-1">Return %</label><input type="number" step="0.1" value={pp.returnPercent || ""} onChange={(e) => updatePP(p.id, "returnPercent", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Units/Month</label><input type="number" value={pp.monthlyVolume || ""} onChange={(e) => updatePP(p.id, "monthlyVolume", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ PLATFORM MANAGER (with Fee Change Log) ============

function PlatformManager({ platforms, onUpdate }: { platforms: PlatformDefinition[]; onUpdate: (p: PlatformDefinition[]) => void }) {
  const updatePlatform = (index: number, field: string, value: unknown) => {
    const old = platforms[index];
    const oldVal = (old as unknown as Record<string, unknown>)[field];
    const updated = [...platforms];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
    // Log change
    if (typeof oldVal === 'number' && typeof value === 'number' && oldVal !== value) {
      addFeeChangeLog({
        id: Date.now().toString(),
        platformId: old.id, platformName: old.name,
        field, oldValue: oldVal, newValue: value,
        date: new Date().toISOString(),
      });
    }
  };

  const typeLabels: Record<string, string> = {
    amazon_fba: "Amazon FBA (slab fees) - inclusive of GST",
    blinkit: "Blinkit (slab + shipping + storage) - inclusive of GST",
    sp_commission: "Commission on SP - inclusive of GST",
    mrp_commission: "Commission on MRP (discount deducted) - inclusive of GST",
    zero_commission: "Zero Commission",
    fixed_settlement: "Fixed Settlement",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Platform Fee Configuration</h2>
          <p className="text-sm text-gray-500">All fees inclusive of GST. Changes are automatically logged.</p>
        </div>
        <Link href="/changelog" className="text-sm text-blue-600 hover:text-blue-800 font-medium">View Change Log</Link>
      </div>
      <div className="space-y-4">
        {platforms.map((platform, index) => (
          <div key={platform.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="mb-3"><h3 className="font-semibold text-gray-900">{platform.name}</h3><p className="text-xs text-gray-500">{typeLabels[platform.type]}</p></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(platform.type === "sp_commission" || platform.type === "mrp_commission" || platform.type === "zero_commission") && (
                <div><label className="block text-xs text-gray-500 mb-1">Commission %</label><input type="number" step="0.1" value={platform.commissionPercent || 0} onChange={(e) => updatePlatform(index, "commissionPercent", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              )}
              <div><label className="block text-xs text-gray-500 mb-1">Platform Ads %</label><input type="number" step="0.1" value={platform.adsPercent || 0} onChange={(e) => updatePlatform(index, "adsPercent", parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            {platform.type === "amazon_fba" && <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs text-gray-600"><strong>Fees (incl. GST):</strong> Referral: 0% (&lt;300), 5% (300-499), 9% (500+) | Closing: {"\u20B9"}12 (&lt;500), {"\u20B9"}25 (500+) | Shipping: {"\u20B9"}42 | Pick&amp;Pack: {"\u20B9"}17</div>}
            {platform.type === "blinkit" && <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs text-gray-600"><strong>Fees (incl. GST):</strong> Commission: 2% (0-500), 6% (501-700), 13% (701-900), 16% (901-1200), 18% (1200+) | Shipping: {"\u20B9"}50 | Storage: 19%</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

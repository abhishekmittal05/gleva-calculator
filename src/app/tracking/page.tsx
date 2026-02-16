"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  SKU,
  PlatformDefinition,
  DEFAULT_PLATFORMS,
  calculateProfit,
  MonthlySnapshot,
} from "@/lib/calculations";
import {
  getSKUs,
  getPlatforms,
  getGlobalAdsPercent,
  getSnapshots,
  addSnapshot,
  saveSnapshots,
} from "@/lib/store";

export default function TrackingPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>(DEFAULT_PLATFORMS);
  const [globalAdsPercent, setGlobalAdsPercent] = useState(0);
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadData = () => {
    setSkus(getSKUs());
    setPlatforms(getPlatforms());
    setGlobalAdsPercent(getGlobalAdsPercent());
    const snaps = getSnapshots();
    setSnapshots(snaps);
    if (snaps.length > 0) setSelectedSnapshotId(snaps[0].id);
  };

  useEffect(() => {
    loadData();
    setLoaded(true);
    const handler = () => loadData();
    window.addEventListener('sheets-synced', handler);
    return () => window.removeEventListener('sheets-synced', handler);
  }, []);

  const takeSnapshot = () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const skuResults = skus.map((sku) => {
      const platformData = platforms.map((platform) => {
        const result = calculateProfit(sku, platform, globalAdsPercent);
        return {
          platformId: platform.id,
          profit: result.profit,
          margin: result.profitMargin,
          volume: result.monthlyVolume,
          monthlyProfit: result.monthlyProfit,
        };
      });
      return {
        skuId: sku.id,
        skuName: sku.name,
        skuCode: sku.sku,
        platforms: platformData,
      };
    });

    const platformDataMap: MonthlySnapshot["platformData"] = {};
    platforms.forEach((p) => {
      platformDataMap[p.id] = {
        adsPercent: p.adsPercent,
        commissionPercent: p.commissionPercent,
      };
    });

    const snapshot: MonthlySnapshot = {
      id: Date.now().toString(),
      month,
      date: now.toISOString(),
      globalAdsPercent,
      platformData: platformDataMap,
      skuResults,
    };

    addSnapshot(snapshot);
    const updated = [snapshot, ...snapshots];
    setSnapshots(updated);
    setSelectedSnapshotId(snapshot.id);
  };

  const deleteSnapshot = (id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated);
    saveSnapshots(updated);
    if (selectedSnapshotId === id) {
      setSelectedSnapshotId(updated.length > 0 ? updated[0].id : "");
    }
  };

  const selectedSnapshot = useMemo(
    () => snapshots.find((s) => s.id === selectedSnapshotId),
    [snapshots, selectedSnapshotId]
  );

  // Compare two most recent snapshots
  const comparison = useMemo(() => {
    if (snapshots.length < 2) return null;
    const latest = snapshots[0];
    const previous = snapshots[1];
    return { latest, previous };
  }, [snapshots]);

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
          <h1 className="text-2xl font-bold text-gray-900">Monthly Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">
            Save monthly snapshots and track profit trends
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={takeSnapshot}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Take Snapshot
          </button>
          <Link
            href="/"
            className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500 mb-2">No snapshots yet.</p>
          <p className="text-sm text-gray-400">
            Click &quot;Take Snapshot&quot; to save the current state of all calculations.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Take monthly snapshots to track how your profits change over time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Snapshot List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">
                Snapshots ({snapshots.length})
              </h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedSnapshotId === snap.id
                        ? "bg-indigo-50 border-indigo-300"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedSnapshotId(snap.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-gray-700">{snap.month}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(snap.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {snap.skuResults.length} SKUs | Ads: {snap.globalAdsPercent}%
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSnapshot(snap.id);
                        }}
                        className="text-red-400 hover:text-red-600 text-xs px-1"
                        title="Delete snapshot"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Snapshot Details */}
          <div className="lg:col-span-3">
            {selectedSnapshot && (
              <>
                {/* Summary */}
                <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">
                    Snapshot: {selectedSnapshot.month}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-gray-500">SKUs</p>
                      <p className="text-xl font-bold text-gray-900">
                        {selectedSnapshot.skuResults.length}
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-gray-500">Global Ads %</p>
                      <p className="text-xl font-bold text-gray-900">
                        {selectedSnapshot.globalAdsPercent}%
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-gray-500">Total Monthly Profit</p>
                      <p className="text-xl font-bold text-green-600">
                        {"\u20B9"}
                        {selectedSnapshot.skuResults
                          .reduce(
                            (sum, sku) =>
                              sum +
                              sku.platforms.reduce((s, p) => s + p.monthlyProfit, 0),
                            0
                          )
                          .toFixed(0)}
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-gray-500">Avg Margin</p>
                      <p className="text-xl font-bold text-gray-900">
                        {(() => {
                          const margins = selectedSnapshot.skuResults.flatMap((s) =>
                            s.platforms.map((p) => p.margin)
                          );
                          return margins.length > 0
                            ? (
                                margins.reduce((a, b) => a + b, 0) / margins.length
                              ).toFixed(1)
                            : "0";
                        })()}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comparison with previous */}
                {comparison && selectedSnapshotId === comparison.latest.id && (
                  <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">
                      Compared to Previous ({comparison.previous.month})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left px-2 py-1.5 text-gray-600">Platform</th>
                            <th className="text-right px-2 py-1.5 text-gray-600">
                              Ads % ({comparison.previous.month})
                            </th>
                            <th className="text-right px-2 py-1.5 text-gray-600">
                              Ads % ({comparison.latest.month})
                            </th>
                            <th className="text-right px-2 py-1.5 text-gray-600">
                              Commission ({comparison.previous.month})
                            </th>
                            <th className="text-right px-2 py-1.5 text-gray-600">
                              Commission ({comparison.latest.month})
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {platforms.map((p) => {
                            const prev = comparison.previous.platformData[p.id];
                            const curr = comparison.latest.platformData[p.id];
                            return (
                              <tr key={p.id} className="border-b">
                                <td className="px-2 py-1.5 font-medium">{p.name}</td>
                                <td className="px-2 py-1.5 text-right">
                                  {prev?.adsPercent ?? "-"}%
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  {curr?.adsPercent ?? "-"}%
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  {prev?.commissionPercent !== undefined
                                    ? `${prev.commissionPercent}%`
                                    : "-"}
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  {curr?.commissionPercent !== undefined
                                    ? `${curr.commissionPercent}%`
                                    : "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SKU Results Table */}
                <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-2 py-2 text-gray-600 font-medium sticky left-0 bg-gray-50">
                          SKU
                        </th>
                        {platforms.map((p) => (
                          <th
                            key={p.id}
                            className="text-center px-2 py-2 text-gray-600 font-medium min-w-[90px]"
                            colSpan={2}
                          >
                            {p.name}
                          </th>
                        ))}
                      </tr>
                      <tr className="border-b bg-gray-50">
                        <th className="sticky left-0 bg-gray-50"></th>
                        {platforms.map((p) => (
                          <th key={p.id} colSpan={2} className="px-1 py-1">
                            <div className="flex text-[10px] text-gray-400">
                              <span className="flex-1 text-center">Profit</span>
                              <span className="flex-1 text-center">Margin</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSnapshot.skuResults.map((skuResult) => (
                        <tr key={skuResult.skuId} className="border-b hover:bg-gray-50">
                          <td className="px-2 py-2 sticky left-0 bg-white border-r">
                            <div className="font-medium text-gray-900">{skuResult.skuName}</div>
                            <div className="text-gray-400">{skuResult.skuCode}</div>
                          </td>
                          {platforms.map((platform) => {
                            const pr = skuResult.platforms.find(
                              (p) => p.platformId === platform.id
                            );
                            if (!pr) {
                              return (
                                <td key={platform.id} colSpan={2} className="px-2 py-2 text-center text-gray-300">
                                  -
                                </td>
                              );
                            }
                            return (
                              <td key={platform.id} colSpan={2} className="px-1 py-2">
                                <div className="flex text-center">
                                  <span
                                    className={`flex-1 font-bold ${
                                      pr.profit >= 0 ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {"\u20B9"}{pr.profit.toFixed(0)}
                                  </span>
                                  <span
                                    className={`flex-1 ${
                                      pr.margin >= 0 ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {pr.margin.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

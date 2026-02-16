"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PlatformDefinition, DEFAULT_PLATFORMS, FeeChangeLog } from "@/lib/calculations";
import { getFeeChangeLogs, saveFeeChangeLogs, getPlatforms } from "@/lib/store";

export default function ChangelogPage() {
  const [logs, setLogs] = useState<FeeChangeLog[]>([]);
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>(DEFAULT_PLATFORMS);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterField, setFilterField] = useState("all");
  const [loaded, setLoaded] = useState(false);

  const loadData = () => {
    setLogs(getFeeChangeLogs());
    setPlatforms(getPlatforms());
  };

  useEffect(() => {
    loadData();
    setLoaded(true);
    const handler = () => loadData();
    window.addEventListener('sheets-synced', handler);
    return () => window.removeEventListener('sheets-synced', handler);
  }, []);

  const filteredLogs = useMemo(() => {
    let filtered = logs;
    if (filterPlatform !== "all") {
      filtered = filtered.filter((l) => l.platformId === filterPlatform);
    }
    if (filterField !== "all") {
      filtered = filtered.filter((l) => l.field === filterField);
    }
    return filtered;
  }, [logs, filterPlatform, filterField]);

  // Unique fields for filter
  const uniqueFields = useMemo(() => {
    const fields = new Set<string>();
    logs.forEach((l) => fields.add(l.field));
    return Array.from(fields);
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
    saveFeeChangeLogs([]);
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Platform Fee Change Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            History of all platform fee changes
          </p>
        </div>
        <div className="flex gap-2">
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Clear All
            </button>
          )}
          <Link
            href="/"
            className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-gray-500 mb-1">Total Changes</p>
          <p className="text-3xl font-bold text-gray-900">{logs.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-gray-500 mb-1">Platforms Affected</p>
          <p className="text-3xl font-bold text-gray-900">
            {new Set(logs.map((l) => l.platformId)).size}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-gray-500 mb-1">Fee Increases</p>
          <p className="text-3xl font-bold text-red-600">
            {logs.filter((l) => l.newValue > l.oldValue).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-xs text-gray-500 mb-1">Fee Decreases</p>
          <p className="text-3xl font-bold text-green-600">
            {logs.filter((l) => l.newValue < l.oldValue).length}
          </p>
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
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
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
            <label className="block text-xs text-gray-500 mb-1">Field Changed</label>
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <option value="all">All Fields</option>
              {uniqueFields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500 mb-2">No changes recorded yet.</p>
          <p className="text-sm text-gray-400">
            When you modify platform fees on the main dashboard, changes will be logged here automatically.
          </p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500">No changes match your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Date &amp; Time</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Platform</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Field</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Old Value</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600"></th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">New Value</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Change</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => {
                const diff = log.newValue - log.oldValue;
                const isIncrease = diff > 0;
                return (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      {new Date(log.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      <br />
                      <span className="text-gray-400">
                        {new Date(log.date).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">{log.platformName}</td>
                    <td className="px-3 py-2 text-gray-600">{log.field}</td>
                    <td className="px-3 py-2 text-right">{log.oldValue}%</td>
                    <td className="px-3 py-2 text-center text-lg">
                      {isIncrease ? (
                        <span className="text-red-500">→</span>
                      ) : (
                        <span className="text-green-500">→</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{log.newValue}%</td>
                    <td
                      className={`px-3 py-2 text-right font-bold ${
                        isIncrease ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {isIncrease ? "+" : ""}
                      {diff.toFixed(1)}%
                      <span className="block text-xs font-normal text-gray-400">
                        {isIncrease ? "Fee Increase" : "Fee Decrease"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 border-t">
            Showing {filteredLogs.length} of {logs.length} changes
          </div>
        </div>
      )}

      {/* Timeline View */}
      {filteredLogs.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Recent Changes Timeline</h3>
          <div className="space-y-3">
            {filteredLogs.slice(0, 10).map((log) => {
              const diff = log.newValue - log.oldValue;
              const isIncrease = diff > 0;
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isIncrease ? "bg-red-500" : "bg-green-500"
                    }`}
                  />
                  <div className="flex-1">
                    <span className="font-medium">{log.platformName}</span>
                    {" "}
                    <span className="text-gray-500">{log.field}</span>
                    {" changed from "}
                    <span className="font-medium">{log.oldValue}%</span>
                    {" to "}
                    <span
                      className={`font-bold ${
                        isIncrease ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {log.newValue}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(log.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

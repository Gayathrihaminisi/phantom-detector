import React from 'react';
import { History, RotateCcw, CheckCircle2, Clock, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { ImportHistoryEntry } from '../../types';

interface ImportHistoryListProps {
  history: ImportHistoryEntry[];
  canUndo: boolean;
  onUndoLatestImport: () => void;
}

export const ImportHistoryList: React.FC<ImportHistoryListProps> = ({
  history,
  canUndo,
  onUndoLatestImport,
}) => {
  return (
    <div className="card-subtle p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-900">Import History & Audit Log</h3>
        </div>

        {canUndo && (
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Are you sure you want to undo the latest CSV import and restore the previous dataset state?'
                )
              ) {
                onUndoLatestImport();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold shadow-2xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo Latest Import</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-4 text-center">
          No previous imports recorded in this session.
        </p>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">File Name</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3 text-right">Rows</th>
                <th className="py-2.5 px-3 text-right">Valid</th>
                <th className="py-2.5 px-3 text-right">Duplicates</th>
                <th className="py-2.5 px-3 text-right">Quality</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((entry, idx) => (
                <tr
                  key={entry.id || idx}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    entry.status === 'undone' ? 'opacity-60 bg-slate-50/40' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {new Date(entry.timestamp).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[180px]">{entry.filename}</span>
                  </td>
                  <td className="py-2.5 px-3 uppercase font-semibold text-[11px] text-teal-800">
                    {entry.mode}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {entry.totalRows}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                    {entry.validAccepted}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                    {entry.duplicates}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                    {entry.dataQualityPercentage}%
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {entry.status === 'undone' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                        Undone
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

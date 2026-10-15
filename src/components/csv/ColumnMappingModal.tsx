import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Columns3,
  X,
  Info,
} from 'lucide-react';
import { ColumnMappingDetectionResult } from '../../types';
import {
  COLUMN_DESCRIPTIONS,
  REQUIRED_CANONICAL_COLUMNS,
  OPTIONAL_CANONICAL_COLUMNS,
} from '../../services/dataCleaningService';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mappingResult: ColumnMappingDetectionResult;
  onConfirmMapping: (customMapping: Record<string, string>) => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  mappingResult,
  onConfirmMapping,
}) => {
  const [currentMap, setCurrentMap] = useState<Record<string, string>>(() => ({
    ...mappingResult.rawHeaderMap,
  }));

  if (!isOpen) return null;

  const allCanonicalOptions = [
    { value: '', label: '-- Skip / Unmapped --' },
    {
      group: 'Required Columns',
      options: REQUIRED_CANONICAL_COLUMNS.map((col) => ({
        value: col,
        label: `${COLUMN_DESCRIPTIONS[col]?.label || col} *`,
      })),
    },
    {
      group: 'Optional Columns',
      options: OPTIONAL_CANONICAL_COLUMNS.map((col) => ({
        value: col,
        label: COLUMN_DESCRIPTIONS[col]?.label || col,
      })),
    },
  ];

  const handleSelectChange = (rawHeader: string, canonicalField: string) => {
    setCurrentMap((prev) => ({
      ...prev,
      [rawHeader]: canonicalField,
    }));
  };

  const mappedCanonicalValues = new Set(
    Object.values(currentMap).filter((v) => Boolean(v))
  );

  const missingRequired = (REQUIRED_CANONICAL_COLUMNS as readonly string[]).filter(
    (col) => !mappedCanonicalValues.has(col)
  );

  const canProceed = missingRequired.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
              <Columns3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Confirm CSV Column Mapping
              </h3>
              <p className="text-xs text-slate-500">
                Verify automatic column recognition and map any unmapped fields.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status banner */}
          {canProceed ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                All 5 required minimum columns (<strong>date, store_id, product_id, units_sold, recorded_closing_stock</strong>) are matched and ready!
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Missing Required Columns</span>
              </div>
              <p>
                The following required columns must be mapped before importing:{' '}
                <strong>{missingRequired.join(', ')}</strong>
              </p>
            </div>
          )}

          {/* Missing Optional Column Explanations */}
          {mappingResult.missingOptional.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="w-3.5 h-3.5 text-teal-600" />
                <span>Feature Impact for Missing Optional Information:</span>
              </div>
              <ul className="space-y-1 pl-4 list-disc text-slate-600 text-[11px]">
                {mappingResult.missingOptional.map((col) => (
                  <li key={col}>
                    <strong>{COLUMN_DESCRIPTIONS[col]?.label || col}:</strong>{' '}
                    {COLUMN_DESCRIPTIONS[col]?.impactIfMissing || 'Not provided in CSV.'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mapping Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">CSV Column Header</th>
                  <th className="py-2.5 px-3">Mapped Field in System</th>
                  <th className="py-2.5 px-3">Match Status</th>
                  <th className="py-2.5 px-3">Description & Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(currentMap).map((rawHeader) => {
                  const mappedField = currentMap[rawHeader] || '';
                  const isRequired = (REQUIRED_CANONICAL_COLUMNS as readonly string[]).includes(mappedField);
                  const isMatched = Boolean(mappedField);

                  return (
                    <tr key={rawHeader} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                        {rawHeader}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={mappedField}
                          onChange={(e) => handleSelectChange(rawHeader, e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                          <option value="">-- Skip / Unmapped --</option>
                          <optgroup label="Required Columns">
                            {REQUIRED_CANONICAL_COLUMNS.map((col) => (
                              <option key={col} value={col}>
                                {COLUMN_DESCRIPTIONS[col]?.label || col} *
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Optional Columns">
                            {OPTIONAL_CANONICAL_COLUMNS.map((col) => (
                              <option key={col} value={col}>
                                {COLUMN_DESCRIPTIONS[col]?.label || col}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        {isMatched ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isRequired
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {isRequired ? 'Required' : 'Optional'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                            Unmapped
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500">
                        {mappedField
                          ? COLUMN_DESCRIPTIONS[mappedField]?.description || mappedField
                          : 'Ignored during import'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirmMapping(currentMap)}
            disabled={!canProceed}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <span>Confirm Mapping & Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, AlertCircle } from 'lucide-react';
import { RawCSVRecord } from '../../types';

interface RecordEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordIndex: number;
  record: RawCSVRecord | null;
  onSaveRecord: (index: number, updatedRecord: RawCSVRecord) => void;
}

export const RecordEditModal: React.FC<RecordEditModalProps> = ({
  isOpen,
  onClose,
  recordIndex,
  record,
  onSaveRecord,
}) => {
  const [formData, setFormData] = useState<RawCSVRecord>({});

  useEffect(() => {
    if (record) {
      setFormData({ ...record });
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRecord(recordIndex, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Edit Record #{recordIndex + 1}
              </h3>
              <p className="text-xs text-slate-500">
                Correct values manually before proceeding with import.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
            {Object.keys(formData).map((key) => {
              const val = formData[key] ?? '';
              const isRequiredKey = ['date', 'store_id', 'product_id', 'units_sold', 'recorded_closing_stock'].includes(
                key.toLowerCase().replace(/[\s\-_]+/g, '_')
              );

              return (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>
                      {key} {isRequiredKey && <span className="text-red-500 font-bold">*</span>}
                    </span>
                    {isRequiredKey && (
                      <span className="text-[10px] text-slate-400 font-normal">Required</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Update Row</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

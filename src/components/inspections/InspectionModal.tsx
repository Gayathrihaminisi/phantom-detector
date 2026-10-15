import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { RiskAnalysisResult, DiscrepancyType, InspectionStatus } from '../../types';
import { formatINR } from '../../utils/currencyFormatter';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Store,
  DollarSign,
  FileText,
  User,
} from 'lucide-react';

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: RiskAnalysisResult | null;
  onSave: (data: {
    productId: string;
    productName: string;
    storeId: string;
    storeLocation?: string;
    recordedQuantity: number;
    actualShelfQuantity: number;
    shelfAvailability: 'available' | 'unavailable';
    discrepancyType: DiscrepancyType;
    notes: string;
    inspectorName?: string;
    sellingPrice: number | null;
    status: InspectionStatus;
  }) => void;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
}) => {
  if (!product) return null;

  const [actualQty, setActualQty] = useState<number>(0);
  const [shelfAvailability, setShelfAvailability] = useState<'available' | 'unavailable'>('unavailable');
  const [discrepancyType, setDiscrepancyType] = useState<DiscrepancyType>('phantom_stockout_verified');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<InspectionStatus>('resolved');
  const [inspectorName, setInspectorName] = useState<string>('');

  const handleAvailabilityChange = (val: 'available' | 'unavailable') => {
    setShelfAvailability(val);
    if (val === 'available') {
      setActualQty(product.recorded_stock);
      setDiscrepancyType('none_stock_present');
    } else {
      setActualQty(0);
      setDiscrepancyType('phantom_stockout_verified');
    }
  };

  const isVerifiedDiscrepancy =
    shelfAvailability === 'unavailable' ||
    actualQty < product.recorded_stock ||
    discrepancyType !== 'none_stock_present';

  const potentialLoss =
    isVerifiedDiscrepancy && product.selling_price
      ? Math.max(0, (product.recorded_stock - actualQty) * product.selling_price)
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      productId: product.product_id,
      productName: product.product_name,
      storeId: product.store_id,
      storeLocation: product.store_location,
      recordedQuantity: product.recorded_stock,
      actualShelfQuantity: actualQty,
      shelfAvailability,
      discrepancyType,
      notes,
      inspectorName: inspectorName.trim() || undefined,
      sellingPrice: product.selling_price,
      status,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Physical Shelf Inspection Audit"
      subtitle={`Verify physical shelf availability for ${product.product_name}`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Reference Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
            <span className="text-sm font-extrabold">{product.product_name}</span>
            <span className="font-mono text-slate-500">{product.product_id}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 mt-2">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Store Branch</span>
              <span className="font-semibold text-slate-800">{product.store_location || product.store_id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">System Stock</span>
              <span className="font-bold text-teal-700">{product.recorded_stock} units</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Selling Price</span>
              <span className="font-bold text-slate-800">{formatINR(product.selling_price)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Calculated Risk</span>
              <span className="font-bold text-red-600 uppercase">
                {product.risk_category} ({product.risk_score})
              </span>
            </div>
          </div>
        </div>

        {/* Physical Shelf Availability Toggle */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Physical Shelf Availability Status *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleAvailabilityChange('unavailable')}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                shelfAvailability === 'unavailable'
                  ? 'bg-red-50 border-red-400 text-red-800 shadow-sm ring-1 ring-red-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Unavailable / Empty Shelf</span>
            </button>
            <button
              type="button"
              onClick={() => handleAvailabilityChange('available')}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                shelfAvailability === 'available'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm ring-1 ring-emerald-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Available on Shelf</span>
            </button>
          </div>
        </div>

        {/* Quantities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recorded Inventory in System
            </label>
            <input
              type="number"
              disabled
              value={product.recorded_stock}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Actual Counted Physical Units on Shelf *
            </label>
            <input
              type="number"
              min="0"
              value={actualQty}
              onChange={(e) => setActualQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Discrepancy Classification */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Discrepancy Root Cause Classification *
          </label>
          <select
            value={discrepancyType}
            onChange={(e) => setDiscrepancyType(e.target.value as DiscrepancyType)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="phantom_stockout_verified">
              Phantom Stock-Out Verified (Zero physical units, ghost book stock)
            </option>
            <option value="misplaced_stock">
              Misplaced Stock (Found in wrong aisle or back storage)
            </option>
            <option value="damaged_inventory">
              Damaged / Expired Inventory (Present but unsellable)
            </option>
            <option value="theft_suspected">
              Suspected Shrinkage / Unrecorded Shoplifting
            </option>
            <option value="recording_system_lag">
              System Lag / Pending Inward Transfer Not Finalized
            </option>
            <option value="none_stock_present">
              No Discrepancy (Stock is correctly present on shelf)
            </option>
          </select>
        </div>

        {/* Discrepancy Loss Preview Alert */}
        {isVerifiedDiscrepancy ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Verified Discrepancy:</strong> Physical shelf discrepancy confirmed by inspection.
              </span>
            </div>
            {product.selling_price && (
              <span className="font-extrabold text-amber-800">
                Loss: {formatINR(potentialLoss)}
              </span>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Physical audit confirms stock matches system records. No loss confirmed.</span>
          </div>
        )}

        {/* Inspector Name & Audit Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Inspector / Store Manager Name
            </label>
            <input
              type="text"
              placeholder="e.g. Store Floor Lead"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit Resolution Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InspectionStatus)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="resolved">Resolved (Shelf Adjusted / Restocked)</option>
              <option value="in_progress">In Progress (Investigating Backroom)</option>
              <option value="follow_up">Scheduled for Supervisor Follow-up</option>
            </select>
          </div>
        </div>

        {/* Manager Field Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Physical Inspection Observations & Action Taken
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Shelf was completely empty. 12 units recovered behind top shelf divider; restocked 6 packets on front display."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Actions */}
        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Save Inspection & Update Audit Trail</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

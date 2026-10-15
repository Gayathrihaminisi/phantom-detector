import React from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, DollarSign, Calendar, Boxes, Store, Sparkles, ClipboardCheck } from 'lucide-react';
import { RiskAnalysisResult, InspectionRecord } from '../../types';
import { RiskBadge, StatusBadge } from '../ui/Badge';
import { formatINR, calculateRevenue } from '../../utils/currencyFormatter';

interface ProductDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: RiskAnalysisResult | null;
  inspections: InspectionRecord[];
  onStartInspection: (product: RiskAnalysisResult) => void;
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  isOpen,
  onClose,
  product,
  inspections,
  onStartInspection,
}) => {
  if (!isOpen || !product) return null;

  const productInspections = inspections.filter(
    (i) => i.product_id === product.product_id && i.store_id === product.store_id
  );

  const recordedRevenue = calculateRevenue(
    Math.round(product.average_daily_sales),
    product.selling_price
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <RiskBadge category={product.risk_category} score={product.risk_score} />
              <StatusBadge status={product.inspection_status} />
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {product.product_name}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              SKU: {product.product_id} • Category: {product.category}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Recorded Book Stock
              </span>
              <span className="text-base font-black text-slate-800">
                {product.recorded_stock} units
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Unit Selling Price
              </span>
              <span className="text-base font-black text-slate-800">
                {formatINR(product.selling_price)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Avg Daily Demand
              </span>
              <span className="text-sm font-bold text-slate-800">
                {product.average_daily_sales} units/day
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Recent Checkout Velocity
              </span>
              <span className={`text-sm font-bold ${product.recent_daily_sales === 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {product.recent_daily_sales} units/day
              </span>
            </div>
          </div>

          {/* Financial Risk Estimation */}
          <div className="p-4 rounded-xl bg-gradient-to-tr from-amber-50 to-orange-50 border border-amber-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-700" />
                Estimated Sales at Risk
              </span>
              <span className="text-sm font-extrabold text-amber-900">
                {formatINR(product.estimated_sales_at_risk)}
              </span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Based on expected daily demand gap of <strong>{product.daily_sales_gap} units</strong> over an anomaly duration of <strong>{product.anomaly_duration} days</strong> at unit price {formatINR(product.selling_price)}.
            </p>
            <p className="text-[10px] text-amber-700 italic">
              Note: This is an estimated exposure until verified by physical shelf inspection.
            </p>
          </div>

          {/* Explainable Risk Factors */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-teal-600" />
              <span>Anomaly Explanation & Triggered Rules</span>
            </h4>

            {product.detected_factors.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                No anomaly triggers recorded. Sales pattern is consistent with inventory records.
              </p>
            ) : (
              product.detected_factors.map((factor, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{factor.name}</span>
                    <span className="text-[11px] text-red-600">+{factor.effectiveScore} pts</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{factor.explanation}</p>
                </div>
              ))
            )}
          </div>

          {/* Recommended Action */}
          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs space-y-1">
            <span className="font-bold text-teal-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              Recommended Operational Action
            </span>
            <p className="text-teal-900 font-semibold">{product.recommended_action}</p>
            <p className="text-[11px] text-teal-700">
              Prioritize shelf inspection to reconcile physical availability vs system inventory.
            </p>
          </div>

          {/* Inspection History for this item */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Inspection History ({productInspections.length})</span>
            </h4>

            {productInspections.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg">
                No physical shelf inspections logged yet for this item.
              </p>
            ) : (
              <div className="space-y-2">
                {productInspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        Shelf: {insp.shelf_availability.toUpperCase()} ({insp.actual_shelf_quantity} units)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(insp.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Discrepancy: {insp.discrepancy_type.replace(/_/g, ' ')}
                    </p>
                    {insp.notes && (
                      <p className="text-[11px] text-slate-500 italic">Notes: "{insp.notes}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center gap-2 bg-slate-50">
          <button
            onClick={() => onStartInspection(product)}
            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Perform Shelf Inspection</span>
          </button>
        </div>
      </div>
    </div>
  );
};

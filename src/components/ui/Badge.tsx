import React from 'react';
import { RiskCategory, InspectionStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'critical' | 'high' | 'medium' | 'low' | 'info' | 'outline' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  let variantClasses = 'bg-slate-100 text-slate-700 border border-slate-200';

  switch (variant) {
    case 'critical':
      variantClasses = 'bg-red-50 text-red-700 border border-red-200 font-medium';
      break;
    case 'high':
      variantClasses = 'bg-orange-50 text-orange-700 border border-orange-200 font-medium';
      break;
    case 'medium':
      variantClasses = 'bg-amber-50 text-amber-700 border border-amber-200 font-medium';
      break;
    case 'low':
      variantClasses = 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium';
      break;
    case 'info':
      variantClasses = 'bg-teal-50 text-teal-700 border border-teal-200 font-medium';
      break;
    case 'purple':
      variantClasses = 'bg-purple-50 text-purple-700 border border-purple-200 font-medium';
      break;
    case 'outline':
      variantClasses = 'bg-transparent text-slate-600 border border-slate-300';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
};

export const RiskBadge: React.FC<{ category: RiskCategory; score?: number; showScore?: boolean }> = ({
  category,
  score,
  showScore = true,
}) => {
  const label = category.toUpperCase();
  return (
    <Badge variant={category}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{label}</span>
      {showScore && score !== undefined && (
        <span className="opacity-75 font-mono text-[11px]">({score})</span>
      )}
    </Badge>
  );
};

export const StatusBadge: React.FC<{ status: InspectionStatus }> = ({ status }) => {
  switch (status) {
    case 'resolved':
      return <Badge variant="low">Resolved</Badge>;
    case 'in_progress':
      return <Badge variant="info">In Progress</Badge>;
    case 'follow_up':
      return <Badge variant="medium">Follow-up</Badge>;
    case 'pending':
    default:
      return <Badge variant="high">Pending Inspection</Badge>;
  }
};

import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number | string;
    isPositive: boolean;
    label: string;
  };
  color?: 'sky' | 'emerald' | 'amber' | 'indigo' | 'purple' | 'rose' | 'slate';
  id?: string;
}

export default function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = 'sky',
  id
}: KpiCardProps) {
  const colorMap = {
    sky: {
      bg: 'bg-sky-50',
      text: 'text-sky-600',
      iconBg: 'bg-sky-500/10 text-sky-600',
      border: 'hover:border-sky-300'
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      border: 'hover:border-emerald-300'
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      iconBg: 'bg-amber-500/10 text-amber-600',
      border: 'hover:border-amber-300'
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      iconBg: 'bg-indigo-500/10 text-indigo-600',
      border: 'hover:border-indigo-300'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      iconBg: 'bg-purple-500/10 text-purple-600',
      border: 'hover:border-purple-300'
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      iconBg: 'bg-rose-500/10 text-rose-600',
      border: 'hover:border-rose-300'
    },
    slate: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      iconBg: 'bg-slate-500/10 text-slate-600',
      border: 'hover:border-slate-300'
    }
  };

  const selectedColor = colorMap[color];

  return (
    <motion.div
      id={id}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between transition-all shadow-sm ${selectedColor.border}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
            {title}
          </span>
          <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-none pt-1">
            {value}
          </h4>
        </div>
        <div className={`p-2.5 rounded-xl ${selectedColor.iconBg} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(description || trend) && (
        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          {description && <span className="truncate max-w-[70%]">{description}</span>}
          {trend && (
            <span className={`font-bold shrink-0 flex items-center space-x-0.5 ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              <span>{trend.isPositive ? '+' : ''}{trend.value}</span>
              <span className="font-light text-slate-400">({trend.label})</span>
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

import React from 'react';
import { Cpu, Clock, CheckCircle2 } from 'lucide-react';

interface ProcessBlock {
  id: string;
  duration?: number;
  color?: string;
  start?: number;
  end?: number;
}

interface GanttChartWidgetProps {
  processes?: ProcessBlock[];
  timestamps?: number[];
  title?: string;
}

const DEFAULT_PROCESSES: ProcessBlock[] = [
  { id: 'P1', duration: 5, color: '#3b82f6', start: 0, end: 5 },
  { id: 'P2', duration: 3, color: '#8b5cf6', start: 5, end: 8 },
  { id: 'P3', duration: 1, color: '#10b981', start: 8, end: 9 },
];

export const GanttChartWidget: React.FC<GanttChartWidgetProps> = ({
  processes = DEFAULT_PROCESSES,
  timestamps = [0, 5, 8, 9],
  title = 'CPU Scheduling Gantt Chart',
}) => {
  // Color palette for processes
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

  const normalizedProcesses = processes.map((p, idx) => ({
    id: p.id,
    duration: p.duration || 1,
    color: p.color || colors[idx % colors.length],
    start: p.start ?? timestamps[idx] ?? idx * 2,
    end: p.end ?? timestamps[idx + 1] ?? (idx + 1) * 2,
  }));

  const totalDuration = normalizedProcesses.reduce((acc, p) => acc + (p.duration || 1), 0) || 1;

  return (
    <div className="my-4 p-4 rounded-xl border border-blue-500/30 bg-slate-900/90 shadow-md backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>Total: {timestamps[timestamps.length - 1] || totalDuration} ms</span>
        </div>
      </div>

      {/* Gantt Bar */}
      <div className="relative">
        <div className="flex h-12 w-full rounded-lg overflow-hidden border border-slate-700/80 shadow-inner p-0.5 bg-slate-950/80 gap-0.5">
          {normalizedProcesses.map((p, idx) => {
            const flexValue = Math.max(1, p.duration);
            return (
              <div
                key={idx}
                style={{
                  flex: flexValue,
                  backgroundColor: p.color,
                }}
                className="h-full rounded-md flex flex-col items-center justify-center text-white transition-all duration-200 hover:brightness-110 cursor-pointer shadow-sm relative group"
                title={`${p.id}: Runs from ${p.start} to ${p.end} (${p.duration} ms)`}
              >
                <span className="font-bold text-xs tracking-wider drop-shadow-sm font-mono">
                  {p.id}
                </span>
                <span className="text-[10px] opacity-90 drop-shadow-sm font-mono">
                  {p.duration}ms
                </span>

                {/* Tooltip on hover */}
                <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform duration-150 bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-md border border-slate-700 pointer-events-none whitespace-nowrap shadow-xl z-20 font-mono">
                  {p.id} [{p.start} → {p.end}ms] (Burst: {p.duration}ms)
                </div>
              </div>
            );
          })}
        </div>

        {/* Timestamps Row */}
        <div className="flex justify-between items-center px-1 mt-1.5 text-[11px] font-mono text-slate-400">
          {timestamps.map((t, idx) => (
            <span key={idx} className="font-medium">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Execution Sequence Summary */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Execution Order:</span>
          <span className="text-slate-200 font-semibold">
            {normalizedProcesses.map((p) => p.id).join(' → ')}
          </span>
        </div>
        <div className="text-slate-500 text-[10px]">
          Non-Preemptive (RT = WT)
        </div>
      </div>
    </div>
  );
};

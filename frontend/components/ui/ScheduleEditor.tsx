import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { ChevronLeft, ChevronRight, Copy, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_START = 7 * 60; // 7:00
const TIME_END = 20 * 60; // 20:00 (8pm)
const TIME_STEP = 30; // 30 min
const TIME_SLOTS = Array.from({ length: (TIME_END - TIME_START) / TIME_STEP }, (_, i) => TIME_START + i * TIME_STEP);

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function getBlocksForDay(day) {
  if (!day || day.isOff) return [];
  return day.blocks || [];
}

export default function ScheduleEditor({
  value = Array(7).fill({ isOff: true, blocks: [] }),
  onChange,
  readOnly = false,
  weekStart,
  onWeekChange,
  isDefault = false,
  onCopyToAll,
  onCopyPrevWeek,
  conflicts = [],
}: {
  value: { isOff: boolean; blocks: { start: string; end: string }[] }[];
  onChange?: (days: any[]) => void;
  readOnly?: boolean;
  weekStart?: Date;
  onWeekChange?: (date: Date) => void;
  isDefault?: boolean;
  onCopyToAll?: () => void;
  onCopyPrevWeek?: () => void;
  conflicts?: { day: number; start: string; end: string; type: string; }[];
}) {
  const [drag, setDrag] = useState<{ day: number; start: number; end: number } | null>(null);

  function handleCellClick(dayIdx, slotIdx) {
    if (readOnly) return;
    const minutes = TIME_SLOTS[slotIdx];
    const day = value[dayIdx];
    if (day.isOff) return;
    // Toggle this 30-min block in the day's blocks
    let blocks = getBlocksForDay(day).map(b => ({ ...b }));
    const slotStart = minutes;
    const slotEnd = minutes + TIME_STEP;
    // Check if this block overlaps any existing
    let found = false;
    for (let i = 0; i < blocks.length; i++) {
      const bStart = parseTime(blocks[i].start);
      const bEnd = parseTime(blocks[i].end);
      if (slotStart >= bStart && slotEnd <= bEnd) {
        // Remove this slot from the block
        blocks = splitBlock(blocks, i, slotStart, slotEnd);
        found = true;
        break;
      }
    }
    if (!found) {
      // Add as new block
      blocks.push({ start: formatSlot(slotStart), end: formatSlot(slotEnd) });
      blocks = mergeBlocks(blocks);
    }
    updateDay(dayIdx, { ...day, blocks });
  }

  function updateDay(dayIdx, newDay) {
    const days = value.map((d, i) => (i === dayIdx ? newDay : d));
    onChange && onChange(days);
  }

  function handleOffToggle(dayIdx) {
    if (readOnly) return;
    const day = value[dayIdx];
    updateDay(dayIdx, { ...day, isOff: !day.isOff, blocks: day.isOff ? [] : day.blocks });
  }

  function handleDragStart(dayIdx, slotIdx) {
    if (readOnly) return;
    setDrag({ day: dayIdx, start: slotIdx, end: slotIdx });
  }
  function handleDragEnter(dayIdx, slotIdx) {
    if (readOnly || !drag || drag.day !== dayIdx) return;
    setDrag({ ...drag, end: slotIdx });
  }
  function handleDragEnd() {
    if (!drag) return;
    const { day, start, end } = drag;
    const s = Math.min(start, end);
    const e = Math.max(start, end);
    const startMin = TIME_SLOTS[s];
    const endMin = TIME_SLOTS[e] + TIME_STEP;
    const blocks = mergeBlocks([...getBlocksForDay(value[day]), { start: formatSlot(startMin), end: formatSlot(endMin) }]);
    updateDay(day, { ...value[day], isOff: false, blocks });
    setDrag(null);
  }

  function formatSlot(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  function parseTime(str) {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  }
  function mergeBlocks(blocks) {
    // Merge overlapping/adjacent blocks
    const sorted = blocks.slice().sort((a, b) => parseTime(a.start) - parseTime(b.start));
    const merged = [];
    for (const b of sorted) {
      if (!merged.length) merged.push({ ...b });
      else {
        const last = merged[merged.length - 1];
        if (parseTime(b.start) <= parseTime(last.end)) {
          last.end = formatSlot(Math.max(parseTime(last.end), parseTime(b.end)));
        } else {
          merged.push({ ...b });
        }
      }
    }
    return merged;
  }
  function splitBlock(blocks, idx, slotStart, slotEnd) {
    const b = blocks[idx];
    const bStart = parseTime(b.start);
    const bEnd = parseTime(b.end);
    const newBlocks = blocks.slice(0, idx).concat(blocks.slice(idx + 1));
    if (slotStart > bStart) newBlocks.push({ start: formatSlot(bStart), end: formatSlot(slotStart) });
    if (slotEnd < bEnd) newBlocks.push({ start: formatSlot(slotEnd), end: formatSlot(bEnd) });
    return mergeBlocks(newBlocks);
  }

  return (
    <Card className="w-full max-w-3xl p-6 bg-white dark:bg-gray-900 shadow-lg border border-accent">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <span className="font-semibold text-lg">{isDefault ? 'Default Weekly Schedule' : weekStart ? `Week of ${weekStart.toLocaleDateString()}` : 'Schedule'}</span>
        </div>
        <div className="flex gap-2">
          {onWeekChange && !isDefault && (
            <>
              <Button variant="outline" size="icon" onClick={() => onWeekChange(new Date(weekStart.getTime() - 7 * 86400000))}><ChevronLeft /></Button>
              <Button variant="outline" size="icon" onClick={() => onWeekChange(new Date(weekStart.getTime() + 7 * 86400000))}><ChevronRight /></Button>
            </>
          )}
          {onCopyToAll && <Button variant="outline" size="sm" onClick={onCopyToAll}><Copy className="w-4 h-4 mr-1" />Copy to All Days</Button>}
          {onCopyPrevWeek && <Button variant="outline" size="sm" onClick={onCopyPrevWeek}><Copy className="w-4 h-4 mr-1" />Copy Previous Week</Button>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="w-24 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Time</th>
              {DAYS.map((d, i) => (
                <th key={d} className="text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  <div className="flex flex-col items-center">
                    <span>{d}</span>
                    <Button
                      variant={value[i]?.isOff ? 'destructive' : 'outline'}
                      size="sm"
                      className="mt-1"
                      onClick={() => handleOffToggle(i)}
                      disabled={readOnly}
                    >
                      {value[i]?.isOff ? 'Off' : 'Available'}
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((mins, slotIdx) => (
              <tr key={mins}>
                <td className="text-xs text-gray-500 pr-2 whitespace-nowrap">{formatTime(mins)}</td>
                {DAYS.map((_, dayIdx) => {
                  const day = value[dayIdx];
                  const isOff = day?.isOff;
                  const blocks = getBlocksForDay(day);
                  const inBlock = blocks.some(b => parseTime(b.start) <= mins && mins < parseTime(b.end));
                  const conflict = conflicts.find(c => c.day === dayIdx && parseTime(c.start) <= mins && mins < parseTime(c.end));
                  return (
                    <td
                      key={dayIdx}
                      className={clsx(
                        'h-8 w-16 text-center align-middle border border-gray-200 dark:border-gray-700 cursor-pointer transition',
                        isOff && 'bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed',
                        inBlock && 'bg-primary/80 text-white font-semibold',
                        conflict && 'bg-red-200 dark:bg-red-700 text-red-900 dark:text-red-100',
                        !isOff && !inBlock && 'hover:bg-primary/10'
                      )}
                      onClick={() => handleCellClick(dayIdx, slotIdx)}
                      onMouseDown={() => handleDragStart(dayIdx, slotIdx)}
                      onMouseEnter={() => handleDragEnter(dayIdx, slotIdx)}
                      onMouseUp={handleDragEnd}
                    >
                      {conflict && <AlertTriangle className="w-4 h-4 inline text-red-600 dark:text-red-200" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-xs text-gray-500">
        <span className="inline-block mr-4"><span className="inline-block w-3 h-3 rounded bg-primary/80 mr-1" /> Available</span>
        <span className="inline-block mr-4"><span className="inline-block w-3 h-3 rounded bg-gray-200 dark:bg-gray-700 mr-1" /> Off</span>
        <span className="inline-block mr-4"><span className="inline-block w-3 h-3 rounded bg-red-200 dark:bg-red-700 mr-1" /> Conflict</span>
      </div>
    </Card>
  );
} 
import { useId, useMemo, useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';

/**
 * A single-series daily area chart, drawn as inline SVG.
 *
 * No charting library: the panel has none, and one series over a date axis is
 * a path and a fill. Adding a dependency for it would cost more than it saves.
 *
 * Follows the house mark specs: a 2px line with round joins, the series hue at
 * ~10% as the fill wash, hairline recessive gridlines, and an >=8px end marker
 * carrying a 2px ring in the surface colour so it reads against the line.
 *
 * The series colour is passed in already validated against both surfaces - see
 * the note at its call site. It is one hue, not a categorical slot: a single
 * series needs no legend, because the card's title names it.
 *
 * Three things make the values reachable without a pointer, because a tooltip
 * must enhance rather than gate:
 *
 *   - the peak is direct-labelled, so the one number that matters is on the
 *     chart itself rather than behind a hover
 *   - the plot is focusable and the arrow keys walk the crosshair, showing the
 *     same readout focus-by-focus that hover shows
 *   - a table view toggles in place, which is the WCAG-clean twin: every day
 *     and value as text, no colour and no pointer required
 */

export interface DailyPoint {
  /** ISO `YYYY-MM-DD`. */
  day: string;
  value: number;
}

interface Props {
  points: DailyPoint[];
  /** What one unit is, for the tooltip: "edits", "submissions". */
  unit: string;
  /** Series colour. Same step in both modes - see DashboardPage. */
  color: string;
  /** Rendered height in px; width is fluid. */
  height?: number;
}

/** The viewBox is fixed and the SVG scales - so geometry is computed once. */
const VB_WIDTH = 720;
const PAD = { top: 12, right: 12, bottom: 22, left: 40 };

/** Rounds an axis maximum up to something a reader can hold: 1 / 2 / 5 x 10^n. */
function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

const compact = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);

/** "2026-09-30" -> "30 Sep", without dragging in a date library. */
function shortDay(iso: string): string {
  const [, month, day] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${Number(day)} ${months[Number(month) - 1] ?? ''}`.trim();
}

export function DailyAreaChart({ points, unit, color, height = 180 }: Props) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  /** The extreme, direct-labelled - the one value worth reading without hovering. */
  const peakIndex = useMemo(() => {
    let best = 0;
    points.forEach((p, i) => {
      if (p.value > points[best].value) best = i;
    });
    return points.length > 0 && points[best].value > 0 ? best : null;
  }, [points]);

  const geometry = useMemo(() => {
    const plotWidth = VB_WIDTH - PAD.left - PAD.right;
    const plotHeight = height - PAD.top - PAD.bottom;
    const max = niceMax(Math.max(...points.map((p) => p.value), 0));

    // A single point would divide by zero; it sits at the left edge instead.
    const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;
    const x = (i: number) => PAD.left + i * stepX;
    const y = (v: number) => PAD.top + plotHeight - (max === 0 ? 0 : (v / max) * plotHeight);

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
    const area =
      points.length > 0
        ? `${line} L ${x(points.length - 1)} ${PAD.top + plotHeight} L ${x(0)} ${PAD.top + plotHeight} Z`
        : '';

    return { plotWidth, plotHeight, max, x, y, line, area };
  }, [points, height]);

  const { plotHeight, max, x, y, line, area } = geometry;

  /** Three gridlines including the baseline - enough to read against, no more. */
  const ticks = [0, max / 2, max];

  const active = hover !== null ? points[hover] : null;

  /*
   * The crosshair finds the X: the pointer's position maps to the nearest day,
   * so the reader aims at a date rather than at a 2px line.
   */
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const vbX = ratio * VB_WIDTH;
    const stepX = points.length > 1 ? (VB_WIDTH - PAD.left - PAD.right) / (points.length - 1) : 1;
    const index = Math.round((vbX - PAD.left) / stepX);
    setHover(Math.max(0, Math.min(points.length - 1, index)));
  };

  /** The arrow keys walk the crosshair, so focus reads what hover reads. */
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setHover((current) => {
      const from = current ?? points.length - 1;
      const next = e.key === 'ArrowLeft' ? from - 1 : from + 1;
      return Math.max(0, Math.min(points.length - 1, next));
    });
  };

  const toggle = (
    <button
      type="button"
      onClick={() => setAsTable((v) => !v)}
      className="absolute right-0 top-0 z-20 inline-flex items-center gap-1 rounded-lg border border-cream-300 bg-white px-2 py-1 text-[11px] font-medium text-charcoal-light transition-colors hover:text-charcoal dark:border-navy-800 dark:bg-navy-950 dark:text-navy-300 dark:hover:text-cream-100"
    >
      {asTable ? <BarChart3 className="h-3 w-3" /> : <Table2 className="h-3 w-3" />}
      {asTable ? 'Chart' : 'Table'}
    </button>
  );

  /*
   * The table view: the same numbers as text. Days with nothing are dropped -
   * on a mostly quiet month a table of thirty rows reading 0 buries the few
   * that matter, and the chart already shows that the rest were quiet.
   */
  if (asTable) {
    const rows = points.filter((p) => p.value > 0);
    return (
      /* pt-7 clears the toggle, same as the chart view. */
      <div className="relative pt-7">
        {toggle}
        <div className="max-h-[180px] overflow-y-auto">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-charcoal-light dark:text-navy-300">
              Nothing recorded in this period.
            </p>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">{unit} per day</caption>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-charcoal-light dark:text-navy-300">
                  <th scope="col" className="pb-1 font-medium">
                    Day
                  </th>
                  <th scope="col" className="pb-1 text-right font-medium">
                    {unit}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200 dark:divide-navy-800">
                {rows.map((p) => (
                  <tr key={p.day}>
                    <td className="py-1.5 text-charcoal dark:text-cream-100">
                      {shortDay(p.day)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-charcoal dark:text-cream-100">
                      {p.value.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    /* pt-7 clears the toggle, so the button never sits over the plot. */
    <div className="relative pt-7">
      {toggle}
      <svg
        viewBox={`0 0 ${VB_WIDTH} ${height}`}
        width="100%"
        height={height}
        role="img"
        tabIndex={0}
        aria-label={`${unit} per day over the last ${points.length} days. Use the arrow keys to read each day, or switch to the table view.`}
        className="touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setHover(null)}
      >
        <defs>
          {/* The wash, not a saturated block: ~10% at the top, fading out. */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Gridlines: hairline, solid, one step off the surface - recessive. */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={VB_WIDTH - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-cream-300 dark:stroke-navy-800"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 3.5}
              textAnchor="end"
              className="fill-charcoal-light text-[10px] dark:fill-navy-300"
            >
              {compact(Math.round(t))}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* First and last date only - a label under every day would collide. */}
        {points.length > 0 && (
          <>
            <text
              x={PAD.left}
              y={height - 6}
              className="fill-charcoal-light text-[10px] dark:fill-navy-300"
            >
              {shortDay(points[0].day)}
            </text>
            <text
              x={VB_WIDTH - PAD.right}
              y={height - 6}
              textAnchor="end"
              className="fill-charcoal-light text-[10px] dark:fill-navy-300"
            >
              {shortDay(points[points.length - 1].day)}
            </text>
          </>
        )}

        {/*
          The peak, labelled on the chart - selective labelling, not a number
          on every point. Hidden while hovering so it never sits under the
          readout, and nudged inward at the edges so it cannot overflow.
        */}
        {peakIndex !== null && hover === null && (
          <text
            x={Math.min(VB_WIDTH - PAD.right - 2, Math.max(PAD.left + 2, x(peakIndex)))}
            y={Math.max(PAD.top + 9, y(points[peakIndex].value) - 7)}
            textAnchor={
              peakIndex === 0
                ? 'start'
                : peakIndex === points.length - 1
                  ? 'end'
                  : 'middle'
            }
            className="fill-charcoal text-[10px] font-semibold dark:fill-cream-100"
          >
            {points[peakIndex].value.toLocaleString()}
          </text>
        )}

        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
              className="stroke-charcoal-light/40 dark:stroke-navy-300/40"
              strokeWidth="1"
            />
            {/* >=8px marker with a 2px surface ring, so it reads on the line. */}
            <circle
              cx={x(hover)}
              cy={y(points[hover].value)}
              r="4.5"
              fill={color}
              className="stroke-white dark:stroke-navy-950"
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      {/*
        The readout: value leads, label follows - the reader already has the
        series from the card title and wants the number. Positioned by ratio so
        it tracks the crosshair without re-measuring the SVG.
      */}
      {active && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-cream-300 bg-white px-2.5 py-1.5 text-center shadow-md dark:border-navy-800 dark:bg-navy-950"
          style={{
            left: `${Math.min(92, Math.max(8, ((hover ?? 0) / Math.max(1, points.length - 1)) * 100))}%`,
          }}
        >
          <p className="text-sm font-bold leading-none tabular-nums text-charcoal dark:text-cream-100">
            {active.value.toLocaleString()}
          </p>
          <p className="mt-1 whitespace-nowrap text-[11px] leading-none text-charcoal-light dark:text-navy-300">
            {unit} · {shortDay(active.day)}
          </p>
        </div>
      )}
    </div>
  );
}

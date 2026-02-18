interface RadarDimension {
  label: string;
  value: number; // 0–100
}

interface RadarChartProps {
  dimensions: RadarDimension[];
  size?: number;
}

function polarPoint(cx: number, cy: number, r: number, index: number, total: number) {
  const angleDeg = (index * (360 / total)) - 90;
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pentagonPath(cx: number, cy: number, r: number, total: number) {
  const pts = Array.from({ length: total }, (_, i) => polarPoint(cx, cy, r, i, total));
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") + " Z";
}

function dataPath(cx: number, cy: number, maxR: number, dims: RadarDimension[]) {
  const pts = dims.map((d, i) => {
    const r = (d.value / 100) * maxR;
    return polarPoint(cx, cy, r, i, dims.length);
  });
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") + " Z";
}

const GRID_LEVELS = [25, 50, 75, 100];

export function RadarChart({ dimensions, size = 300 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36; // leave room for labels
  const labelR = maxR + 22;
  const n = dimensions.length;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Skill radar chart">
      {/* Grid pentagons */}
      {GRID_LEVELS.map((lvl) => (
        <path
          key={lvl}
          d={pentagonPath(cx, cy, (lvl / 100) * maxR, n)}
          fill="none"
          stroke="var(--border, #e5e7eb)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {dimensions.map((_, i) => {
        const outer = polarPoint(cx, cy, maxR, i, n);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x.toFixed(2)}
            y2={outer.y.toFixed(2)}
            stroke="var(--border, #e5e7eb)"
            strokeWidth={1}
          />
        );
      })}

      {/* Filled data polygon */}
      <path
        d={dataPath(cx, cy, maxR, dimensions)}
        fill="var(--accent, #2563eb)"
        fillOpacity={0.2}
        stroke="var(--accent, #2563eb)"
        strokeWidth={2}
      />

      {/* Data point dots */}
      {dimensions.map((d, i) => {
        const r = (d.value / 100) * maxR;
        const pt = polarPoint(cx, cy, r, i, n);
        return (
          <circle
            key={i}
            cx={pt.x.toFixed(2)}
            cy={pt.y.toFixed(2)}
            r={4}
            fill="var(--accent, #2563eb)"
          />
        );
      })}

      {/* Labels */}
      {dimensions.map((d, i) => {
        const pt = polarPoint(cx, cy, labelR, i, n);
        const anchor =
          Math.abs(pt.x - cx) < 2 ? "middle" : pt.x < cx ? "end" : "start";
        return (
          <text
            key={i}
            x={pt.x.toFixed(2)}
            y={pt.y.toFixed(2)}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={11}
            fill="currentColor"
            fontWeight={600}
          >
            {d.label}
          </text>
        );
      })}

      {/* Value labels */}
      {dimensions.map((d, i) => {
        const r = (d.value / 100) * maxR;
        const pt = polarPoint(cx, cy, r, i, n);
        if (d.value === 0) return null;
        return (
          <text
            key={i}
            x={(pt.x + (pt.x > cx ? 8 : pt.x < cx ? -8 : 0)).toFixed(2)}
            y={(pt.y - 8).toFixed(2)}
            textAnchor="middle"
            fontSize={10}
            fill="var(--accent, #2563eb)"
            fontWeight={700}
          >
            {d.value}
          </text>
        );
      })}
    </svg>
  );
}

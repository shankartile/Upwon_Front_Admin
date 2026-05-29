import { useMemo } from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card';

export function TrafficChart({ seed = 1 }: { seed?: number }) {
  const data = useMemo(() => {
    const days = 14;
    return Array.from({ length: days }, (_, i) => {
      const base = 30 + Math.sin((i + seed) * 0.7) * 12 + Math.random() * 18;
      return Math.max(8, Math.round(base + i * 1.4));
    });
  }, [seed]);
  const max = Math.max(...data);
  const width = 560, height = 160, pad = 8;
  const stepX = (width - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((v / max) * (height - pad * 2));
    return `${x},${y}`;
  }).join(' ');
  const areaPath =
    `M ${pad},${height - pad} L ${points.replace(/ /g, ' L ')} L ${pad + (data.length - 1) * stepX},${height - pad} Z`;

  return (
    <Card>
      <CardHeader title="Traffic — last 14 days" subtitle="Unique visitors across all pages" />
      <CardBody>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
          <defs>
            <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#E85D26" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#E85D26" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#grad)" />
          <polyline points={points} fill="none" stroke="#E85D26" strokeWidth={2} />
        </svg>
      </CardBody>
    </Card>
  );
}

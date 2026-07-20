import React, { useId, useState } from 'react';

interface SparklineProps {
  data: number[];
  positive?: boolean;
  width?: number;
  height?: number;
}

export function Sparkline({ data, positive = true, width = 80, height = 32 }: SparklineProps) {
  const id = useId();
  const [hover, setHover] = useState(false);

  if (!data || data.length < 2) return <div style={{ width, height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || Math.max(Math.abs(min), Math.abs(max)) * 0.02 || 1;
  const pad = height * 0.14;

  const pts = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: pad + (height - pad * 2) * (1 - (value - min) / range),
  }));

  const buildSplinePath = (points: { x: number; y: number }[]) => {
    if (points.length === 2) {
      return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
    }

    const controlPoints = points.map((point, index) => {
      if (index === 0 || index === points.length - 1) return { cp1: point, cp2: point };
      const prev = points[index - 1];
      const next = points[index + 1];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      return {
        cp1: { x: point.x - dx / 6, y: point.y - dy / 6 },
        cp2: { x: point.x + dx / 6, y: point.y + dy / 6 },
      };
    });

    return points.reduce((acc, point, index) => {
      if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      const prev = points[index - 1];
      const cp1 = controlPoints[index - 1].cp2;
      const cp2 = controlPoints[index].cp1;
      return `${acc} C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }, '');
  };

  const linePath = buildSplinePath(pts);
  const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const color = positive ? '#10b981' : '#ef4444';
  const strokeColor = positive ? '#059669' : '#dc2626';
  const gradId = `spk-${id.replace(/:/g, '')}`;

  const baselineY = height - pad * 1.4;
  const dotRadius = hover ? 4.4 : 3.2;

  return (
    <div
      style={{ width, height, display: 'inline-block', cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block', overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.24" />
            <stop offset="60%" stopColor={color} stopOpacity="0.10" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        <line
          x1={0}
          x2={width}
          y1={baselineY}
          y2={baselineY}
          stroke={strokeColor}
          strokeWidth="1"
          opacity="0.16"
        />
        <path d={fillPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          stroke={strokeColor}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r={dotRadius}
          fill={strokeColor}
          stroke="#ffffff"
          strokeWidth="1"
          style={{ transition: 'r 120ms ease, opacity 120ms ease' }}
        />
      </svg>
    </div>
  );
}

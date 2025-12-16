export default function BarChart({
  data = [],
  colors = ["#3b82f6", "#fb923c"],
}: {
  data?: number[];
  colors?: string[];
}) {
  const max = Math.max(...data, 1);
  const width = 400;
  const height = 160;
  const barWidth = Math.floor(width / data.length) - 8;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="160"
      className="rounded"
    >
      <rect width="100%" height="100%" rx="8" fill="transparent" />
      {data.map((v, i) => {
        const h = (v / max) * (height - 24);
        const x = i * (barWidth + 8) + 16;
        const y = height - h - 16;
        const color = colors[i % colors.length];
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={4}
            fill={color}
          />
        );
      })}
      {/* x-axis line */}
      <line
        x1="12"
        y1={height - 12}
        x2={width - 12}
        y2={height - 12}
        stroke="#1f2937"
        strokeWidth="1"
      />
    </svg>
  );
}

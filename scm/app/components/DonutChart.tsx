export default function DonutChart({
  segments = [],
}: {
  segments?: { label: string; value: number; color?: string }[];
}) {
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0) || 1;
  const size = 140;
  const radius = size / 2;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const value = seg.value || 0;
        const portion = value / total;
        const dash = portion * Math.PI * 2 * radius;
        const circ = Math.PI * 2 * radius;
        const strokeDasharray = `${(portion * 100).toFixed(4)} ${(
          (1 - portion) *
          100
        ).toFixed(4)}`;
        const start = offset;
        const stroke =
          seg.color || ["#34d399", "#60a5fa", "#f97316", "#a78bfa"][i % 4];
        offset += portion;
        return (
          <circle
            key={i}
            r={radius - 12}
            cx={radius}
            cy={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={20}
            strokeDasharray={circ * portion + " " + circ * (1 - portion)}
            strokeDashoffset={-circ * start}
            transform={`rotate(-90 ${radius} ${radius})`}
          />
        );
      })}
      <circle cx={radius} cy={radius} r={radius - 32} fill="#071022" />
    </svg>
  );
}

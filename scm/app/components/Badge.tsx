export default function Badge({
  children,
  color = "gray",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  const bg =
    color === "green"
      ? "bg-green-600"
      : color === "yellow"
      ? "bg-yellow-600"
      : "bg-gray-600";
  return (
    <span
      className={`text-sm px-3 py-1 rounded-full ${bg} text-white font-bold shadow-sm`}
    >
      {children}
    </span>
  );
}

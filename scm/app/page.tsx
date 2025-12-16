import Link from "next/link";
import BarChart from "./components/BarChart";
import DonutChart from "./components/DonutChart";

export default function Home() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 bg-[#071022] rounded-lg p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Product sales</h2>
                  <p className="text-sm text-gray-400">
                    Overview of recent sales
                  </p>
                </div>
              </div>

              <div className="h-48 rounded-lg p-2 text-sm text-gray-300">
                <BarChart
                  data={[120, 180, 240, 320, 260, 360]}
                  colors={["#2563eb", "#fb923c"]}
                />
              </div>
            </div>

            <div className="bg-[#071022] rounded-lg p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-2">
                Sales by product category
              </h3>
              <div className="h-40 bg-[#0b1722] rounded p-3 flex items-center justify-center">
                <DonutChart
                  segments={[
                    { label: "Living room", value: 25, color: "#60a5fa" },
                    { label: "Kids", value: 17, color: "#34d399" },
                    { label: "Office", value: 13, color: "#f97316" },
                  ]}
                />
              </div>
            </div>

            <div className="bg-[#071022] rounded-lg p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-2">Sales by countries</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div>Poland — 19%</div>
                <div>Austria — 15%</div>
                <div>Spain — 13%</div>
                <div>Romania — 12%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-4">
          <div className="bg-[#071022] rounded-lg p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-2">Quick stats</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-[#0b1722] p-3 rounded">
                Total customers
                <br />
                <strong>567,899</strong>
              </div>
              <div className="bg-[#0b1722] p-3 rounded">
                Total revenue
                <br />
                <strong>$3,465 M</strong>
              </div>
              <div className="bg-[#0b1722] p-3 rounded">
                Total orders
                <br />
                <strong>1,136 M</strong>
              </div>
              <div className="bg-[#0b1722] p-3 rounded">
                Total returns
                <br />
                <strong>1,789</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

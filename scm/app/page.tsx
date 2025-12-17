import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Segment {
  label: string;
  value: number;
  color: string;
}

const BarChart = ({ data, labels }: { data: number[]; labels: string[] }) => {
  const max = Math.max(...data);

  return (
    <div className="w-full h-full flex flex-col justify-end relative">
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-t border-gray-700/40" />
        ))}
      </div>

      <div className="flex items-end justify-around gap-8 h-full relative z-10">
        {data.map((value, index) => {
          const height = (value / max) * 85;

          return (
            <div
              key={index}
              className="flex flex-col items-center justify-end flex-1 gap-2 h-full"
            >
              <span className="text-xs text-gray-400">${value}k</span>
              <div
                className="w-full max-w-16 rounded-lg relative group cursor-pointer bg-gradient-to-t from-gray-700 via-gray-600 to-gray-500 hover:brightness-110 transition-all"
                style={{ height: `${height}%`, minHeight: "40px" }}
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur px-3 py-1.5 rounded-md text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-20 whitespace-nowrap">
                  Revenue: ${value}k
                </div>
              </div>
              <span className="text-sm text-gray-300 font-medium">
                {labels[index]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LineChart = ({ data }: { data: number[] }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 80;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="h-20">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6b7280" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6b7280" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,100 ${points} 100,100`} fill="url(#lineFill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  trend: "up" | "down";
}) => (
  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-700/50">
    <div className="flex justify-between mb-4">
      <div className="p-3 bg-gray-700/30 rounded-lg">
        <Icon className="w-6 h-6 text-gray-300" />
      </div>
      <div
        className={`flex items-center gap-1 text-sm ${
          trend === "up" ? "text-green-400" : "text-red-400"
        }`}
      >
        {trend === "up" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        {change}
      </div>
    </div>
    <p className="text-gray-400 text-sm">{title}</p>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

export default function Dashboard() {
  const salesData = [145, 210, 185, 295, 340, 410];
  const salesLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const revenueData = [320, 380, 350, 420, 460, 490, 510];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-2">
              Welcome back! Here's what's happening today.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Revenue"
            value="$3.46M"
            change="+12.5%"
            icon={DollarSign}
            trend="up"
          />
          <StatCard
            title="Orders"
            value="1,136"
            change="+8.2%"
            icon={ShoppingCart}
            trend="up"
          />
          <StatCard
            title="Customers"
            value="567,899"
            change="+23.1%"
            icon={Users}
            trend="up"
          />
          <StatCard
            title="Returns"
            value="1,789"
            change="-4.3%"
            icon={Package}
            trend="down"
          />
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-700/50">
          <h2 className="text-xl font-semibold text-white mb-1">
            Product Sales
          </h2>
          <p className="text-sm text-gray-400 mb-6">Monthly sales overview</p>
          <div className="h-64">
            <BarChart data={salesData} labels={salesLabels} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Revenue Trend
              </h3>
              <p className="text-sm text-gray-400 mt-1">This week's revenue</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-green-400">
                <TrendingUp className="w-5 h-5" />
                <span className="text-lg font-semibold">+15.3%</span>
              </div>
              <p className="text-xs text-gray-400">vs last week</p>
            </div>
          </div>
          <div className="mb-6">
            <p className="text-3xl font-bold text-white">$510k</p>
          </div>
          <LineChart data={revenueData} />
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-700 mt-6">
            <div>
              <p className="text-xs text-gray-400">Avg Order</p>
              <p className="text-lg font-semibold text-white">$142</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Conversion</p>
              <p className="text-lg font-semibold text-white">3.2%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Growth</p>
              <p className="text-lg font-semibold text-green-400">+8.1%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
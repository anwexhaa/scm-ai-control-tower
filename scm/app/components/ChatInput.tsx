"use client";
import { useState } from "react";

export default function ChatInput({
  placeholder = "Ask a question about your documents...",
}: {
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0f172a] border border-gray-700 text-gray-200 placeholder-gray-500 rounded-lg px-4 py-2 text-sm focus:outline-none"
    />
  );
}

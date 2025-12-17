"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { BookOpen, BarChart3, Send } from "lucide-react";

export default function AskPage() {
  const [q, setQ] = useState("");
  const [conversation, setConversation] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!q.trim()) return;

    const userQuestion = q;
    setQ("");
    setConversation((prev) => [...prev, { type: "user", text: userQuestion }]);
    setLoading(true);

    try {
      const res = await fetch("/api/rag", {
        method: "POST",
        body: JSON.stringify({ question: userQuestion }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      setConversation((prev) => [...prev, { type: "ai", data: json }]);
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        { type: "ai", data: { error: "Request failed" } },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#212121]">
      <style jsx global>{`
        /* Custom scrollbar */
        .chat-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .chat-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-scroll::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 3px;
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        .chat-scroll {
          scrollbar-width: thin;
          scrollbar-color: #444 transparent;
        }
      `}</style>

      {/* Header */}
      <div className="bg-[#171717] border-b border-[#2a2a2a] p-4">
        <h2 className="text-2xl font-bold text-white">Ask Questions</h2>
        <p className="text-gray-400 text-sm">
          Ask RAG-powered questions over your uploaded documents
        </p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
        {conversation.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Ask a question to get started...</p>
          </div>
        )}

        {conversation.map((msg, idx) => (
          <div
            key={idx}
            className={`flex mb-6 ${
              msg.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.type === "user" ? (
              <div className="bg-[#2f2f2f] rounded-lg p-4 max-w-[80%] border border-[#3a3a3a] text-white rounded-br-none">
                <div className="text-sm font-semibold mb-1 text-right text-gray-300">
                  You
                </div>
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            ) : (
              <div className="bg-[#2a2a2a] rounded-lg p-4 max-w-[80%] border border-[#3a3a3a] rounded-bl-none space-y-4">
                <div className="text-sm font-semibold text-gray-300 mb-2">
                  Assistant
                </div>

                {msg.data.error ? (
                  <div className="bg-red-900/20 text-red-400 p-3 rounded border border-red-800">
                    {msg.data.error}
                  </div>
                ) : (
                  <>
                    {/* Answer */}
                    <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-gray-200">
                      <ReactMarkdown>{msg.data.answer}</ReactMarkdown>
                    </div>

                    {/* Context Sources */}
                    {msg.data.show_evaluation_and_sources &&
                      msg.data.sources &&
                      msg.data.sources.length > 0 && (
                        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333] mt-4">
                          <div className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Context Sources
                          </div>
                          <div className="space-y-2 text-sm text-gray-300">
                            {msg.data.sources.map((src: any, i: number) => (
                              <div
                                key={i}
                                className="bg-[#252525] rounded p-3 border border-[#333]"
                              >
                                <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                                  <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                                    {src.source}
                                  </span>
                                  <span>Page {src.page}</span>
                                </div>
                                <div className="leading-relaxed">{src.text}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Evaluation Scores: ROUGE-L and Faithfulness */}
                    {msg.data.show_evaluation_and_sources && msg.data.evaluation && (
                      <div className="flex gap-4 mt-4">
                        {/* ROUGE-L green card */}
                        <div className="bg-green-700 rounded-lg p-4 border border-green-900 text-sm text-green-200 flex items-center gap-2 font-semibold">
                          <BarChart3 className="w-5 h-5" />
                          ROUGE-L: {(msg.data.evaluation.rougeL).toFixed(1)}%
                        </div>

                        {/* Faithfulness blue card */}
                        {msg.data.evaluation.faithfulness && (
                        <div className="bg-blue-700 rounded-lg p-4 border border-blue-900 text-sm text-blue-200 flex items-center gap-2 font-semibold">
                          <BarChart3 className="w-5 h-5" />
                          Faithfulness:{" "}
                          {msg.data.evaluation.faithfulness.faithfulness_percentage ?? "N/A"}%
                        </div>
                      )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start mb-6">
            <div className="bg-[#2a2a2a] rounded-lg p-4 border border-[#3a3a3a] rounded-bl-none">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar at Bottom */}
      <div className="bg-[#171717] border-t border-[#2a2a2a] p-4 sticky bottom-0 z-10">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !loading && submit()}
            placeholder="Ask your question..."
            disabled={loading}
            className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50 placeholder-gray-500"
          />
          <button
            onClick={submit}
            disabled={loading || !q.trim()}
            className="bg-[#2a2a2a] hover:bg-[#333] disabled:bg-[#1a1a1a] disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 border border-[#3a3a3a]"
          >
            {loading ? (
              "•••"
            ) : (
              <>
                <Send className="w-4 h-4" />
                Ask
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

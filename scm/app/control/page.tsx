import Card from "../components/Card";
import Badge from "../components/Badge";
import ChatInput from "../components/ChatInput";
import Link from "next/link";

export default function ControlPage() {
  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      <section className="col-span-8">
        <h1 className="text-2xl font-bold mb-2">
          Supply Chain Agentic AI Control Tower
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          RAG-powered agentic intelligence for inventory management
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/upload">
            <Card className="cursor-pointer hover:shadow-lg">
              <div className="flex flex-col gap-2">
                <div className="text-lg font-semibold">Upload Knowledge</div>
                <div className="text-sm text-gray-400">
                  Ingest documents (PDF, TXT, DOCX) for RAG indexing
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/ask">
            <Card className="cursor-pointer hover:shadow-lg">
              <div className="text-lg font-semibold">Ask Questions</div>
              <div className="text-sm text-gray-400">
                Query your indexed knowledge base
              </div>
            </Card>
          </Link>

          <Link href="/inventory">
            <Card className="cursor-pointer hover:shadow-lg">
              <div className="text-lg font-semibold">Inventory View</div>
              <div className="text-sm text-gray-400">
                View and upload inventory CSVs
              </div>
            </Card>
          </Link>

          <Link href="/agent">
            <Card className="cursor-pointer hover:shadow-lg">
              <div className="text-lg font-semibold">Agent Decisions</div>
              <div className="text-sm text-gray-400">
                Agentic recommendations and reasoning
              </div>
            </Card>
          </Link>
        </div>
      </section>

      <section className="col-span-4">
        <Card title="AI Assistant">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-300">RAG Active</div>
            <Badge color="green">Online</Badge>
          </div>

          <div className="space-y-3 text-sm">
            <div className="bg-gray-800 p-3 rounded">
              Hello! I'm ready to answer questions about your knowledge base.
            </div>
            <div className="ml-auto w-3/4 bg-blue-600 text-white p-3 rounded">
              What are the key specs for the V2 product?
            </div>
            <div className="bg-gray-800 p-3 rounded">
              Based on Product_Specs.pdf, the key specifications are: Processor
              i9, Battery Life: 24 Hours, Weight: 1.2kg.
            </div>
          </div>

          <div className="mt-4">
            <ChatInput />
          </div>
        </Card>
      </section>
    </div>
  );
}

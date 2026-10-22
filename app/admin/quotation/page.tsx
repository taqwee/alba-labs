import { QuotationMaker } from "@/components/quotation-maker";

export default function QuotationsPage() {
  return (
    <div className="min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <h1 className="text-3xl font-bold">Quotation Maker</h1>
      </div>
      <QuotationMaker />
    </div>
  );
}
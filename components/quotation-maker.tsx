"use client";

import { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Plus, Trash2, Download } from "lucide-react";

const SERVICE_CATALOG = [
  { id: "web_dev", name: "Custom Website Development", defaultPrice: 45000 },
  { id: "seo", name: "SEO Optimization (Monthly)", defaultPrice: 15000 },
  { id: "branding", name: "Brand Identity & Logo", defaultPrice: 20000 },
  { id: "uiux", name: "UI/UX App Design", defaultPrice: 30000 },
];

export function QuotationMaker() {
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [docType, setDocType] = useState("Quotation");
  const [docNumber, setDocNumber] = useState("");
  const [client, setClient] = useState({ name: "", phone: "", businessType: "" });
  const [items, setItems] = useState([{ service: "", price: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [advance, setAdvance] = useState(0);

  const subTotal = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const grandTotal = subTotal - (Number(discount) || 0) - (Number(advance) || 0);

  const handleAddItem = () => setItems([...items, { service: "", price: 0 }]);
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const handleServiceSelect = (index: number, serviceName: string) => {
    const catalogItem = SERVICE_CATALOG.find((s) => s.name === serviceName);
    const newItems = [...items];
    newItems[index] = { service: serviceName, price: catalogItem ? catalogItem.defaultPrice : 0 };
    setItems(newItems);
  };

  const handleItemPriceChange = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].price = price;
    setItems(newItems);
  };

  const generatePDF = async () => {
    if (!pdfRef.current) return;
    
    const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
    
    const fileName = client.name ? `${docType}_${client.name.replace(/\s+/g, '_')}.pdf` : `${docType}.pdf`;
    pdf.save(fileName);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 max-w-7xl mx-auto items-start">
      {/* LEFT COLUMN: Input Form */}
      <div className="space-y-6 bg-surface p-6 rounded-xl border border-border">
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h2 className="text-xl font-bold text-text mb-4">Document Type</h2>
            <select 
              className="w-full bg-background border border-border rounded-md px-4 py-2 text-text"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="Quotation">Quotation</option>
              <option value="Invoice">Invoice</option>
            </select>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text mb-4">No. (ALBA-___)</h2>
            <input 
              type="text" 
              placeholder="e.g. 001" 
              className="w-full bg-background border border-border rounded-md px-4 py-2 text-text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)} 
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-text mb-4">Client Details</h2>
          <div className="grid gap-4">
            <input type="text" placeholder="Client Name" className="w-full bg-background border border-border rounded-md px-4 py-2 text-text" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Phone Number" className="w-full bg-background border border-border rounded-md px-4 py-2 text-text" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
              <input type="text" placeholder="Type of Business" className="w-full bg-background border border-border rounded-md px-4 py-2 text-text" value={client.businessType} onChange={(e) => setClient({ ...client, businessType: e.target.value })} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-text mb-4">Scope of Work</h2>
          {items.map((item, index) => (
            <div key={index} className="flex gap-4 mb-3 items-center">
              <select className="flex-1 bg-background border border-border rounded-md px-4 py-2 text-text" value={item.service} onChange={(e) => handleServiceSelect(index, e.target.value)}>
                <option value="">Select Service...</option>
                {SERVICE_CATALOG.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                <option value="Custom Work">Custom Work</option>
              </select>
              <input type="number" placeholder="Price" className="w-32 bg-background border border-border rounded-md px-4 py-2 text-text" value={item.price} onChange={(e) => handleItemPriceChange(index, Number(e.target.value))} />
              <button onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-300"><Trash2 className="w-5 h-5" /></button>
            </div>
          ))}
          <button onClick={handleAddItem} className="text-sm text-[#a3e635] flex items-center gap-1 hover:underline"><Plus className="w-4 h-4" /> Add another item</button>
        </div>

        <div>
          <h2 className="text-xl font-bold text-text mb-4">Discounts & Advances</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted mb-1 block">Discount Amount</label>
              <input type="number" className="w-full bg-background border border-border rounded-md px-4 py-2 text-text" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Prepaid Advance</label>
              <input type="number" className="w-full bg-background border border-border rounded-md px-4 py-2 text-text" value={advance} onChange={(e) => setAdvance(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <button onClick={generatePDF} className="w-full bg-[#a3e635] text-[#171717] font-bold py-3 rounded-md flex items-center justify-center gap-2 hover:bg-[#bbf7d0] transition-colors">
          <Download className="w-5 h-5" /> Generate PDF {docType}
        </button>
      </div>

      {/* RIGHT COLUMN: The PDF Template */}
      <div className="overflow-x-auto bg-[#f5f5f5] p-4 flex justify-center border border-border rounded-xl">
        <div ref={pdfRef} className="w-[595px] h-[842px] shrink-0 bg-white text-black relative box-border p-10 flex flex-col shadow-lg">
          
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <div className="w-24 h-24 flex items-center justify-center">
              <img src="/alba-logo.png" alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
            <h1 className="text-xl tracking-[0.2em] font-light uppercase text-gray-800">{docType}</h1>
          </div>

          {/* Meta & Client Details */}
          <div className="flex justify-between text-[11px] font-bold mb-5">
            <div>{docType} No: ALBA-{docNumber || "XXX"}</div>
            <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
          </div>

          <div className="text-[11px] mb-8 space-y-1">
            <div className="font-bold uppercase text-xs">{client.name || "CLIENT NAME"}</div>
            <div className="font-bold uppercase">{client.businessType || "BUSINESS TYPE"}</div>
            <div className="font-medium">{client.phone || "PHONE NUMBER"}</div>
          </div>

          {/* Thick Black Bar */}
          <div className="w-full h-[10px] bg-black mb-1"></div>

          {/* Table */}
          <table className="w-full text-[10px] mb-6">
            <thead>
              <tr className="border-b border-gray-400 text-left">
                <th className="py-2 font-bold w-1/2">Description</th>
                <th className="py-2 font-bold text-center">Priced at</th>
                <th className="py-2 font-bold text-center">Discount</th>
                <th className="py-2 font-bold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-2 font-medium">{item.service || "Item description..."}</td>
                  <td className="py-2 text-center">{item.price.toLocaleString()}</td>
                  <td className="py-2 text-center">-</td>
                  <td className="py-2 text-right">{item.price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Spacer */}
          <div className="flex-grow"></div>

          {/* Totals Section */}
          <div className="flex justify-end mb-16">
            <div className="w-64 border-t border-gray-300 pt-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-800">Total</span>
                <span className="bg-white text-black font-bold px-2 py-1 w-28 text-right text-[11px]">Rs. {subTotal.toLocaleString()}</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-gray-800">Discount</span>
                  <span className="bg-white text-black font-bold px-2 py-1 w-28 text-right text-[11px]">- Rs. {discount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-800">Advance</span>
                <span className="bg-white text-black font-bold px-2 py-1 w-28 text-right text-[11px]">Rs. {advance.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-800">Due</span>
                <span className="bg-white text-black font-bold px-2 py-1 w-28 text-right text-[11px]">Rs. {Math.max(0, grandTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer & Signature Section */}
          <div>
            <div className="w-full border-t-[3px] border-black mb-3"></div>
            <div className="flex justify-between items-end text-[10px]">
              <div className="font-bold italic space-y-0.5">
                <p>If you have any questions concerning this</p>
                <p>{docType.toLowerCase()}, please contact ALBA LABS</p>
                <p className="pb-1">at +91 89002 77393</p>
                <p className="text-[11px] not-italic mt-2">Thank you for your business!</p>
              </div>
              
              <div className="text-center">
                <div className="w-36 border-b border-gray-400 mb-1 h-8"></div>
                <p className="font-bold italic">Graphic Designer & Manager</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
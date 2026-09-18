import React from "react";
import { Download, ExternalLink } from "lucide-react";
import { invoiceDownloadHref, invoiceHref, receiptDownloadHref, receiptHref, type MemberPayment } from "./member-overview-data";

export function PaymentDocumentActions({ payment, type, compact = false }: { payment: MemberPayment; type: "receipt" | "invoice"; compact?: boolean }) {
  const viewUrl = type === "receipt" ? receiptHref(payment) : invoiceHref(payment);
  const downloadUrl = type === "receipt" ? receiptDownloadHref(payment) : invoiceDownloadHref(payment);
  if (!viewUrl || !downloadUrl) return <span className="text-xs text-slate-400">Not available</span>;
  const label = type === "receipt" ? "receipt" : "invoice";
  return <div className={`flex ${compact ? "gap-1" : "gap-2"}`}>
    <a href={viewUrl} target="_blank" rel="noreferrer" aria-label={`View ${label}`} title={`View ${label}`} className={`${compact ? "w-11 px-0" : "flex-1 px-3"} inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-cyan-200 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500`}><ExternalLink className="h-3.5 w-3.5" />{!compact && "View"}</a>
    <a href={downloadUrl} aria-label={`Download ${label}`} title={`Download ${label}`} className={`${compact ? "w-11 px-0" : "flex-1 px-3"} inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-cyan-200 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500`}><Download className="h-3.5 w-3.5" />{!compact && "Download"}</a>
  </div>;
}

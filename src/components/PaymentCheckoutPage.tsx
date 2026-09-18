import React, { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck, Waves } from "lucide-react";

type CheckoutData = {
  paymentId: number;
  orderId: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  keyId: string;
  memberName: string;
  membershipNo: string;
  mobileNo: string;
  email: string;
  planName: string;
  status: string;
};

export function PaymentCheckoutPage({ orderId }: { orderId: string }) {
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    fetch(`/api/payments/checkout/${encodeURIComponent(orderId)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Payment request was not found.");
        setCheckout(data.checkout);
      })
      .catch((err) => setError(err.message || "Unable to load this payment request."))
      .finally(() => setLoading(false));

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [orderId]);

  const startPayment = () => {
    if (!checkout) return;
    if (checkout.status === "Paid") {
      setSuccess("This membership payment has already been completed.");
      return;
    }

    const RazorpayCheckout = (window as any).Razorpay;
    if (!RazorpayCheckout) {
      setError("The secure Razorpay checkout is still loading. Please try again.");
      return;
    }

    setError("");
    setPaying(true);
    const instance = new RazorpayCheckout({
      key: checkout.keyId,
      amount: checkout.amountInPaise,
      currency: checkout.currency,
      name: "Baroda Swim Front",
      description: `${checkout.planName} membership fee`,
      order_id: checkout.orderId,
      prefill: {
        name: checkout.memberName,
        contact: checkout.mobileNo,
        email: checkout.email
      },
      notes: { membershipNo: checkout.membershipNo },
      theme: { color: "#0284c7" },
      handler: async (response: any) => {
        try {
          const verifyResponse = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId: checkout.paymentId
            })
          });
          const result = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok || !result.success) {
            throw new Error(result.error || "Payment verification failed.");
          }
          setSuccess(`Payment received. Receipt ${result.receiptNo || "generated"}. Your membership is now active.`);
        } catch (err: any) {
          setError(err.message || "Payment verification failed. Please contact the academy.");
        } finally {
          setPaying(false);
        }
      },
      modal: { ondismiss: () => setPaying(false) }
    });
    instance.on("payment.failed", (response: any) => {
      setPaying(false);
      setError(response?.error?.description || "The payment was not completed.");
    });
    instance.open();
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900 flex items-center justify-center">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="bg-sky-600 px-7 py-6 text-white flex items-center gap-4">
          <div className="rounded-2xl bg-white/15 p-3"><Waves className="h-7 w-7" /></div>
          <div><h1 className="text-xl font-black">Baroda Swim Front</h1><p className="text-sm text-sky-100">Secure membership payment</p></div>
        </header>

        <div className="p-7">
          {loading && <div className="py-14 flex justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-sky-600" /></div>}
          {!loading && error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
          {!loading && success && <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-800 flex gap-3"><CheckCircle2 className="h-6 w-6 shrink-0" /><p className="font-semibold">{success}</p></div>}
          {!loading && checkout && !success && (
            <>
              <div className="space-y-4">
                <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Member</p><p className="mt-1 text-lg font-extrabold">{checkout.memberName}</p><p className="text-sm text-slate-500">{checkout.membershipNo}</p></div>
                <div className="rounded-2xl bg-slate-50 p-5 flex items-end justify-between">
                  <div><p className="text-xs font-bold uppercase text-slate-400">Plan</p><p className="font-bold">{checkout.planName}</p></div>
                  <p className="text-3xl font-black text-sky-700">₹{checkout.amount.toLocaleString("en-IN")}</p>
                </div>
              </div>
              {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              <button onClick={startPayment} disabled={paying} className="mt-6 w-full rounded-2xl bg-sky-600 py-4 font-extrabold text-white hover:bg-sky-700 disabled:opacity-60">
                {paying ? "Opening secure checkout…" : checkout.status === "Paid" ? "View payment status" : `Pay ₹${checkout.amount.toLocaleString("en-IN")}`}
              </button>
              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4" />Payment processed securely by Razorpay</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

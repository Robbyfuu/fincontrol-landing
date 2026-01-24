import { useState, useEffect, type FormEvent } from "react";
import { IconLoader2, IconCheck, IconAlertCircle } from "@tabler/icons-react";

const API_URL = import.meta.env.PUBLIC_API_URL || "https://api.fincontrol.cl";

interface Plan {
  id: string;
  name: string;
  type: string;
  priceCLP: number;
}

export default function PersonalSignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadPersonalPlan();

    // Check for error from redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "payment") {
      setError("El pago no pudo ser procesado. Por favor intenta de nuevo.");
    }
  }, []);

  async function loadPersonalPlan() {
    try {
      const res = await fetch(`${API_URL}/api/signup/plans`);
      if (res.ok) {
        const plans = await res.json();
        const personalPlan = plans.find((p: Plan) => p.type === "PERSONAL");
        if (personalPlan) setPlan(personalPlan);
      }
    } catch (err) {
      console.error("Failed to load plan:", err);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (!/^569\d{8}$/.test(cleanPhone)) {
      setError("El teléfono debe tener formato 569XXXXXXXX");
      setIsLoading(false);
      return;
    }

    if (!plan) {
      setError("Plan no encontrado");
      setIsLoading(false);
      return;
    }

    try {
      // Create subscription and redirect to MercadoPago
      const res = await fetch(`${API_URL}/api/payments/subscription/personal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phoneNumber: cleanPhone,
          email,
          planId: plan.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al crear preferencia de pago");
      }

      // Redirect to MercadoPago Checkout
      const checkoutUrl = data.sandboxInitPoint || data.initPoint;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("No se recibió URL de checkout");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al procesar";
      setError(message);
      setIsLoading(false);
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(price);
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <IconAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {plan && (
        <div className="mb-6 p-4 bg-blue-50 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-slate-700 font-medium">Plan {plan.name}</span>
            <span className="text-xl font-bold text-blue-600">
              {formatPrice(plan.priceCLP)}/mes
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nombre completo *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Juan Pérez"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Teléfono WhatsApp *
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="569 1234 5678"
          />
          <p className="text-xs text-slate-500 mt-1">
            Este será tu número para enviar boletas
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="tu@email.com"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !plan}
        className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <IconLoader2 className="w-5 h-5 animate-spin" />
            Redirigiendo a Mercado Pago...
          </>
        ) : plan ? (
          `Pagar ${formatPrice(plan.priceCLP)} con Mercado Pago`
        ) : (
          "Cargando..."
        )}
      </button>

      <p className="text-xs text-slate-500 text-center mt-4">
        🔒 Serás redirigido a Mercado Pago para completar el pago de forma
        segura
      </p>
    </form>
  );
}

import { useState, useEffect, useRef, type FormEvent } from "react";
import { IconLoader2, IconCheck, IconAlertCircle } from "@tabler/icons-react";

const API_URL = import.meta.env.PUBLIC_API_URL || "https://api.fincontrol.cl";
const MP_PUBLIC_KEY = import.meta.env.PUBLIC_MERCADOPAGO_KEY || "";

interface Plan {
  id: string;
  name: string;
  type: string;
  priceCLP: number;
  maxEmployees: number;
}

type FormStep = "company" | "payment" | "success" | "error";

export default function CompanySignupForm() {
  const [step, setStep] = useState<FormStep>("company");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Form data
  const [companyName, setCompanyName] = useState("");
  const [companyRut, setCompanyRut] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // MercadoPago - using unknown since SDK types are not available
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const expirationRef = useRef<HTMLDivElement>(null);
  const securityCodeRef = useRef<HTMLDivElement>(null);
  const mpRef = useRef<unknown>(null);
  const cardFieldsRef = useRef<Record<string, unknown>>({});

  // Load plans and init MP on mount
  useEffect(() => {
    loadPlans();

    // Get plan from URL params
    const params = new URLSearchParams(window.location.search);
    const planType = params.get("plan");
    if (planType) {
      // Will be handled after plans load
    }
  }, []);

  // Initialize MP when entering payment step
  useEffect(() => {
    if (step === "payment" && MP_PUBLIC_KEY) {
      initMercadoPago();
    }
  }, [step]);

  async function loadPlans() {
    try {
      const res = await fetch(`${API_URL}/api/signup/plans`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data);

        // Select plan from URL
        const params = new URLSearchParams(window.location.search);
        const planType = params.get("plan");
        if (planType) {
          const plan = data.find((p: Plan) => p.type === planType);
          if (plan) setSelectedPlan(plan);
        }
      }
    } catch (err) {
      console.error("Failed to load plans:", err);
    }
  }

  function initMercadoPago() {
    if (
      typeof window === "undefined" ||
      !(window as unknown as { MercadoPago?: unknown }).MercadoPago
    ) {
      console.error("MercadoPago SDK not loaded");
      return;
    }

    const MPConstructor = (
      window as unknown as { MercadoPago: new (key: string) => unknown }
    ).MercadoPago;
    const mp = new MPConstructor(MP_PUBLIC_KEY) as {
      fields: {
        create: (
          type: string,
          options: object,
        ) => { mount: (el: HTMLElement) => void };
        createCardToken: (options: object) => Promise<{ id?: string }>;
      };
    };
    mpRef.current = mp;

    // Create secure fields
    if (cardNumberRef.current) {
      cardFieldsRef.current.cardNumber = mp.fields
        .create("cardNumber", {
          placeholder: "Número de tarjeta",
        })
        .mount(cardNumberRef.current);
    }

    if (expirationRef.current) {
      cardFieldsRef.current.expirationDate = mp.fields
        .create("expirationDate", {
          placeholder: "MM/YY",
        })
        .mount(expirationRef.current);
    }

    if (securityCodeRef.current) {
      cardFieldsRef.current.securityCode = mp.fields
        .create("securityCode", {
          placeholder: "CVV",
        })
        .mount(securityCodeRef.current);
    }
  }

  function handleCompanySubmit(e: FormEvent) {
    e.preventDefault();

    if (!selectedPlan) {
      setError("Por favor selecciona un plan");
      return;
    }

    // Validate phone format
    const phoneRegex = /^569\d{8}$/;
    const cleanPhone = adminPhone.replace(/\D/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      setError("El teléfono debe tener formato 569XXXXXXXX");
      return;
    }

    setError(null);
    setStep("payment");
  }

  async function handlePaymentSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const mp = mpRef.current as {
        fields: {
          createCardToken: (options: object) => Promise<{ id?: string }>;
        };
      } | null;
      if (!mp) throw new Error("MercadoPago no inicializado");

      const tokenResponse = await mp.fields.createCardToken({
        cardholderName: adminName,
      });

      if (!tokenResponse?.id) {
        throw new Error("Error al procesar tarjeta");
      }

      // Get payment method from bin
      const cardNumberElement = cardFieldsRef.current.cardNumber;
      let paymentMethodId = "visa"; // default

      // Submit to backend
      const res = await fetch(`${API_URL}/api/signup/company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyRut: companyRut || undefined,
          planId: selectedPlan?.id,
          adminName,
          adminPhone: adminPhone.replace(/\D/g, ""),
          adminEmail,
          token: tokenResponse.id,
          paymentMethodId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al procesar el registro");
      }

      if (data.success) {
        setStep("success");
      } else {
        setError(data.message || "El pago está siendo procesado");
      }
    } catch (err: unknown) {
      console.error("Payment error:", err);
      const message =
        err instanceof Error ? err.message : "Error al procesar el pago";
      setError(message);
    } finally {
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

  if (step === "success") {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <IconCheck className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          ¡Registro exitoso!
        </h2>
        <p className="text-slate-600 mb-6">
          Te hemos enviado un mensaje de WhatsApp con las instrucciones para
          comenzar.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
        >
          Volver al inicio
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={step === "company" ? handleCompanySubmit : handlePaymentSubmit}
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <IconAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {step === "company" && (
        <>
          {/* Plan Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Plan seleccionado
            </label>
            <div className="grid grid-cols-2 gap-3">
              {plans
                .filter((p) => p.type !== "UNLIMITED")
                .map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedPlan?.id === plan.id
                        ? "border-purple-500 bg-purple-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-slate-900">
                      {plan.name}
                    </div>
                    <div className="text-lg font-bold text-purple-600">
                      {formatPrice(plan.priceCLP)}/mes
                    </div>
                    <div className="text-xs text-slate-500">
                      {plan.maxEmployees === 0
                        ? "Personal"
                        : `Hasta ${plan.maxEmployees} empleados`}
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Company Info */}
          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-slate-900">
              Datos de la empresa
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre de la empresa *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Mi Empresa SpA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                RUT (opcional)
              </label>
              <input
                type="text"
                value={companyRut}
                onChange={(e) => setCompanyRut(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="76.XXX.XXX-X"
              />
            </div>
          </div>

          {/* Admin Info */}
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold text-slate-900">
              Datos del administrador
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre completo *
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Teléfono WhatsApp *
              </label>
              <input
                type="tel"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="569 1234 5678"
              />
              <p className="text-xs text-slate-500 mt-1">
                Formato: 569XXXXXXXX (sin espacios ni guiones)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="juan@miempresa.cl"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
          >
            Continuar al pago
          </button>
        </>
      )}

      {step === "payment" && selectedPlan && (
        <>
          {/* Summary */}
          <div className="mb-6 p-4 bg-slate-50 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-600">Plan {selectedPlan.name}</span>
              <span className="font-bold text-slate-900">
                {formatPrice(selectedPlan.priceCLP)}/mes
              </span>
            </div>
            <div className="text-sm text-slate-500">
              {companyName} • {adminEmail}
            </div>
          </div>

          {/* Card Fields */}
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold text-slate-900">Datos de pago</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Número de tarjeta
              </label>
              <div
                ref={cardNumberRef}
                className="w-full h-12 px-4 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vencimiento
                </label>
                <div
                  ref={expirationRef}
                  className="w-full h-12 px-4 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  CVV
                </label>
                <div
                  ref={securityCodeRef}
                  className="w-full h-12 px-4 border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("company")}
              className="flex-1 py-4 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <IconLoader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                `Pagar ${formatPrice(selectedPlan.priceCLP)}`
              )}
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">
            🔒 Pago seguro procesado por Mercado Pago
          </p>
        </>
      )}
    </form>
  );
}

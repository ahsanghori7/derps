import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import logo4k from "../../assets/logo4k.png";

const PaymentCancel = () => {
  const [searchParams] = useSearchParams();

  const invoiceId = useMemo(() => {
    return (
      searchParams.get("invoiceId") ||
      searchParams.get("invoice_id") ||
      searchParams.get("id")
    );
  }, [searchParams]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(circle at top, rgba(239, 68, 68, 0.1), transparent 45%), var(--dashboard-bg, #f4f7fb)",
      }}
    >
      <style>
        {`
          @keyframes paymentCancelPop {
            0% { transform: scale(0.6); opacity: 0; }
            60% { transform: scale(1.08); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }

          .payment-cancel-card {
            animation: paymentCancelPop 0.55s ease-out;
          }
        `}
      </style>

      <div
        className="payment-cancel-card w-full max-w-lg text-center"
        style={{
          backgroundColor: "var(--dashboard-card-bg, #ffffff)",
          borderRadius: 20,
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
          padding: "40px 32px",
        }}
      >
        <div className="flex justify-center mb-6">
          <img src={logo4k} alt="Logo" className="h-10 object-contain" />
        </div>

        <div
          className="relative flex items-center justify-center rounded-full mx-auto mb-6"
          style={{
            width: 96,
            height: 96,
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            boxShadow: "0 12px 30px rgba(239, 68, 68, 0.3)",
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path
              d="M16 16L32 32M32 16L16 32"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1
          style={{
            color: "var(--sidebar-text-primary, #1f2937)",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Payment Cancelled
        </h1>

        <p
          style={{
            color: "var(--sidebar-text-secondary, #6b7280)",
            fontSize: 16,
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          Your payment was not completed and no charge has been made to your account.
        </p>

        {invoiceId && (
          <div
            className="text-left mb-5"
            style={{
              backgroundColor: "var(--dashboard-tab-box, #f8fafc)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: 14,
              padding: "14px 18px",
            }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: "#64748b", fontSize: 14 }}>Invoice Reference</span>
              <span style={{ color: "#111827", fontSize: 14, fontWeight: 600 }}>
                #{invoiceId}
              </span>
            </div>
          </div>
        )}

        <div
          style={{
            backgroundColor: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 14,
            padding: "16px 18px",
            textAlign: "left",
          }}
        >
          <p
            style={{
              color: "#9a3412",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            What happens next?
          </p>
          <ul
            style={{
              color: "#7c2d12",
              fontSize: 14,
              lineHeight: 1.7,
              margin: 0,
              paddingLeft: 18,
            }}
          >
            <li>You can safely close this page.</li>
            <li>To pay your invoice, use the payment link from your email again.</li>
            <li>If you need help, contact the merchant who sent you the invoice.</li>
          </ul>
        </div>

        <p
          style={{
            marginTop: 20,
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          No further action is required unless you wish to complete the payment.
        </p>
      </div>
    </div>
  );
};

export default PaymentCancel;

import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottonCustom from "../../Components/ButtonCustom";
import logo4k from "../../assets/logo4k.png";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isAuthenticated = Boolean(localStorage.getItem("accessToken"));

  const paymentDetails = useMemo(() => {
    const invoiceId =
      searchParams.get("invoiceId") ||
      searchParams.get("invoice_id") ||
      searchParams.get("id");
    const transactionId =
      searchParams.get("transactionId") ||
      searchParams.get("transaction_id") ||
      searchParams.get("transId") ||
      searchParams.get("refId");
    const amount =
      searchParams.get("amount") ||
      searchParams.get("total") ||
      searchParams.get("paidAmount");

    return {
      invoiceId,
      transactionId,
      amount: amount ? Number(amount) : null,
    };
  }, [searchParams]);

  const formattedAmount =
    paymentDetails.amount != null && Number.isFinite(paymentDetails.amount)
      ? paymentDetails.amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;

  const handlePrimaryAction = () => {
    if (isAuthenticated) {
      navigate("/home/invoices");
      return;
    }
    navigate("/");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(circle at top, rgba(67, 121, 238, 0.12), transparent 45%), var(--dashboard-bg, #f4f7fb)",
      }}
    >
      <style>
        {`
          @keyframes paymentSuccessPop {
            0% { transform: scale(0.6); opacity: 0; }
            60% { transform: scale(1.08); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes paymentSuccessRing {
            0% { transform: scale(0.8); opacity: 0.4; }
            100% { transform: scale(1.35); opacity: 0; }
          }

          @keyframes paymentSuccessCheck {
            0% { stroke-dashoffset: 48; opacity: 0; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }

          .payment-success-card {
            animation: paymentSuccessPop 0.55s ease-out;
          }

          .payment-success-ring {
            animation: paymentSuccessRing 1.6s ease-out infinite;
          }

          .payment-success-check {
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: paymentSuccessCheck 0.7s ease forwards 0.25s;
          }
        `}
      </style>

      <div
        className="payment-success-card w-full max-w-lg text-center"
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

        <div className="relative flex items-center justify-center mb-6">
          <div
            className="payment-success-ring absolute rounded-full"
            style={{
              width: 96,
              height: 96,
              backgroundColor: "rgba(34, 197, 94, 0.15)",
            }}
          />
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: 96,
              height: 96,
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              boxShadow: "0 12px 30px rgba(34, 197, 94, 0.35)",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                className="payment-success-check"
                d="M14 24.5L21 31.5L34 17.5"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h1
          style={{
            color: "var(--sidebar-text-primary, #1f2937)",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Payment Successful
        </h1>

        <p
          style={{
            color: "var(--sidebar-text-secondary, #6b7280)",
            fontSize: 16,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          Thank you. Your payment has been received and your invoice is being updated.
        </p>

        {(formattedAmount || paymentDetails.invoiceId || paymentDetails.transactionId) && (
          <div
            className="text-left mb-6"
            style={{
              backgroundColor: "var(--dashboard-tab-box, #f8fafc)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: 14,
              padding: "16px 18px",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: "#64748b",
                marginBottom: 12,
              }}
            >
              Payment Summary
            </p>

            {formattedAmount && (
              <div className="flex justify-between items-center mb-3">
                <span style={{ color: "#64748b", fontSize: 14 }}>Amount Paid</span>
                <span style={{ color: "#111827", fontSize: 18, fontWeight: 700 }}>
                  ${formattedAmount}
                </span>
              </div>
            )}

            {paymentDetails.invoiceId && (
              <div className="flex justify-between items-center mb-3">
                <span style={{ color: "#64748b", fontSize: 14 }}>Invoice ID</span>
                <span style={{ color: "#111827", fontSize: 14, fontWeight: 600 }}>
                  #{paymentDetails.invoiceId}
                </span>
              </div>
            )}

            {paymentDetails.transactionId && (
              <div className="flex justify-between items-center gap-4">
                <span style={{ color: "#64748b", fontSize: 14, flexShrink: 0 }}>
                  Transaction Ref
                </span>
                <span
                  style={{
                    color: "#111827",
                    fontSize: 13,
                    fontWeight: 600,
                    wordBreak: "break-all",
                    textAlign: "right",
                  }}
                >
                  {paymentDetails.transactionId}
                </span>
              </div>
            )}
          </div>
        )}

        {/* <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <BottonCustom
            backgroundColor="rgba(67, 121, 238, 1)"
            width={180}
            title={isAuthenticated ? "View Invoices" : "Go To Login"}
            height={44}
            color="#fff"
            fontSize={16}
            fontWeight={600}
            onClick={handlePrimaryAction}
          />

          {isAuthenticated && (
            <BottonCustom
              backgroundColor="rgba(255, 255, 255, 1)"
              width={180}
              title="Dashboard"
              height={44}
              color="rgba(67, 121, 238, 1)"
              fontSize={16}
              fontWeight={600}
              border="1px solid rgba(67, 121, 238, 0.35)"
              onClick={() => navigate("/home/dashboardScreen")}
            />
          )}
        </div> */}

        <p
          style={{
            marginTop: 20,
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          A confirmation email will be sent if one is configured for this invoice.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;

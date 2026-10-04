import { useEffect } from "react";
import logo4k from "../../assets/logo4k.png";

const CONTACT_EMAIL = "support@godms.com";
const EFFECTIVE_DATE = "18 August 2026";
const DELETE_SUBJECT = "Delete My Derps Account";

const DeleteAccount = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Delete Account | Derps";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const mailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(DELETE_SUBJECT)}`;

  return (
    <div
      className="h-screen overflow-y-auto"
      style={{
        background:
          "radial-gradient(circle at top, rgba(12, 121, 247, 0.10), transparent 42%), #f4f7fb",
      }}
    >
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <img src={logo4k} alt="Derps" className="h-9 w-auto object-contain" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Derps</p>
            <p className="text-xs text-slate-500 truncate">Delete Account</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="rounded-xl bg-[#EAF3FF] px-5 py-6 sm:px-8 sm:py-8">
            <h1 className="text-2xl font-bold tracking-tight text-[#0C79F7] sm:text-3xl">
              How to Delete Your Derps Account
            </h1>
            <p className="mt-2 text-sm text-slate-600">Effective Date: {EFFECTIVE_DATE}</p>
          </div>

          <p className="mt-6 text-[15px] leading-7 text-slate-700">
            If you wish to delete your Derps account and permanently remove your data from our
            system, please follow the steps outlined below.
          </p>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Requesting Account Deletion</h2>
            <p className="mt-2 text-[15px] leading-7 text-slate-700">To delete your account:</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-slate-700">
              <li>
                Email us at{" "}
                <a href={mailHref} className="font-semibold text-[#0C79F7] hover:underline">
                  {CONTACT_EMAIL}
                </a>{" "}
                using your registered email address.
              </li>
              <li>
                Include the subject line: <strong>“{DELETE_SUBJECT}”</strong>.
              </li>
              <li>
                We will confirm your request and delete your data within{" "}
                <strong>7 business days</strong>.
              </li>
            </ol>
            <p className="mt-3 text-[15px] leading-7 text-slate-700">
              If you use Derps through your employer or organization, please also contact your
              administrator. They control most workplace data in the App.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Data That Will Be Deleted</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-slate-700">
              <li>Your user profile (name, email, job role, and profile details)</li>
              <li>Login credentials and account access</li>
              <li>Chat messages, files, images, and attachments associated with your account</li>
              <li>Tasks, memos, calendar events, and related notes you created</li>
              <li>Attendance records associated with your user account</li>
              <li>App preferences, notification tokens, and activity logs (unless legally required)</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">
              Data That May Be Retained Temporarily
            </h2>
            <p className="mt-2 text-[15px] leading-7 text-slate-700">
              Some data may be retained for up to <strong>90 days</strong> for legal, fraud
              prevention, or regulatory reasons. This may include:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-slate-700">
              <li>Transaction, invoice, and sales records</li>
              <li>Audit logs and diagnostic information</li>
              <li>Workplace data that your organization is required to keep</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Need Help?</h2>
            <p className="mt-2 text-[15px] leading-7 text-slate-700">
              If you have any questions or concerns, contact our support team at{" "}
              <a href={mailHref} className="font-semibold text-[#0C79F7] hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default DeleteAccount;

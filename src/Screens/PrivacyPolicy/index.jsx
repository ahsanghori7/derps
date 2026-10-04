import { useEffect } from "react";
import logo4k from "../../assets/logo4k.png";

const CONTACT_EMAIL = "support@godms.com";
const WEBSITE_URL = "https://derps.gotmsolutions.com";
const LAST_UPDATED = "18 August 2026";

const PERMISSIONS = [
  { permission: "Internet", why: "Connect to Derps servers and load content" },
  { permission: "Location", why: "Attach location when required by your workflow, such as attendance" },
  { permission: "Camera", why: "Video meetings and taking photos for chat, tasks, and memos" },
  { permission: "Microphone", why: "Video meetings, voice messages, and calls" },
  { permission: "Photos / storage", why: "Select, share, and save images, files, and screenshots" },
  { permission: "Notifications", why: "Deliver alerts for chat, tasks, meetings, and other updates" },
  { permission: "Bluetooth", why: "Connect audio devices during calls (where applicable)" },
  { permission: "Speech recognition", why: "Convert voice input into text in chat (where used)" },
];

const Section = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="text-xl font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
      {title}
    </h2>
    <div className="space-y-3 text-[15px] leading-7 text-slate-700">{children}</div>
  </section>
);

const SubSection = ({ title, children }) => (
  <div className="space-y-2">
    <h3 className="text-base font-semibold text-slate-800 mt-5">{title}</h3>
    {children}
  </div>
);

const BulletList = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const PrivacyPolicy = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Privacy Policy | Derps";
    return () => {
      document.title = previousTitle;
    };
  }, []);

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
            <p className="text-xs text-slate-500 truncate">Privacy Policy</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-10">
          <p className="text-sm font-medium text-[#0C79F7]">GTM Solutions</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

          <div className="mt-6 space-y-3 text-[15px] leading-7 text-slate-700">
            <p>
              This Privacy Policy explains how <strong>GTM Solutions</strong> (“we”, “us”, or “our”)
              collects, uses, stores, and protects information when you use the{" "}
              <strong>Derps</strong> mobile application and related services (the “App”). Derps is a
              business ERP and collaboration platform that helps organizations manage work, sales,
              attendance, communication, and related workflows.
            </p>
            <p>
              By creating an account, signing in, or using the App, you agree to this Privacy Policy.
              If you do not agree, please do not use the App.
            </p>
            <p>
              If you use Derps through your employer or organization, that organization is typically
              the controller of your workplace data. We process that data to provide the service to
              them.
            </p>
          </div>

          <div className="mt-10 space-y-10">
            <Section id="who-we-are" title="1. Who we are">
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>App name:</strong> Derps
                </li>
                <li>
                  <strong>Provider:</strong> GTM Solutions
                </li>
                <li>
                  <strong>Website:</strong>{" "}
                  <a
                    href={WEBSITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0C79F7] hover:underline"
                  >
                    {WEBSITE_URL}
                  </a>
                </li>
                <li>
                  <strong>Contact:</strong>{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#0C79F7] hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </li>
              </ul>
            </Section>

            <Section id="information-we-collect" title="2. Information we collect">
              <p>
                We collect information that you provide, information your organization provides, and
                information generated when you use the App.
              </p>

              <SubSection title="2.1 Account and identity information">
                <BulletList
                  items={[
                    "Login credentials (such as username, Iqama/ID number, or other identifier issued by your organization, and password)",
                    "Name, email address, job role, permissions, and profile details",
                    "Organization / tenant information (company name, branding, and related settings)",
                    "Password reset information, including email used to recover access",
                  ]}
                />
              </SubSection>

              <SubSection title="2.2 Workplace and business data">
                <p>Depending on the modules enabled for your organization, this may include:</p>
                <BulletList
                  items={[
                    "Attendance records (sign-in, sign-out, working hours, reports)",
                    "Tasks, projects, memos, calendar events, and related notes",
                    "Chat messages, replies, voice messages, files, images, and attachments",
                    "Video and audio meeting activity (participants, meeting identifiers, call metadata)",
                    "Sales and CRM data, such as leads, customers, opportunities, quotations, sales orders, and invoices",
                    "Bookmarks, news, notifications, and other in-app activity",
                  ]}
                />
              </SubSection>

              <SubSection title="2.3 Location information">
                <p>
                  If required by your organization’s workflow (for example attendance or
                  location-based records), the App may collect your device’s approximate or precise
                  location (GPS) while you use the relevant feature. Location is requested only when
                  needed and only if you grant permission.
                </p>
              </SubSection>

              <SubSection title="2.4 Device and technical information">
                <BulletList
                  items={[
                    "Device name and basic device identifiers needed to register the device for notifications",
                    "Operating system, app version, and network status",
                    "Authentication tokens stored on the device to keep you signed in",
                    "Push notification tokens (Firebase Cloud Messaging)",
                    "Log and diagnostic information needed to operate and secure the App",
                  ]}
                />
              </SubSection>

              <SubSection title="2.5 Media, files, and communications">
                <p>If you grant the relevant permission, the App may access:</p>
                <BulletList
                  items={[
                    "Camera (photos, video meetings, attaching images to chat, tasks, or memos)",
                    "Microphone (voice messages, audio/video calls, meetings)",
                    "Photo library / storage (selecting, sharing, or saving images and screenshots)",
                    "Documents and other files you attach",
                    "Speech-to-text input in chat, where that feature is used",
                    "Screen sharing during meetings, where that feature is used",
                  ]}
                />
                <p>
                  We do not access your camera, microphone, photos, or files unless you use a
                  feature that requires them and you grant permission.
                </p>
              </SubSection>

              <SubSection title="2.6 Information we do not collect for advertising">
                <p>
                  We do not sell your personal information. We do not use third-party advertising
                  SDKs to show ads in the App.
                </p>
              </SubSection>
            </Section>

            <Section id="how-we-use" title="3. How we use your information">
              <p>We use the information described above to:</p>
              <BulletList
                items={[
                  "Create and manage user accounts and authenticate users",
                  "Provide ERP, CRM, attendance, task, memo, calendar, chat, and meeting features",
                  "Send in-app and push notifications about messages, tasks, meetings, and other activity",
                  "Enable audio calls, video meetings, screen sharing, and related communications",
                  "Store files, images, documents, and other content you or your organization upload",
                  "Personalize branding for your organization (for example company name and logo)",
                  "Remember your language and app preferences",
                  "Maintain security, prevent unauthorized access, and troubleshoot issues",
                  "Comply with legal obligations and enforce our terms",
                ]}
              />
            </Section>

            <Section id="app-permissions" title="4. App permissions">
              <p>
                Derps may request the following permissions. You can change them at any time in your
                device settings. Some features will not work if a required permission is denied.
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold w-40">Permission</th>
                      <th className="px-4 py-3 font-semibold">Why it is used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map((row, index) => (
                      <tr
                        key={row.permission}
                        className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 align-top">
                          {row.permission}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="how-we-share" title="5. How we share information">
              <p>We share information only as needed to operate the App:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Your organization:</strong> Workplace data is available to authorized users
                  in your company according to roles and permissions set by your administrator.
                </li>
                <li>
                  <strong>Service providers:</strong> We use trusted processors to host and operate
                  the App, including cloud hosting, push notifications (Google Firebase), and
                  real-time communication services (such as Agora and WebRTC-related
                  infrastructure). These providers process data only on our instructions.
                </li>
                <li>
                  <strong>Legal requirements:</strong> We may disclose information if required by
                  law, regulation, court order, or to protect the rights, safety, or security of
                  users, our organization, or others.
                </li>
                <li>
                  <strong>Business transfers:</strong> If we merge, restructure, or transfer assets,
                  information may be transferred as part of that transaction, subject to this Policy.
                </li>
              </ul>
              <p>We do not sell personal information to third parties.</p>
            </Section>

            <Section id="storage-security" title="6. Data storage and security">
              <BulletList
                items={[
                  "Account, workplace, chat, and file data are stored on our servers (including systems associated with gotmsolutions.com) and processed to provide the service.",
                  "Login tokens, preferences, and similar data may be stored locally on your device.",
                  "We use reasonable technical and organizational measures to protect information, including encrypted connections and access controls.",
                  "No method of transmission or storage is completely secure. You should keep your password confidential and use the App only on trusted devices.",
                ]}
              />
            </Section>

            <Section id="retention" title="7. Data retention">
              <p>
                We retain information for as long as needed to provide the App to you and your
                organization, and as required by law or legitimate business needs (for example
                security, audit, and dispute resolution).
              </p>
              <p>
                When your organization closes an account or asks us to delete data, we will delete or
                anonymize personal data in accordance with that request and applicable law, unless we
                are required to keep it.
              </p>
              <p>
                You can sign out of the App at any time. Signing out removes local session tokens
                from the device. It does not automatically delete data stored on our servers or in
                your organization’s account.
              </p>
            </Section>

            <Section id="your-rights" title="8. Your rights">
              <p>
                Depending on applicable law (including, where relevant, Saudi Personal Data
                Protection Law and similar regulations), you may have the right to:
              </p>
              <BulletList
                items={[
                  "Access the personal data we hold about you",
                  "Request correction of inaccurate data",
                  "Request deletion of your data",
                  "Object to or restrict certain processing",
                  "Withdraw consent where processing is based on consent (for example device permissions)",
                ]}
              />
              <p>
                If you use Derps through your employer, please contact your administrator first.
                They control most workplace data in the App. You may also contact us at the email
                below.
              </p>
              <p>You can also:</p>
              <BulletList
                items={[
                  "Change or revoke camera, microphone, location, photo, and notification permissions in device settings",
                  "Disable push notifications",
                  "Request account deletion through your organization or by contacting us",
                ]}
              />
            </Section>

            <Section id="children" title="9. Children’s privacy">
              <p>
                Derps is a business application intended for authorized adult users of an
                organization. It is not directed at children under 18. We do not knowingly collect
                personal information from children. If you believe a child has provided us with
                personal information, contact us and we will take appropriate steps to delete it.
              </p>
            </Section>

            <Section id="international" title="10. International data transfers">
              <p>
                Your information may be processed on servers in the country where your organization
                operates and/or other countries where we or our service providers maintain
                facilities. Where required, we take steps to protect data transferred across borders
                in accordance with applicable law.
              </p>
            </Section>

            <Section id="third-party" title="11. Third-party links and sharing">
              <p>
                The App may let you share content through other apps you have installed (for example
                WhatsApp). Those apps have their own privacy policies. We are not responsible for the
                practices of third-party apps or websites.
              </p>
            </Section>

            <Section id="changes" title="12. Changes to this policy">
              <p>
                We may update this Privacy Policy from time to time. The “Last updated” date at the
                top will change when we do. Continued use of the App after an update means you accept
                the revised Policy. For material changes, we may provide additional notice in the App
                or on our website.
              </p>
            </Section>

            <Section id="contact" title="13. Contact us">
              <p>
                If you have questions about this Privacy Policy or want to exercise your privacy
                rights, contact:
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="font-semibold text-slate-900">GTM Solutions</p>
                <p>
                  Email:{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#0C79F7] hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </p>
                <p>
                  Website:{" "}
                  <a
                    href={WEBSITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0C79F7] hover:underline"
                  >
                    {WEBSITE_URL}
                  </a>
                </p>
              </div>
            </Section>
          </div>
        </article>
      </main>
    </div>
  );
};

export default PrivacyPolicy;

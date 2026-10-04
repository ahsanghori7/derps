// ShowTaxInfoModal.jsx
import { Dialog } from "@headlessui/react";

export default function ShowTaxInfoModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg rounded-2xl bg-[var(--dashboard-card-bg)] border border-[var(--dashboard-border)] p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold mb-4 text-[var(--dashboard-text-primary)]">
            Tax ID Information
          </Dialog.Title>

          <div className="space-y-4 text-sm text-[var(--dashboard-text-secondary)]">
            <p>
              Please use the <strong>exact name</strong> and{" "}
              <strong>Taxpayer Identification Number (TIN)</strong> as shown on
              the merchant’s prior year income tax return.
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>SSN (Social Security Number)</strong> – Format:{" "}
                <code>XXX-XX-XXXX</code>. Used by individuals and sole
                proprietors. Never enter the DBA name, always the owner’s legal
                name.
              </li>
              <li>
                <strong>EIN (Employer Identification Number)</strong> – Format:{" "}
                <code>XX-XXXXXXX</code>. Used by corporations, partnerships,
                LLCs, non-profits, and other organizations.
              </li>
              <li>
                <strong>ITIN (Individual Taxpayer Identification Number)</strong>{" "}
                – Format: <code>XXX-XX-XXXX</code>. Only used by certain
                non-resident or foreign individuals.{" "}
                <span className="text-red-600 font-medium">
                  Never select ITIN unless it is a foreign corporation or
                  individual.
                </span>
              </li>
            </ul>

            <p>
              ⚠️ Do <strong>not</strong> use Sales Tax License numbers or
              Secretary of State registration numbers as your TIN.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-[var(--sidebar-selected-bg)] text-[var(--sidebar-text-selected)]"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

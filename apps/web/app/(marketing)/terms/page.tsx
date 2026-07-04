import { FileText } from "lucide-react";
import { LegalShell } from "@/components/ui/legal-shell";
import { TOOL_COUNT } from "@/data/tools";

export const metadata = {
  title: "Terms of Service — FrontendDevHelper",
  description: "Terms of service for FrontendDevHelper browser extension.",
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated="May 7, 2026"
      icon={FileText}
    >
      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By installing or using FrontendDevHelper (&quot;the Extension&quot;),
          you agree to be bound by these Terms of Service. If you do not agree,
          do not use the Extension.
        </p>
      </section>

      <section>
        <h2>2. Description of Service</h2>
        <p>
          FrontendDevHelper is a free, open-source browser extension providing{" "}
          {TOOL_COUNT} visual debugging tools for frontend developers. The
          Extension is available at no cost under the MIT License.
        </p>
      </section>

      <section>
        <h2>3. Open Source License</h2>
        <p>
          The Extension is licensed under the MIT License. You are free to use,
          modify, and distribute the Extension in accordance with the terms of
          the MIT License. The source code is available on GitHub.
        </p>
      </section>

      <section>
        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            Use the Extension to exploit, harm, or gain unauthorized access to
            websites.
          </li>
          <li>Use automated systems to scrape or abuse our API endpoints.</li>
          <li>Violate any applicable laws while using the service.</li>
        </ul>
      </section>

      <section>
        <h2>5. Intellectual Property</h2>
        <p>
          FrontendDevHelper is open source under the MIT License. The name,
          logo, and brand materials are not covered by the MIT License and may
          not be used without written permission.
        </p>
      </section>

      <section>
        <h2>6. Disclaimers</h2>
        <p>
          The Extension is provided &quot;as is&quot; without warranty of any
          kind. We do not guarantee that it will be error-free, uninterrupted,
          or meet your specific requirements.
        </p>
      </section>

      <section>
        <h2>7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, FrontendDevHelper and its
          contributors shall not be liable for any indirect, incidental,
          special, or consequential damages arising from your use of the
          Extension.
        </p>
      </section>

      <section>
        <h2>8. Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Material changes will be
          posted on our website. Continued use after changes constitutes
          acceptance.
        </p>
      </section>

      <section>
        <h2>9. Governing Law</h2>
        <p>These terms are governed by applicable law.</p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>For questions about these terms:</p>
        <ul>
          <li>
            GitHub:{" "}
            <a
              href="https://github.com/rejisterjack/frontend-dev-helper/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/rejisterjack/frontend-dev-helper/issues
            </a>
          </li>
        </ul>
      </section>
    </LegalShell>
  );
}

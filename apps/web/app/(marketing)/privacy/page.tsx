import { Shield } from "lucide-react";
import { LegalShell } from "@/components/ui/legal-shell";

export const metadata = {
  title: "Privacy Policy — FrontendDevHelper",
  description: "Privacy policy for FrontendDevHelper browser extension.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated="May 7, 2026"
      icon={Shield}
    >
      <section>
        <h2>1. Overview</h2>
        <p>
          FrontendDevHelper (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
          operates the browser extension FrontendDevHelper. We are committed to
          protecting your privacy. This policy explains what data we collect,
          how we use it, and your rights.
        </p>
      </section>

      <section>
        <h2>2. Data We Collect</h2>
        <h3>2.1 Extension Data (Local Only)</h3>
        <p>
          All extension tool states, settings, preferences, and usage data are
          stored <strong>locally in your browser</strong> using chrome.storage.
          This data never leaves your device unless you explicitly enable
          optional features.
        </p>
        <ul>
          <li>Tool activation states</li>
          <li>User preferences and settings</li>
          <li>Usage statistics (stored locally only)</li>
          <li>
            CSS snapshots and inspection data (processed in-browser, never
            transmitted)
          </li>
        </ul>

        <h3>2.2 AI Analysis (Optional, User-Configured)</h3>
        <p>
          AI-powered suggestions require you to provide your own API key (via
          OpenRouter or compatible providers). Page context is sent{" "}
          <strong>directly from your browser to the AI provider</strong> — it
          does not pass through our servers. We never see, store, or log your
          page content.
        </p>
      </section>

      <section>
        <h2>3. How We Use Your Data</h2>
        <ul>
          <li>To provide and improve the extension functionality</li>
          <li>To respond to support requests</li>
        </ul>
        <p>
          We do <strong>not</strong> use your data for advertising, sell it to
          third parties, or build behavioral profiles. We collect{" "}
          <strong>zero telemetry</strong> by default.
        </p>
      </section>

      <section>
        <h2>4. Third-Party Services</h2>
        <ul>
          <li>
            <strong>OpenRouter</strong> — AI API proxy (user-configured,
            optional). See{" "}
            <a
              href="https://openrouter.ai/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              openrouter.ai/privacy
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Data Retention</h2>
        <ul>
          <li>
            Extension data: retained in your browser until you uninstall or
            clear storage
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Your Rights</h2>
        <p>You may at any time:</p>
        <ul>
          <li>
            Export or delete all locally stored extension data via Chrome
            settings
          </li>
          <li>
            Disable optional AI features by removing your API key in settings
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          All tool processing happens locally in your browser. No data is
          transmitted unless you explicitly configure optional AI features.
        </p>
      </section>

      <section>
        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. We will notify you of
          material changes by posting the updated policy on this page with a
          revised &quot;Last updated&quot; date.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>For privacy-related inquiries:</p>
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

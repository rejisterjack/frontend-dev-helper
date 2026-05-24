import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — FrontendDevHelper',
  description: 'Privacy policy for FrontendDevHelper browser extension.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-3xl mx-auto px-6 py-32">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-neutral-500 text-sm font-bold">
              Last updated: May 7, 2026
            </p>
          </div>
        </div>

        <div className="prose prose-invert prose-neutral space-y-8 text-neutral-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              1. Overview
            </h2>
            <p>
              FrontendDevHelper (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the browser extension
              FrontendDevHelper. We are committed to protecting your privacy. This policy
              explains what data we collect, how we use it, and your rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              2. Data We Collect
            </h2>
            <h3 className="text-lg font-bold text-white mb-2">
              2.1 Extension Data (Local Only)
            </h3>
            <p>
              All extension tool states, settings, preferences, and usage data are stored{' '}
              <strong>locally in your browser</strong> using chrome.storage. This data never
              leaves your device unless you explicitly enable optional features.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tool activation states</li>
              <li>User preferences and settings</li>
              <li>Usage statistics (stored locally only)</li>
              <li>
                CSS snapshots and inspection data (processed in-browser, never transmitted)
              </li>
            </ul>

            <h3 className="text-lg font-bold text-white mb-2 mt-6">
              2.2 AI Analysis (Optional, User-Configured)
            </h3>
            <p>
              AI-powered suggestions require you to provide your own API key (via OpenRouter
              or compatible providers). Page context is sent{' '}
              <strong>directly from your browser to the AI provider</strong> — it does not
              pass through our servers. We never see, store, or log your page content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              3. How We Use Your Data
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and improve the extension functionality</li>
              <li>To respond to support requests</li>
            </ul>
            <p className="mt-4">
              We do <strong>not</strong> use your data for advertising, sell it to third
              parties, or build behavioral profiles. We collect <strong>zero telemetry</strong> by default.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              4. Third-Party Services
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>OpenRouter</strong> — AI API proxy (user-configured, optional). See{' '}
                <a
                  href="https://openrouter.ai/privacy"
                  className="text-cyan-400 hover:underline"
                >
                  openrouter.ai/privacy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              5. Data Retention
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Extension data: retained in your browser until you uninstall or clear storage
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              6. Your Rights
            </h2>
            <p>You may at any time:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Export or delete all locally stored extension data via Chrome settings
              </li>
              <li>
                Disable optional AI features by removing your API key in settings
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              7. Security
            </h2>
            <p>
              All tool processing happens locally in your browser. No data is transmitted
              unless you explicitly configure optional AI features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this policy from time to time. We will notify you of material
              changes by posting the updated policy on this page with a revised &quot;Last
              updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              9. Contact
            </h2>
            <p>For privacy-related inquiries:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                GitHub:{' '}
                <a
                  href="https://github.com/rejisterjack/frontend-dev-helper/issues"
                  className="text-cyan-400 hover:underline"
                >
                  github.com/rejisterjack/frontend-dev-helper/issues
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

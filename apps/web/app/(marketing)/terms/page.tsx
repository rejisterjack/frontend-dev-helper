import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — FrontendDevHelper',
  description: 'Terms of service for FrontendDevHelper browser extension.',
};

export default function TermsPage() {
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
            <FileText className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Terms of Service
            </h1>
            <p className="text-neutral-500 text-sm font-bold">
              Last updated: May 7, 2026
            </p>
          </div>
        </div>

        <div className="prose prose-invert prose-neutral space-y-8 text-neutral-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              1. Acceptance of Terms
            </h2>
            <p>
              By installing or using FrontendDevHelper (&quot;the Extension&quot;), you agree to
              be bound by these Terms of Service. If you do not agree, do not use the Extension.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              2. Description of Service
            </h2>
            <p>
              FrontendDevHelper is a free, open-source browser extension providing 39 visual debugging
              tools for frontend developers. The Extension is available at no cost under the MIT License.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              3. Open Source License
            </h2>
            <p>
              The Extension is licensed under the MIT License. You are free to use, modify, and
              distribute the Extension in accordance with the terms of the MIT License. The source
              code is available on GitHub.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              4. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Extension to exploit, harm, or gain unauthorized access to websites.</li>
              <li>Use automated systems to scrape or abuse our API endpoints.</li>
              <li>Violate any applicable laws while using the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              5. Intellectual Property
            </h2>
            <p>
              FrontendDevHelper is open source under the MIT License. The name, logo, and brand
              materials are not covered by the MIT License and may not be used without written
              permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              6. Disclaimers
            </h2>
            <p>
              The Extension is provided &quot;as is&quot; without warranty of any kind. We do not
              guarantee that it will be error-free, uninterrupted, or meet your specific
              requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, FrontendDevHelper and its contributors shall not
              be liable for any indirect, incidental, special, or consequential damages arising from
              your use of the Extension.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              8. Changes to Terms
            </h2>
            <p>
              We may update these terms from time to time. Material changes will be posted on our
              website. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              9. Governing Law
            </h2>
            <p>
              These terms are governed by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">
              10. Contact
            </h2>
            <p>For questions about these terms:</p>
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

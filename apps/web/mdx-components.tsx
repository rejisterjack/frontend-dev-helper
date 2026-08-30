import type { MDXComponents } from "mdx/types";

/**
 * Global MDX typography mapping — used by every .mdx page/component.
 * Keys map to the design tokens used across the marketing site.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => (
      <h2
        className="mt-12 text-2xl font-semibold tracking-tight text-text-primary md:text-3xl"
        {...props}
      />
    ),
    h3: (props) => (
      <h3
        className="mt-8 text-xl font-semibold tracking-tight text-text-primary"
        {...props}
      />
    ),
    p: (props) => (
      <p className="mt-5 leading-relaxed text-text-secondary" {...props} />
    ),
    a: (props) => (
      <a
        className="font-medium text-brand-cyan underline-offset-4 hover:underline"
        {...props}
      />
    ),
    ul: (props) => (
      <ul
        className="mt-5 list-disc space-y-2 pl-6 text-text-secondary"
        {...props}
      />
    ),
    ol: (props) => (
      <ol
        className="mt-5 list-decimal space-y-2 pl-6 text-text-secondary"
        {...props}
      />
    ),
    blockquote: (props) => (
      <blockquote
        className="mt-6 border-l-2 border-brand-cyan/40 pl-5 text-text-tertiary italic"
        {...props}
      />
    ),
    pre: (props) => (
      <pre
        className="mt-6 overflow-x-auto rounded-lg border border-line-subtle bg-bg-elevated p-5 font-mono text-sm text-text-secondary"
        {...props}
      />
    ),
    code: (props) => (
      <code
        className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-sm text-text-primary"
        {...props}
      />
    ),
    table: (props) => (
      <div className="mt-6 overflow-x-auto">
        <table
          className="w-full border-collapse text-sm text-text-secondary"
          {...props}
        />
      </div>
    ),
    th: (props) => (
      <th
        className="border-b border-line-subtle px-3 py-2 text-left font-semibold text-text-primary"
        {...props}
      />
    ),
    td: (props) => (
      <td className="border-b border-line-subtle px-3 py-2" {...props} />
    ),
    hr: () => <hr className="mt-10 border-line-subtle" />,
    ...components,
  };
}

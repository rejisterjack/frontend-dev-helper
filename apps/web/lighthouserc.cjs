module.exports = {
  ci: {
    collect: {
      // Boot the built Next.js app on port 7394 (avoids colliding with dev 7393).
      startCommand: "bun run start -- -p 7394",
      url: [
        "http://localhost:7394/",
        "http://localhost:7394/login",
        "http://localhost:7394/tools/css-inspector",
      ],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      // Fail the build if any of these thresholds aren't met. The values
      // are deliberately conservative; tighten as the site matures.
      assertions: {
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
        // Hard failures on these — they kill the UX:
        "first-contentful-paint": ["error", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 3000 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};

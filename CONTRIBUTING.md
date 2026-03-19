# Contributing to FrontendDevHelper

Thank you for your interest in contributing to FrontendDevHelper! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/frontend-dev-helper.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

```bash
# Start development server
npm run dev

# Load extension in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `dist` folder
```

## Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS
- **Linting**: ESLint with Prettier

Run linting:
```bash
npm run lint
npm run format
```

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Pull Request Process

1. Ensure tests pass
2. Update documentation if needed
3. Add a clear PR description
4. Link any related issues

## Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `style:` Formatting changes

## Reporting Bugs

Please include:
- Browser version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## Feature Requests

Open an issue with the `feature-request` label and describe:
- The problem you're solving
- Your proposed solution
- Any alternatives considered

## Code of Conduct

Be respectful, constructive, and inclusive. See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Questions?

Join our discussions or open an issue!

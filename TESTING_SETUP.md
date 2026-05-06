# Testing Setup Guide

This guide will help you set up and run the Jest test suite for OS GameLab.

## Prerequisites

- Node.js installed
- Project dependencies installed (`npm install`)

## Installation Steps

### 1. Install Testing Dependencies

Run the following command to install all required testing packages:

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest
```

### 2. Verify Installation

Check that the following files were created:
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test setup and global mocks
- `__tests__/` - Test directory

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## What's Included

### Test Files Created

1. **API Tests**
   - `__tests__/api/leaderboard.test.ts` - Leaderboard API endpoint tests
   - `__tests__/api/achievements.test.ts` - Achievements API endpoint tests

2. **Library Tests**
   - `__tests__/lib/achievements.test.ts` - Achievement system logic tests

3. **Component Tests**
   - `__tests__/components/leaderboard.test.tsx` - Leaderboard page component tests

### Configuration Files

- `jest.config.js` - Main Jest configuration
- `jest.setup.js` - Global test setup and mocks
- `__tests__/README.md` - Detailed testing documentation

## Running Specific Tests

```bash
# Run only leaderboard tests
npm test leaderboard

# Run only API tests
npm test api

# Run only component tests
npm test components

# Run a specific test file
npm test __tests__/api/leaderboard.test.ts
```

## Understanding Test Output

### Successful Test Run
```
PASS  __tests__/api/leaderboard.test.ts
  Leaderboard API
    GET /api/leaderboard
      ✓ should return leaderboard data successfully (25ms)
      ✓ should assign correct badges based on achievement count (15ms)
      ✓ should handle database errors gracefully (10ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### Failed Test
```
FAIL  __tests__/api/leaderboard.test.ts
  Leaderboard API
    GET /api/leaderboard
      ✕ should return leaderboard data successfully (25ms)

  ● Leaderboard API › GET /api/leaderboard › should return leaderboard data successfully

    expect(received).toHaveLength(expected)

    Expected length: 2
    Received length: 0
```

## Coverage Report

After running `npm run test:coverage`, you'll see:

```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
All files           |   85.5  |   78.2   |   90.1  |   85.5  |
 api/leaderboard    |   95.2  |   88.9   |   100   |   95.2  | 25-27
 api/achievements   |   88.3  |   75.0   |   85.7  |   88.3  | 45-48,62
 lib/achievements   |   92.1  |   85.5   |   95.0  |   92.1  | 78-82
--------------------|---------|----------|---------|---------|-------------------
```

## Troubleshooting

### Issue: "Cannot find module '@/...'"

**Solution**: The path alias is configured in `jest.config.js`. Make sure it matches your `tsconfig.json`:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

### Issue: "ReferenceError: fetch is not defined"

**Solution**: The global fetch mock is in `jest.setup.js`. Make sure it's properly configured:

```javascript
global.fetch = jest.fn()
```

### Issue: "Cannot use import statement outside a module"

**Solution**: Jest is configured to handle TypeScript and JSX. Check that `jest.config.js` uses `next/jest`:

```javascript
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
```

### Issue: Tests timeout

**Solution**: Increase timeout in specific tests:

```typescript
it('should handle slow operation', async () => {
  jest.setTimeout(10000) // 10 seconds
  // ... test code
}, 10000)
```

## Best Practices

1. **Run tests before committing**
   ```bash
   npm test
   ```

2. **Keep tests fast** - Mock external dependencies

3. **Write descriptive test names**
   ```typescript
   it('should return 401 when user is not authenticated', ...)
   ```

4. **Test edge cases**
   - Empty data
   - Error conditions
   - Boundary values

5. **Maintain high coverage** - Aim for >80%

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test -- --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Adding New Tests

### 1. Create Test File

```bash
# For API routes
touch __tests__/api/your-route.test.ts

# For components
touch __tests__/components/your-component.test.tsx

# For utilities
touch __tests__/lib/your-utility.test.ts
```

### 2. Write Tests

```typescript
import { yourFunction } from '@/lib/your-module'

describe('Your Module', () => {
  it('should do something', () => {
    const result = yourFunction()
    expect(result).toBe(expected)
  })
})
```

### 3. Run Your Tests

```bash
npm test your-module
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Support

For issues or questions:
1. Check the `__tests__/README.md` for detailed documentation
2. Review existing test files for examples
3. Consult Jest and Testing Library documentation

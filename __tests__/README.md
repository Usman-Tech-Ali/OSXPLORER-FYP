# Test Suite Documentation

This directory contains the test suite for the OS GameLab application using Jest and React Testing Library.

## Structure

```
__tests__/
├── api/                    # API route tests
│   ├── leaderboard.test.ts
│   └── achievements.test.ts
├── lib/                    # Library/utility tests
│   └── achievements.test.ts
├── components/             # Component tests
│   └── leaderboard.test.tsx
└── README.md
```

## Running Tests

### Install Dependencies First

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test leaderboard
```

## Test Coverage

The test suite covers:

### API Routes
- **Leaderboard API** (`/api/leaderboard`)
  - Fetching leaderboard data
  - Badge assignment based on achievements
  - Error handling
  - Empty state handling
  - Ranking logic

- **Achievements API** (`/api/achievements`)
  - Authentication checks
  - Achievement status calculation
  - Rank determination
  - Error handling

### Libraries
- **Achievement Definitions**
  - Structure validation
  - Unique IDs
  - Point values
  - Rarity consistency
  - Criteria validation

- **Badge System**
  - Badge thresholds
  - Badge ordering
  - Multiple badge assignment

### Components
- **Leaderboard Page**
  - Data fetching and display
  - Rank badges
  - User highlighting
  - Achievement badges
  - Stats display
  - Refresh functionality
  - Empty states
  - Error handling

## Writing New Tests

### API Route Test Template

```typescript
import { GET } from '@/app/api/your-route/route'
import { NextRequest } from 'next/server'

describe('Your API Route', () => {
  it('should handle request successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/your-route')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('expectedProperty')
  })
})
```

### Component Test Template

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import YourComponent from '@/app/your-component/page'

describe('Your Component', () => {
  it('should render correctly', async () => {
    render(<YourComponent />)
    
    await waitFor(() => {
      expect(screen.getByText('Expected Text')).toBeInTheDocument()
    })
  })
})
```

## Mocking

### Common Mocks

The test setup (`jest.setup.js`) includes mocks for:
- `next-auth/react` - Authentication
- `next/navigation` - Router and navigation
- `fetch` - API calls

### Custom Mocks

Add custom mocks in your test files:

```typescript
jest.mock('@/lib/your-module', () => ({
  yourFunction: jest.fn(),
}))
```

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
   ```typescript
   // Arrange
   const mockData = { ... }
   
   // Act
   const result = await yourFunction(mockData)
   
   // Assert
   expect(result).toBe(expected)
   ```

2. **Clear Mocks**: Always clear mocks between tests
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks()
   })
   ```

3. **Descriptive Names**: Use clear test descriptions
   ```typescript
   it('should return 401 when user is not authenticated', ...)
   ```

4. **Test Edge Cases**: Include error scenarios
   - Empty data
   - Invalid input
   - Network errors
   - Authentication failures

5. **Async Testing**: Use `waitFor` for async operations
   ```typescript
   await waitFor(() => {
     expect(screen.getByText('Loaded')).toBeInTheDocument()
   })
   ```

## Continuous Integration

Tests should be run in CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test -- --coverage
```

## Troubleshooting

### Common Issues

1. **Module not found**: Check `moduleNameMapper` in `jest.config.js`
2. **Timeout errors**: Increase timeout in test or use `jest.setTimeout()`
3. **Mock not working**: Ensure mock is defined before import

### Debug Mode

Run tests with debugging:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain >80% code coverage
4. Update this README if adding new test categories

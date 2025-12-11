import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
}));

// Mock antd App component
jest.mock('antd', () => {
  const actualAntd = jest.requireActual('antd');
  return {
    ...actualAntd,
    App: {
      ...actualAntd.App,
      useApp: () => ({
        message: {
          success: jest.fn(),
          error: jest.fn(),
          warning: jest.fn(),
          info: jest.fn(),
        },
        notification: {
          success: jest.fn(),
          error: jest.fn(),
        },
        modal: {
          confirm: jest.fn(),
        },
      }),
    },
  };
});

// Mock fetch globally
global.fetch = jest.fn();

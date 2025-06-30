import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '../../contexts/AuthContext'
import { ToastProvider } from '../../contexts/ToastContext'

// Mock user data
export const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
}

export const mockTailorUser = {
  id: 2,
  name: 'Test Tailor',
  email: 'tailor@example.com',
  role: 'tailor',
}

// Mock auth context values
export const mockAuthContextValue = {
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
}

export const mockAuthContextValueLoggedOut = {
  user: null,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
}

// Mock toast context values
export const mockToastContextValue = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
}

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider value={mockAuthContextValue}>
      <ToastProvider value={mockToastContextValue}>
        {children}
      </ToastProvider>
    </AuthProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Helper to render with custom auth state
export const renderWithAuth = (
  ui: ReactElement,
  authValue = mockAuthContextValue,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider value={authValue}>
      <ToastProvider value={mockToastContextValue}>
        {children}
      </ToastProvider>
    </AuthProvider>
  )
  
  return render(ui, { wrapper: Wrapper, ...options })
}

// Helper to render without auth (logged out state)
export const renderWithoutAuth = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return renderWithAuth(ui, mockAuthContextValueLoggedOut, options)
}

// Mock API responses
export const mockApiResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
})

// Mock fetch for API calls
export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue(mockApiResponse(response, status))
}

// Mock SWR
export const mockSWR = (data: any, error: any = null) => {
  jest.doMock('swr', () => ({
    __esModule: true,
    default: jest.fn(() => ({
      data,
      error,
      isLoading: false,
      mutate: jest.fn(),
    })),
  }))
}

// Test data factories
export const createMockCustomer = (overrides = {}) => ({
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  address: '123 Main St',
  lightspeedId: 'ls-123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockParty = (overrides = {}) => ({
  id: 1,
  name: 'Wedding Party',
  eventDate: '2024-12-31T18:00:00Z',
  customerId: 1,
  notes: 'Test party',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  customer: createMockCustomer(),
  ...overrides,
})

export const createMockAlterationJob = (overrides = {}) => ({
  id: 1,
  jobNumber: 'JOB-001',
  status: 'NOT_STARTED',
  orderStatus: 'ALTERATION_ONLY',
  customerId: 1,
  partyId: 1,
  notes: 'Test alteration',
  qrCode: 'QR-001',
  receivedDate: '2024-01-01T00:00:00Z',
  dueDate: '2024-01-15T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  customer: createMockCustomer(),
  party: createMockParty(),
  ...overrides,
})

export const createMockAppointment = (overrides = {}) => ({
  id: 1,
  partyId: 1,
  dateTime: '2024-01-15T10:00:00Z',
  durationMinutes: 60,
  type: 'fitting',
  status: 'scheduled',
  notes: 'Test appointment',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  party: createMockParty(),
  ...overrides,
})

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

import React from 'react'
import { screen, fireEvent } from '@testing-library/react'
import { render, createMockCustomer } from '../utils/testUtils'
import CustomerCard from '../../components/CustomerCard'

// Mock the router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('CustomerCard', () => {
  const mockCustomer = createMockCustomer()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders customer information correctly', () => {
    render(<CustomerCard customer={mockCustomer} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('+1234567890')).toBeInTheDocument()
  })

  it('handles missing optional fields gracefully', () => {
    const customerWithoutPhone = createMockCustomer({ phone: null })
    render(<CustomerCard customer={customerWithoutPhone} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.queryByText('+1234567890')).not.toBeInTheDocument()
  })

  it('navigates to customer detail page when clicked', () => {
    render(<CustomerCard customer={mockCustomer} />)

    const card = screen.getByRole('button')
    fireEvent.click(card)

    expect(mockPush).toHaveBeenCalledWith('/customers/1')
  })

  it('displays customer initials when no photo is available', () => {
    render(<CustomerCard customer={mockCustomer} />)

    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('shows lightspeed sync status', () => {
    const syncedCustomer = createMockCustomer({ 
      lightspeedId: 'ls-123',
      syncedAt: '2024-01-01T00:00:00Z'
    })
    render(<CustomerCard customer={syncedCustomer} />)

    // Should show sync indicator
    expect(screen.getByTitle('Synced with Lightspeed')).toBeInTheDocument()
  })

  it('shows unsync status for customers without lightspeed id', () => {
    const unsyncedCustomer = createMockCustomer({ 
      lightspeedId: null,
      syncedAt: null
    })
    render(<CustomerCard customer={unsyncedCustomer} />)

    // Should show unsync indicator
    expect(screen.getByTitle('Not synced with Lightspeed')).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    render(<CustomerCard customer={mockCustomer} />)

    const card = screen.getByRole('button')
    expect(card).toHaveClass('bg-white', 'border', 'rounded-lg', 'shadow-sm')
  })

  it('is accessible with proper ARIA attributes', () => {
    render(<CustomerCard customer={mockCustomer} />)

    const card = screen.getByRole('button')
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('John Doe'))
  })
})

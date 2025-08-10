import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { NumberScale } from '../number-scale'

describe('NumberScale Component', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders scale buttons correctly', () => {
    render(
      <NumberScale 
        value={5} 
        onChange={mockOnChange} 
        min={1} 
        max={10} 
      />
    )
    
    // Should render buttons for values 1-10
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByLabelText(`Seleccionar valor ${i}`)).toBeInTheDocument()
    }
  })

  it('highlights selected value', () => {
    render(
      <NumberScale 
        value={7} 
        onChange={mockOnChange} 
        min={1} 
        max={10} 
      />
    )
    
    const selectedButton = screen.getByLabelText('Seleccionar valor 7')
    expect(selectedButton).toHaveClass('border-primary-600', 'bg-primary-600')
    expect(selectedButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onChange when scale value is clicked', () => {
    render(
      <NumberScale 
        value={3} 
        onChange={mockOnChange} 
        min={1} 
        max={5} 
      />
    )
    
    const button = screen.getByLabelText('Seleccionar valor 4')
    fireEvent.click(button)
    
    expect(mockOnChange).toHaveBeenCalledWith(4)
  })

  it('displays label when provided', () => {
    render(
      <NumberScale 
        value={5} 
        onChange={mockOnChange} 
        min={1} 
        max={10}
        label="Califica del 1 al 10"
      />
    )
    
    expect(screen.getByText('Califica del 1 al 10')).toBeInTheDocument()
  })

  it('shows required asterisk for required fields', () => {
    render(
      <NumberScale 
        value={5} 
        onChange={mockOnChange} 
        min={1} 
        max={10}
        label="Puntuación"
        required
      />
    )
    
    expect(screen.getByText('Puntuación')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('displays helper text', () => {
    render(
      <NumberScale 
        value={5} 
        onChange={mockOnChange} 
        min={1} 
        max={10}
        helperText="Selecciona tu nivel de satisfacción"
      />
    )
    
    expect(screen.getByText('Selecciona tu nivel de satisfacción')).toBeInTheDocument()
  })

  it('shows error styling when error prop is true', () => {
    render(
      <NumberScale 
        value={undefined} 
        onChange={mockOnChange} 
        min={1} 
        max={5}
        error
        helperText="Este campo es requerido"
      />
    )
    
    const helperText = screen.getByText('Este campo es requerido')
    expect(helperText).toHaveClass('text-red-600')
    
    // Unselected buttons should have error border
    const button = screen.getByLabelText('Seleccionar valor 1')
    expect(button).toHaveClass('border-red-300')
  })

  it('handles disabled state', () => {
    render(
      <NumberScale 
        value={5} 
        onChange={mockOnChange} 
        min={1} 
        max={3}
        disabled
      />
    )
    
    const button = screen.getByLabelText('Seleccionar valor 2')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
    
    fireEvent.click(button)
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('respects custom step values', () => {
    render(
      <NumberScale 
        value={4} 
        onChange={mockOnChange} 
        min={0} 
        max={10}
        step={2}
      />
    )
    
    // Should render buttons for values 0, 2, 4, 6, 8, 10
    expect(screen.getByLabelText('Seleccionar valor 0')).toBeInTheDocument()
    expect(screen.getByLabelText('Seleccionar valor 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Seleccionar valor 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Seleccionar valor 6')).toBeInTheDocument()
    expect(screen.getByLabelText('Seleccionar valor 8')).toBeInTheDocument()
    expect(screen.getByLabelText('Seleccionar valor 10')).toBeInTheDocument()
    
    // Should not render odd values
    expect(screen.queryByLabelText('Seleccionar valor 1')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Seleccionar valor 3')).not.toBeInTheDocument()
  })

  it('shows min/max labels for small scales', () => {
    render(
      <NumberScale 
        value={3} 
        onChange={mockOnChange} 
        min={1} 
        max={5}
      />
    )
    
    // Should show min and max labels
    const labels = screen.getAllByText('1')
    const maxLabels = screen.getAllByText('5')
    
    expect(labels.length).toBeGreaterThan(1) // Button text + label
    expect(maxLabels.length).toBeGreaterThan(1) // Button text + label
  })

  it('handles keyboard navigation correctly', () => {
    render(
      <NumberScale 
        value={5} 
        onChange={mockOnChange} 
        min={1} 
        max={10}
      />
    )
    
    const button = screen.getByLabelText('Seleccionar valor 3')
    button.focus()
    
    // Should be focusable
    expect(button).toHaveFocus()
    
    // Should have proper focus styling
    expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-primary-500')
  })
})
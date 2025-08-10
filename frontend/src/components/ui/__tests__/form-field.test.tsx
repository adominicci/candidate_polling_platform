import React from 'react'
import { render, screen } from '@testing-library/react'
import { FormField } from '../form-field'
import { Input } from '../input'

describe('FormField Component', () => {
  it('renders children correctly', () => {
    render(
      <FormField>
        <Input placeholder="Test input" />
      </FormField>
    )
    
    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument()
  })

  it('displays label when provided', () => {
    render(
      <FormField label="Nombre">
        <Input />
      </FormField>
    )
    
    expect(screen.getByText('Nombre')).toBeInTheDocument()
  })

  it('shows required asterisk for required fields', () => {
    render(
      <FormField label="Email" required>
        <Input />
      </FormField>
    )
    
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByText('*')).toHaveAttribute('aria-label', 'Campo requerido')
  })

  it('displays error message when provided', () => {
    render(
      <FormField label="Teléfono" error="Formato inválido">
        <Input />
      </FormField>
    )
    
    const errorMessage = screen.getByText('Formato inválido')
    expect(errorMessage).toBeInTheDocument()
    expect(errorMessage).toHaveClass('text-red-600')
    expect(errorMessage).toHaveAttribute('role', 'alert')
  })

  it('displays helper text when no error is present', () => {
    render(
      <FormField label="Password" helperText="Mínimo 8 caracteres">
        <Input />
      </FormField>
    )
    
    const helperText = screen.getByText('Mínimo 8 caracteres')
    expect(helperText).toBeInTheDocument()
    expect(helperText).toHaveClass('text-gray-500')
  })

  it('prioritizes error over helper text', () => {
    render(
      <FormField 
        label="Campo" 
        error="Error presente" 
        helperText="Texto de ayuda"
      >
        <Input />
      </FormField>
    )
    
    expect(screen.getByText('Error presente')).toBeInTheDocument()
    expect(screen.queryByText('Texto de ayuda')).not.toBeInTheDocument()
  })

  it('associates label with input using htmlFor', () => {
    render(
      <FormField label="Test Field" htmlFor="test-input">
        <Input id="test-input" />
      </FormField>
    )
    
    const label = screen.getByText('Test Field')
    expect(label).toHaveAttribute('for', 'test-input')
  })

  it('applies custom className', () => {
    const { container } = render(
      <FormField className="custom-class">
        <Input />
      </FormField>
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Progress } from '../progress'

describe('Progress Component', () => {
  it('renders correctly with default props', () => {
    render(<Progress value={50} />)
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('displays custom label when provided', () => {
    render(<Progress value={75} label="Progreso de la encuesta" />)
    
    expect(screen.getByText('Progreso de la encuesta')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('hides percentage when showPercentage is false', () => {
    render(<Progress value={30} showPercentage={false} />)
    
    expect(screen.queryByText('30%')).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('handles edge cases correctly', () => {
    const { rerender } = render(<Progress value={-10} />)
    expect(screen.getByText('0%')).toBeInTheDocument()

    rerender(<Progress value={150} max={100} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('uses custom max value', () => {
    render(<Progress value={25} max={50} />)
    expect(screen.getByText('50%')).toBeInTheDocument() // 25/50 = 50%
  })

  it('shows success color when complete', () => {
    render(<Progress value={100} />)
    const progressBar = screen.getByRole('progressbar').firstChild as HTMLElement
    expect(progressBar).toHaveClass('bg-success-600')
  })

  it('sets correct ARIA attributes', () => {
    render(<Progress value={60} max={100} label="Test progress" />)
    const progressbar = screen.getByRole('progressbar')
    
    expect(progressbar).toHaveAttribute('aria-valuenow', '60')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    expect(progressbar).toHaveAttribute('aria-label', 'Test progress')
  })
})
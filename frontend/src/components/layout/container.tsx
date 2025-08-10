import * as React from 'react'
import { cx } from '@/lib/utils/cx'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: boolean
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'lg', padding = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cx(
          'mx-auto w-full',
          {
            'max-w-screen-sm': size === 'sm',
            'max-w-screen-md': size === 'md', 
            'max-w-screen-lg': size === 'lg',
            'max-w-screen-xl': size === 'xl',
            'max-w-none': size === 'full',
          },
          padding && 'px-4 sm:px-6 lg:px-8',
          className
        )}
        {...props}
      />
    )
  }
)
Container.displayName = 'Container'

export { Container }
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CastleMark } from './CastleMark'

describe('CastleMark (logotipo del castillo ambulante)', () => {
  it('renderiza un logotipo accesible con su descripción', () => {
    render(<CastleMark />)
    const logo = screen.getByRole('img', { name: 'Castillo ambulante de Howl' })
    expect(logo).toBeInTheDocument()
    expect(logo.querySelector('svg')).toHaveAttribute('viewBox', '0 0 64 64')
  })

  it('respetar el tamaño pedido en el SVG', () => {
    render(<CastleMark size={44} />)
    const svg = screen.getByRole('img', { name: 'Castillo ambulante de Howl' }).querySelector('svg')
    expect(svg).toHaveAttribute('width', '44')
    expect(svg).toHaveAttribute('height', '44')
  })

  it('marca el dibujo interno como decorativo (aria-hidden)', () => {
    render(<CastleMark />)
    const svg = screen.getByRole('img', { name: 'Castillo ambulante de Howl' }).querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})
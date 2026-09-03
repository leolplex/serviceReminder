import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App (carcasa principal)', () => {
  it('renderiza la marca, el hero y las secciones principales', async () => {
    render(<App />)

    // findBy* espera a que el perfil (localStorage) cargue y dicho cambio
    // de estado pase dentro de act(...). El resto son elementos síncronos.
    const castle = await screen.findByRole('img', { name: 'Castillo ambulante de Howl' })
    expect(castle).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /no te tome por sorpresa/i })).toBeInTheDocument()

    // Paso 01: dirección
    expect(screen.getByLabelText('Localidad de Bogotá')).toBeInTheDocument()
    expect(screen.getByLabelText('Dirección en Bogotá')).toBeInTheDocument()
    expect(screen.getByLabelText('Email para avisos')).toBeInTheDocument()

    // El campo de email describe la ayuda para suscribirse
    expect(screen.getByLabelText('Email para avisos')).toHaveAccessibleDescription(/aviso semanal/i)

    // Paso 02: boletín
    expect(screen.getByRole('button', { name: /consultar acueducto/i })).toBeInTheDocument()
    expect(screen.getByText(/viernes 7:00 p\. m\./i)).toBeInTheDocument()
  })
})
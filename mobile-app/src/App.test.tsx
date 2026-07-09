import React from 'react'
import { render, screen } from '@testing-library/react'
import App from './App'

test('muestra el acceso cuando no existe sesión', async () => {
  render(<App />)
  expect(await screen.findByText('Control de Accesos')).toBeInTheDocument()
  expect(screen.getAllByPlaceholderText('guardia@empresa.com').length).toBeGreaterThan(0)
})

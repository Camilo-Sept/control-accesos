describe('Control de Accesos', () => {
  it('muestra el formulario de inicio de sesión', () => {
    cy.visit('/')
    cy.contains('Control de Accesos')
    cy.get('input[type="email"]').should('exist')
    cy.get('input[type="password"]').should('exist')
  })
})

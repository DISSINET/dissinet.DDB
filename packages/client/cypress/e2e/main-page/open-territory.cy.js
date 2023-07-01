describe("open T", () => {
  beforeEach(() => {
    cy.login("admin", "admin");
  });

  it("opens territory", () => {
    cy.get("[data-cy=tree-node-0]").click();
    cy.contains("Statement text").should("be.visible");
  });
});

describe("LeftSideBar Test", () => {

  it("Left-sidebar search Test", () => {

    cy.visit("http://localhost:8080");
    cy.get("#tree-outer-wrapper")
    cy.get("#tree-outer-wrapper").should("be.visible");
    cy.get("#search-tree").type("Information Manager").click();
    cy.get(".title").should("have.text", "Information Manager");
    cy.get("#search-tree").clear()
    cy.get("#search-tree").type("Polystore Indexes").click();
    cy.get(".title").should("have.text", "Polystore Indexes");
    cy.get("#search-tree").clear();
    cy.get("#search-tree").type("Java Ru").click();
    cy.get(".title").should("have.text", "Java Runtime");
    cy.get("#search-tree").clear();

  })

})
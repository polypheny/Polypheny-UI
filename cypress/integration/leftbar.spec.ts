describe("LeftSideBar Test", () => {

  it("Left-sidebar search Test", () => {

    cy.intercept("GET", "/getPageList").as("getpagelist");
    cy.visit("http://localhost:4200");
    cy.wait("@getpagelist");
    cy.get("#search-tree").should("be.visible").type("Information Manager").click();
    cy.get('#tree-inner-wrapper').should("be.visible").then(() => {

      cy.get(".title")
        .should("have.text", "Information Manager");

      cy.get("#search-tree")
        .clear()

      cy.get("#search-tree")
        .type("Polystore Indexes")
        .click();

      cy.get(".title")
        .should("have.text", "Polystore Indexes");

      cy.get("#search-tree")
        .clear();

      cy.get("#search-tree")
        .type("Java Ru")
        .click();

      cy.get(".title")
        .should("have.text", "Java Runtime");

      cy.get("#search-tree")
        .clear();
    })

  })


})
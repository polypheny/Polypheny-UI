describe("Data Test", () => {

  it("Inserting values", () => {

    cy.intercept("GET", "/getTypeInfo").as("typeinfo")
    cy.intercept("GET", "/getForeignKeyActions").as("fkactions")
    cy.intercept("POST", "/getSchemaTree").as("schematree")
    cy.intercept("GET", "/getTypeInfo").as("typeinfo")

    cy.visit("http://localhost:4200/#/views/data-table/public.testing");

    cy.wait("@typeinfo")
    cy.wait("@fkactions")
    cy.wait("@schematree")
    cy.wait("@typeinfo")

    cy.get(":nth-child(1) > app-input > .input-group > .form-control").as("p_id");
    cy.get(":nth-child(2) > app-input > .input-group > .input-group-append > .btn").as("intDataInactive");
    cy.get(":nth-child(2) > app-input > .input-group > .form-control").as("intData")
    cy.get(":nth-child(3) > app-input > .input-group > .input-group-append > .btn").as("dmInactive")
    cy.get(":nth-child(3) > app-input > .input-group > .form-control").as("dm")
    cy.get('.form-check > .input-group-append > .btn').as("booleanDataInactive")
    cy.get(':nth-child(5) > app-input > .input-group > .input-group-append > .btn').as("decimalDataInactive");
    cy.get(':nth-child(5) > app-input > .input-group > .form-control').as("decimalData");
    cy.get(':nth-child(6) > app-input > .input-group > .form-control').as("doubleData");
    cy.get(':nth-child(6) > app-input > .input-group > .input-group-append > .btn').as("doubleDataInactive");

    cy.get("@p_id")
      .click()
      .type("6");
    cy.get("@intDataInactive")
      .click();
    cy.get("@intData")
      .type('60');
    cy.get("@dmInactive")
      .click();
    cy.get("@dm")
      .type('NameF');
    cy.get("@booleanDataInactive")
      .click();
    cy.get('.switch-slider')
      .click();
    cy.get("@decimalDataInactive")
      .click();
    cy.get("@decimalData")
      .type('6.32342');
    cy.get("@doubleDataInactive")
      .click()
    cy.get("@doubleData")
      .type('6.45')
    cy.intercept("POST", '/insertRow').as("insert");
    cy.get('#addColumnBtn')
      .click();
    cy.wait("@insert");

    cy.get('tr[ng-reflect-ng-class="[object Object]"] > :nth-child(1)')
      .should("have.text", 123456)
      .should("be.visible")

  })


  it("Asscending and Descending order test", () => {

    cy.intercept("GET", "/getTypeInfo").as("typeinfo")
    cy.intercept("GET", "/getForeignKeyActions").as("fkactions")
    cy.intercept("POST", "/getSchemaTree").as("schematree")
    cy.intercept("GET", "/getTypeInfo").as("typeinfo")

    cy.visit("http://localhost:4200/#/views/data-table/public.testing");

    cy.wait("@typeinfo")
    cy.wait("@fkactions")
    cy.wait("@schematree")
    cy.wait("@typeinfo")

    // cy.get('tbody > :nth-child(2) > :nth-child(1)')
    //   .contains('td', 1)

    // cy.get('tbody > :nth-child(3) > :nth-child(1)')
    //   .contains('td', 2) 

    cy.get(':nth-child(1) > .btn-light > .icon-arrow-down').click();
    cy.get(':nth-child(1) > .btn-primary').click();

    cy.get("span").contains("6")
      .should("exist");

    cy.get("span").contains("5")
      .should("exist");

    //   cy.get('tbody > :nth-child(2) > :nth-child(1)')
    //   .contains('td', 6)

    // cy.get('tbody > :nth-child(3) > :nth-child(1)')
    //   .contains('td', 5)

  })

  it("deleting data", () => {

    cy.intercept("GET", "/getTypeInfo").as("typeinfo")
    cy.intercept("GET", "/getForeignKeyActions").as("fkactions")
    cy.intercept("POST", "/getSchemaTree").as("schematree")
    cy.intercept("GET", "/getTypeInfo").as("typeinfo")

    cy.visit("http://localhost:4200/#/views/data-table/public.testing");

    cy.wait("@typeinfo")
    cy.wait("@fkactions")
    cy.wait("@schematree")
    cy.wait("@typeinfo")
    cy.intercept('POST', '/deleteRow').as("delete");
    cy.get("i[class='cui-trash']")
      .invoke("show")
      .dblclick({ force: true, multiple: true })
    cy.wait("@delete");

  })


})
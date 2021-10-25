
describe("SQL Interface Test", () => {

  it("Executing Wrong Query Test", () => {

    cy.intercept("POST", "getSchemaTree").as("schematree")
    cy.visit("http://localhost:4200/#/views/querying/console");
    cy.wait("@schematree");

    cy.window().invoke("executeQuery", "Select * from em");

    cy.get(".badge")
      .should("have.text", "!");
    cy.get("p[class='mb-3']")
      .should("have.text", "AvaticaRuntimeException: [Messsage: 'From line 1, column 15 to line 1, column 16: Object 'em' not found', Error code: '-1', SQL State: '', Severity: 'ERROR']");
    cy.contains("span[class='title']", "Stacktrace")
      .should("be.visible");
    cy.contains("span[class='title']", "Query analysis")
      .should("be.visible");

  })

  it('Executing Correct Query Test', () => {


    cy.intercept("POST", "getSchemaTree").as("schematree")
    cy.visit("http://localhost:4200/#/views/querying/sql-console")
    cy.wait("@schematree");
    cy.window().invoke("executeQuery", "CREATE TABLE TestTable(ID INTEGER NOT NULL, DataA VARCHAR(255), DataB VARCHAR(255), PRIMARY KEY(ID))");
    cy.window().invoke("executeQuery", "INSERT INTO TestTable VALUES(1,'FNAME','LNAME')").then(() => {

      cy.contains("span[class='title']", "Execution time")
        .should("be.visible");

      cy.contains("span[class='title']", "Query analysis")
        .should("be.visible");

      cy.contains("span[class='title']", "Routing")
        .should("be.visible");

      cy.contains("span[class='title']", "Logical Query Plan")
        .should("be.visible");

      cy.contains("span[class='title']", "Routed Query Plan")
        .should("be.visible");

    })
    cy.window().invoke("executeQuery", "DROP Table TestTable")

  })


  it('history can be searched', () => {

    cy.intercept("POST", "getSchemaTree").as("schematree")
    cy.visit("http://localhost:4200/#/views/querying/sql-console");
    cy.wait("@schematree");
    cy.window().invoke("executeQuery", "Select * from emp");
    cy.window().invoke("executeQuery", "Select * from depts");
    cy.window().invoke("executeQuery", "Select * from work");
    cy.wait(100);

    cy.get(".history-item").contains("Select * from emp")
      .should("be.visible");
    cy.get(".history-item").contains("Select * from depts")
      .should("be.visible");
    cy.get(".history-item").contains("Select * from work")
      .should("be.visible");

  })


  it('history can be deleted', () => {

    cy.intercept("POST", "getSchemaTree").as("schematree")
    cy.visit("http://localhost:4200/#/views/querying/sql-console")
    cy.wait("@schematree");
    cy.window().invoke("executeQuery", "Select * from emp");
    cy.window().invoke("executeQuery", "Select * from depts");
    cy.window().invoke("executeQuery", "Select * from work");
    cy.get("#history > :nth-child(2)").as("history");
    cy.wait(100);
    cy.get("@history").find("span[class='btn btn-sm btn-light del-hist-item cui-trash']")
      .click({ force: true });
    cy.get("@history").find(".fa-warning")
      .click({ force: true });
    cy.get("@history").find("span[class='btn btn-sm btn-light del-hist-item cui-trash']")
      .invoke('show')
      .click();
    cy.get("@history").find(".fa-warning")
      .click({ force: true });
    cy.get("@history").find("span[class='btn btn-sm btn-light del-hist-item cui-trash']")
      .invoke('show').click();
    cy.get("@history").find(".fa-warning")
      .click({ force: true });
    cy.get('.history-item')
      .should('not.exist');

  })

})

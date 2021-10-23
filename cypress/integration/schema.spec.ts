describe("Schema Test", () => {

  it("Schema View Test", () => {
    cy.intercept("GET", "/getTypeInfo").as("gettypeinfo");
    cy.intercept("GET", "/getForeignKeyActions").as("getforeignkeyactions");
    cy.intercept("POST", "/getSchemaTree").as("postschematree");
    cy.intercept("GET", "/getTypeSchemas").as("gettypeschemas");
    cy.intercept("POST", "/getTables").as("gettables");
    cy.intercept("GET", "/getTypeInfo").as("gettypeinfo");
    cy.intercept("GET", "/getStores").as("getstores");

    cy.visit("http://localhost:4200/#/views/schema-editing/public");
    cy.wait("@postschematree");
    cy.wait("@gettypeinfo");
    cy.wait("@getforeignkeyactions");
    cy.wait("@gettypeschemas");
    cy.wait("@gettables");
    cy.wait("@gettypeinfo");
    cy.wait("@getstores");

    //Creating Table
    cy.get("input[placeholder='column name']").type("Id");
    cy.get("[ng-reflect-model='true']")
      .check()
      .should("be.checked");
    cy.get("[ng-reflect-model='false']")
      .uncheck()
      .should("not.be.checked");
    cy.get("button").contains("null")
      .click();
    cy.get(':nth-child(7) > .input-group > .form-control')
      .type("1");
    cy.get('#udt_name')
      .select("BIGINT")
      .should('be.visible')
      .select("BOOLEAN")
      .should('be.visible')
      .select("DATE")
      .should('be.visible')
      .select("DECIMAL")
      .should('be.visible')
      .select("DOUBLE")
      .should('be.visible')
      .select("FILE")
      .should('be.visible')
      .select("IMAGE")
      .should('be.visible')
      .select("INTEGER")
      .should('be.visible')
      .select("REAL")
      .should('be.visible')
      .select("SMALLINT")
      .should('be.visible')
      .select("SOUND")
      .should('be.visible')
      .select("TIME")
      .should('be.visible')
      .select("TIMESTAMP")
      .should('be.visible')
      .select("TINYINT")
      .should('be.visible')
      .select("VARCHAR")
      .should('be.visible')
      .select("VIDEO")
      .should('be.visible')
      .select("BIGINT")

    cy.get("button")
      .contains("add column").as("addcolbtn");
    cy.get("@addcolbtn")
      .click();
    cy.get("input[placeholder='column name']")
      .last()
      .type("NameData");
    cy.get("[ng-reflect-model='false']")
      .should("not.be.checked");
    cy.get("[ng-reflect-model='true']")
      .last()
      .check()
      .should("be.checked");
    cy.get(':nth-child(2) > :nth-child(4) > #udt_name')
      .last()
      .select("VARCHAR");
    cy.get('#precision1')
      .type("20");
    cy.get("button")
      .contains("null")
      .last()
      .click();

    cy.intercept("POST", "/createTable").as("createtable");
    cy.intercept("POST", "/getTables").as("gettables");

    cy.get("input[placeholder='table name']").type("schemaTest")
    cy.get("button").contains("create table").click();

    cy.wait("@createtable");
    cy.wait("@gettypeinfo");

    cy.get("span")
      .contains("schematest")
      .should("exist")
      .should("be.visible")

    cy.wait("@postschematree");
    cy.wait("@gettables")

  })


  it("Table View Tests", () => {
    cy.intercept("POST", "/getSchemaTree").as("postschematree");
    cy.intercept("GET", "/getTypeInfo").as("gettypeinfo");
    cy.intercept("GET", "/getForeignKeyActions").as("getforeignkeyactions");
    cy.intercept("GET", "/getTypeInfo").as("gettypeinfo");
    cy.intercept("GET", "/getColumns").as("getstores");
    cy.intercept("GET", "/getConstraints").as("getconstraints");
    cy.intercept("GET", "/getIndexes").as("getindexes");
    cy.intercept("GET", "/getAvailableStoresforIndex").as("getstoresforindex");
    cy.intercept("GET", "/getGeneratedNames").as("getgennames");
    cy.intercept("POST", "/addColumn").as("addcolumn");
    cy.intercept("GET", "/getStores").as("getstores");
    cy.intercept("POST", "/addPrimaryKey").as("addpk");

    cy.visit("http://localhost:4200/#/views/schema-editing/public.schematest");
    cy.wait("@postschematree");
    cy.wait("@gettypeinfo");
    cy.wait("@getforeignkeyactions");
    cy.wait("@gettypeinfo");
    cy.wait("@getstores");

    //updates Primary Key
    cy.get("input[placeholder='column name']")
      .last()
      .type("DecimalData");
    cy.get("[ng-reflect-model='true']")
      .should("be.checked");
    cy.get("[ng-reflect-model='true']")
      .first()
      .uncheck()
      .should("not.be.checked");
    cy.get('Select')
      .first()
      .select("DECIMAL");
    cy.get('#createPrecision')
      .type("5")
    cy.get('#createScale')
      .type("2");
    cy.get("input[placeholder='default value']")
      .type("10.123");
    cy.get('#addColumnBtn')
      .click();
    cy.wait("@addcolumn")
    cy.get('#pkcol2')
      .check();
    cy.get("button")
      .contains("update")
      .click();
    cy.wait("@addpk")
    cy.get('#pkcol2')
      .should("be.checked");

  })


  it("Delete Table through Schema View", () => {

    cy.intercept("GET", "/getTypeInfo").as("gettypeinfo");
    cy.intercept("GET", "/getForeignKeyActions").as("getforeignkeyactions");
    cy.intercept("POST", "/getSchemaTree").as("postschematree");
    cy.intercept("GET", "/getTypeSchemas").as("gettypeschemas");
    cy.intercept("POST", "/getTables").as("gettables");
    cy.intercept("GET", "/getTypeInfo").as("gettypeinfo");
    cy.intercept("GET", "/getStores").as("getstores");
    cy.intercept("POST", "/dropTruncateTable").as("droptable");

    cy.visit("http://localhost:4200/#/views/schema-editing/public");

    cy.get("span")
      .contains("schematest")
      .should("exist")
      .should("be.visible")
    cy.wait("@postschematree");
    cy.wait("@gettypeinfo");
    cy.wait("@getforeignkeyactions");
    cy.wait("@gettypeschemas");
    cy.wait("@gettables");
    cy.wait("@gettypeinfo");
    cy.wait("@getstores");


    cy.wait("@postschematree")
    cy.get(':nth-child(1) > :nth-child(4) > .input-group > .form-control')
      .invoke("show")
      .type("drop schematest", { force: true });
    cy.get("button").contains("drop").click();
    cy.wait("@droptable");
    cy.wait("@gettables");

    cy.get("span")
      .contains("schematest")
      .should("not.exist")

  })

})
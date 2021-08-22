describe('UI-Config Test', () => {

  it('Config Test', () => {

    cy.intercept("GET", "/getPageList").as("getpageList")
    cy.intercept("POST", "/getPage").as("getpagepost")

    cy.visit("http://localhost:4200/#/views/config/uiconfigtest");
    cy.wait("@getpageList")
    cy.wait("@getpagepost")

    cy.get(".title").contains("UiConfigTestPage")
      .should("be.visible");

    cy.get("p")
      .should("have.text", "Configuration Description")
      .should("be.visible");

    cy.get('.card-columns > :nth-child(1) > .form-group').as("config1");
    cy.get("@config1").find(".card-header span")
      .should('have.text', "Config");

    cy.get("@config1").find(".card-header small")
      .should('have.text', "Select Config Options");

    cy.get("@config1").find("input[id='Boolean False Test']")
      .should("have.attr", "ng-reflect-model", "false")

    cy.get("@config1").find(".card-body > :nth-child(2) > .form-control")
      .children()
      .should("have.text", "FOOBARFOO_BAR")
      .find("label > input")
      .check()
      .should("be.checked");

    cy.get("@config1").find("input[id='Integer Test']").then(($inp) => {
      cy.wrap($inp)
        .click()
        .clear()
        .type("23")
        .should("have.value", 23);
    })

    cy.get("@config1").find("input[id='Negative Integer Test']").then(($neg) => {
      cy.wrap($neg)
        .clear()
        .type("-123")
        .should("be.visible")
        .should("have.value", "-123")
    })

    cy.get("@config1").find("select[id='clazz Test']")
      .select(['FooImplementation'])
      .should('be.visible')
      .select(['BarImplementation'])
      .should('be.visible')
      .select(['FooBarImplementation'])
      .should('be.visible')

    cy.get("@config1").find("input[id='Boolean True Test']")
      .should("have.attr", "ng-reflect-model", "true")

  })

  it('Config Too Test', () => {

    cy.intercept("GET", "/getPageList").as("getpageList")
    cy.intercept("POST", "/getPage").as("getpagepost")

    cy.visit("http://localhost:4200/#/views/config/uiconfigtest");
    cy.wait("@getpageList")
    cy.wait("@getpagepost")

    cy.get(".title").contains("UiConfigTestPage")
      .should("be.visible");

    cy.get("p").should("have.text", "Configuration Description")
      .should("be.visible");

    cy.get('.card-columns > :nth-child(2) > .form-group').as("config2");

    cy.get("@config2").find(".card-header span")
      .should('have.text', "Config Too");
    cy.get("@config2").find(".card-header small")
      .should('have.text', "Select Config Options");

    cy.get("@config2").find(".card-body > :nth-child(1) > .form-control")
      .children()
      .should("have.text", "FooImplementationBarImplementationFooBarImplementation")
      .find("label > input")
      .uncheck()
      .should("not.be.checked");

    cy.get("@config2").find("input[id='Decimal Test']").then(($inp) => {
      cy.wrap($inp)
        .clear()
        .type("40.33342431")
        .should("have.value", 40.33342431);
    })

    cy.get("@config2").find("select[id='Enum Test']")
      .select(['FOO'])
      .should('be.visible')

    cy.get("@config2").find("select[id='Enum Test']")
      .select(['BAR'])
      .should("be.visible");

    cy.get("@config2").find("select[id='Enum Test']")
      .select(['FOO_BAR'])
      .should("be.visible")

    cy.get("@config2").find("input[id='Double Test']").then(($inp) => {
      cy.wrap($inp)
        .clear()
        .type("23.43")
        .should("have.value", 23.43);
    })

    cy.get("@config2").find("input[id='Long']").then(($inp) => {
      cy.wrap($inp)
        .clear()
        .type("999999999999")
        .should("have.value", 999999999999);
    })

  })


})
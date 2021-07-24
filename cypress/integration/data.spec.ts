describe("Data Test", () => {

    it("Insert valuess of different data type", () => {
      cy.visit("http://localhost:4200/#/views/data-table/public.testing");
      cy.get(":nth-child(1) > app-input > .input-group > .form-control").as("p_id");
      cy.get(":nth-child(2) > app-input > .input-group > .input-group-append > .btn").as("intDataInactive");
      cy.get(":nth-child(2) > app-input > .input-group > .form-control").as("intData")
      cy.get(":nth-child(3) > app-input > .input-group > .input-group-append > .btn").as("dmInactive")
      cy.get(":nth-child(3) > app-input > .input-group > .form-control").as("dm")
      cy.get('.form-check > .input-group-append > .btn').as("booleanDataInactive")
      cy.get(':nth-child(5) > app-input > .input-group > .input-group-append > .btn').as("decimalDataInactive");
      cy.get(':nth-child(5) > app-input > .input-group > .form-control').as("decimalData");
      cy.get(':nth-child(6) > app-input > .input-group > .form-control').as("doubleData");
      cy.get(':nth-child(7) > app-input > .input-group > .form-control').as("dateData");
      cy.get(':nth-child(6) > app-input > .input-group > .input-group-append > .btn').as("doubleDataInactive");
      cy.get(':nth-child(7) > app-input > .input-group > .input-group-append > .btn').as("dateDataInactive");


      
      cy.get("@p_id").click().type("1");
      cy.get("@intDataInactive").click();
      cy.get("@intData").type('10');
      cy.get("@dmInactive").click();
      cy.get("@dm").type('NameA');
      cy.get("@booleanDataInactive").click();
      cy.get('.switch-slider').click();
      cy.get("@decimalDataInactive").click();
      cy.get("@decimalData").type('1.32342');
      cy.get("@doubleDataInactive").click()
      cy.get("@doubleData") .type('3.45')
      cy.get("@dateDataInactive").click();
      cy.get("@dateData").click();
      cy.get('.numInput').type('2021');
      cy.get("span").contains('15').click();
      cy.get('#addColumnBtn').click();
      cy.get("td[class='delete']").trigger('mouseover');
      cy.get("i[class='cui-trash']").click({force:true}).click({force:true});
    })

})
describe('The Home Page', () => {
    it('successfully loads', () => {
      
     // Cypress.config('defaultCommandTimeout', 10000);
      cy.visit('http://localhost:4200/#/views/config/uiconfigtest') ;
      cy.get('.title').contains('UiConfigTestPage').should('be.visible'); 
      cy.get('p').should('have.text','Configuration Description');
     
    })

    it.only('File uploads', () => {
      
        // Cypress.config('defaultCommandTimeout', 10000);
         cy.visit('http://localhost:4200/#/views/config/uiconfigtest') ;
         cy.get(".title").contains('UiConfigTestPage').should('be.visible'); 
         cy.get('.card-columns > :nth-child(1) > .form-group').find("div[class='card-header']").contains("File uploads")
            .should('be.visible');
       
        cy.get('.card-columns > :nth-child(1) > .form-group')
        .find("div[class='card-body']")
        .children()
        .contains('file_uploads').should('be.visible');
        cy.get('.card-columns > :nth-child(1) > .form-group')
        .find("div[class='card-body']")
        .children()
        .contains('upload_tmp_dir').should('be.visible');
        cy.get('.card-columns > :nth-child(1) > .form-group')
        .find("div[class='card-body']")
        .children()
        .contains('upload_max_filesize').should('be.visible');
        cy.get('.card-columns > :nth-child(1) > .form-group')
        .find("div[class='card-body']")
        .children()
        .contains('max_file_uploads').should('be.visible');

        cy.get('.card-columns > :nth-child(1) > .form-group')
        .find("div[class='card-body']")
        .find("input[id='upload_tmp_dir']").should('have.value','/directory');


        cy.get('.card-columns > :nth-child(1) > .form-group')
        .find("div[class='card-body']")
        .find("input[id='upload_max_filesize']").should('have.value','32M');


        cy.get('.card-columns > :nth-child(1) > .form-group')
        .find("div[class='card-body']")
        .find("input[id='max_file_uploads']").should('have.value','20');


        cy.get('.card-columns > :nth-child(1) > .form-group')
        .find("div[class='card-body']")
        .find("span[class='switch-slider']").should('be.visible').click();

       })
   
    it('Error Handling and Logging', () => {
      
        // Cypress.config('defaultCommandTimeout', 10000);
         cy.visit('http://localhost:4200/#/views/config/uiconfigtest') ;
         cy.get('.title').contains('UiConfigTestPage').should('be.visible'); 
         cy.get('p').should('have.text','Configuration Description');
        
    })
   
    it('Language Options', () => {
      
        // Cypress.config('defaultCommandTimeout', 10000);
         cy.visit('http://localhost:4200/#/views/config/uiconfigtest') ;
         cy.get('.title').contains('UiConfigTestPage').should('be.visible'); 
         cy.get('p').should('have.text','Configuration Description');
        
       })

       it('DataHandling', () => {
      
        // Cypress.config('defaultCommandTimeout', 10000);
         cy.visit('http://localhost:4200/#/views/config/uiconfigtest') ;
         cy.get('.title').contains('UiConfigTestPage').should('be.visible'); 
         cy.get('p').should('have.text','Configuration Description');
        
       })

       it('Miscellaneous', () => {
      
        // Cypress.config('defaultCommandTimeout', 10000);
         cy.visit('http://localhost:4200/#/views/config/uiconfigtest') ;
         cy.get('.title').contains('UiConfigTestPage').should('be.visible'); 
         cy.get('p').should('have.text','Configuration Description');
        
       })

       it('Paths and Directories', () => {
      
        // Cypress.config('defaultCommandTimeout', 10000);
         cy.visit('http://localhost:4200/#/views/config/uiconfigtest') ;
         cy.get('.title').contains('UiConfigTestPage').should('be.visible'); 
         cy.get('p').should('have.text','Configuration Description');
        
       })


       it('Resource Limits', () => {
      
        // Cypress.config('defaultCommandTimeout', 10000);
         cy.visit('http://localhost:4200/#/views/config/uiconfigtest') ;
         cy.get('.title').contains('UiConfigTestPage').should('be.visible'); 
         cy.get('p').should('have.text','Configuration Description');
        
       })
   
   
   
   
   



  })
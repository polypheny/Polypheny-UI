import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';

import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { PERFECT_SCROLLBAR_CONFIG } from 'ngx-perfect-scrollbar';
import { PerfectScrollbarConfigInterface } from 'ngx-perfect-scrollbar';

import { FormsModule, ReactiveFormsModule} from '@angular/forms';

// coreui / bootstrap imports
import { TooltipModule } from 'ngx-bootstrap/tooltip';
// tree-module
import { TreeModule } from 'angular-tree-component';

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true
};

import { AppComponent } from './app.component';

// Import routing module
import { AppRoutingModule } from './app.routing';

// Import 3rd party components
import { TypeaheadModule } from 'ngx-bootstrap/typeahead';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ChartsModule } from 'ng2-charts/ng2-charts';
import {ViewsModule} from './views/views.module';
import {HttpClientModule} from '@angular/common/http';
import {ComponentsModule} from './components/components.module';
import {AppAsideModule, AppFooterModule, AppHeaderModule, AppSidebarModule} from '@coreui/angular';
import {DefaultLayoutComponent} from './containers/default-layout';

@NgModule({
  imports:[
    ComponentsModule,
    ViewsModule,
    BrowserModule,
    AppRoutingModule,
    PerfectScrollbarModule,
    BsDropdownModule.forRoot(),
    TabsModule.forRoot(),
    ChartsModule,
    // coreui / bootstrap
    TooltipModule.forRoot(),
    AppHeaderModule,
    AppAsideModule,
    AppSidebarModule,
    AppFooterModule,
    // forms
    FormsModule, ReactiveFormsModule,
    TreeModule.forRoot(),
    BsDropdownModule,
    TypeaheadModule.forRoot(),
    HttpClientModule
  ],
  declarations: [
    AppComponent,
    DefaultLayoutComponent
  ],
  providers: [{
    provide: LocationStrategy,
    useClass: HashLocationStrategy
  }],
  bootstrap: [ AppComponent ],
  exports: []
})
export class AppModule { }

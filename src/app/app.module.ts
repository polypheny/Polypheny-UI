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

// Import containers
import { DefaultLayoutComponent } from './containers';

import { P404Component } from './views/error/404.component';
import { P500Component } from './views/error/500.component';
import { LoginComponent } from './views/login/login.component';
import { RegisterComponent } from './coreui/register/register.component';

const APP_CONTAINERS = [
  DefaultLayoutComponent
];

import {
  AppAsideModule,
  AppBreadcrumbModule,
  AppHeaderModule,
  AppFooterModule,
  AppSidebarModule,
} from '@coreui/angular';

// Import routing module
import { AppRoutingModule } from './app.routing';

// Import 3rd party components
import { TypeaheadModule } from 'ngx-bootstrap/typeahead';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ChartsModule } from 'ng2-charts/ng2-charts';
import { EditColumnsComponent } from './views/edit-columns/edit-columns.component';
import { UmlComponent } from './views/uml/uml.component';
import { GraphicalQueryingComponent } from './views/graphical-querying/graphical-querying.component';
import { RightSidebarComponent } from './components/right-sidebar/right-sidebar.component';
import { DynamicFormsComponent } from './components/dynamic-forms/dynamic-forms.component';
import { FormGeneratorComponent } from './views/forms/form-generator/form-generator.component';
import { LeftSidebarComponent } from './components/left-sidebar/left-sidebar.component';
import {ButtonsModule} from 'ngx-bootstrap/buttons';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import {ViewsModule} from './views/views.module';
import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import {HttpClientModule, HttpHeaders} from '@angular/common/http';

@NgModule({
  imports: [
    BrowserModule,
    AppRoutingModule,
    ViewsModule,
    AppAsideModule,
    AppBreadcrumbModule.forRoot(),
    AppFooterModule,
    AppHeaderModule,
    AppSidebarModule,
    PerfectScrollbarModule,
    BsDropdownModule.forRoot(),
    TabsModule.forRoot(),
    ChartsModule,
    // coreui / bootstrap
    TooltipModule.forRoot(),
    // forms
    FormsModule, ReactiveFormsModule,
    TreeModule.forRoot(),
    //ButtonsModule.forRoot(),
    //CollapseModule,
    BsDropdownModule,
    TypeaheadModule.forRoot(),
    HttpClientModule
  ],
  declarations: [
    AppComponent,
    ...APP_CONTAINERS,
    P404Component,
    P500Component,
    LoginComponent,
    RegisterComponent,
    UmlComponent,
    GraphicalQueryingComponent,
    RightSidebarComponent,
    DynamicFormsComponent,
    FormGeneratorComponent,
    LeftSidebarComponent,
    BreadcrumbComponent
  ],
  providers: [{
    provide: LocationStrategy,
    useClass: HashLocationStrategy
  }],
  bootstrap: [ AppComponent ]
})
export class AppModule { }

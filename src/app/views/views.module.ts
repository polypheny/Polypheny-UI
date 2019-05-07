import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ViewsRoutingModule } from './views-routing.module';
import {TableViewComponent} from './table-view/table-view.component';
import {SqlConsoleComponent} from './sql-console/sql-console.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BsDropdownModule, ButtonsModule, CollapseModule, TooltipModule, TypeaheadModule} from 'ngx-bootstrap';
import {ComponentsModule} from '../components/components.module';
import {EditColumnsComponent} from './edit-columns/edit-columns.component';
import {P404Component} from './error/404.component';
import {P500Component} from './error/500.component';
import {LoginComponent} from './login/login.component';
import {AppAsideModule, AppFooterModule, AppHeaderModule, AppSidebarModule} from '@coreui/angular';
import {UmlComponent} from './uml/uml.component';
import {GraphicalQueryingComponent} from './graphical-querying/graphical-querying.component';
import {TreeModule} from 'angular-tree-component';
import {FormGeneratorComponent} from './forms/form-generator/form-generator.component';

@NgModule({
  imports: [
    //AppModule,
    CommonModule,
    ViewsRoutingModule,
    FormsModule, ReactiveFormsModule,
    ButtonsModule.forRoot(),
    CollapseModule,
    ComponentsModule,
    TypeaheadModule,
    // coreui / bootstrap
    TooltipModule.forRoot(),
    AppHeaderModule,
    AppAsideModule,
    AppSidebarModule,
    AppFooterModule,
    TreeModule.forRoot(),
    BsDropdownModule
  ],
  declarations: [
    EditColumnsComponent,
    P404Component,
    P500Component,
    FormGeneratorComponent,
    GraphicalQueryingComponent,
    LoginComponent,
    SqlConsoleComponent,
    TableViewComponent,
    UmlComponent
  ],
  exports: []
})
export class ViewsModule { }

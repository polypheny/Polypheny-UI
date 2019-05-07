import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphComponent } from './graph/graph.component';
import { ChartsModule } from 'ng2-charts';
import { TabsModule, TypeaheadModule } from 'ngx-bootstrap';
import { ToastComponent } from './toast/toast.component';

import { AppBreadcrumbModule } from '@coreui/angular';

import {BreadcrumbComponent} from './breadcrumb/breadcrumb.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {LeftSidebarComponent} from './left-sidebar/left-sidebar.component';
import {TreeModule} from 'angular-tree-component';
import {RightSidebarComponent} from './right-sidebar/right-sidebar.component';
import {RouterModule} from '@angular/router';
import {DataTableComponent} from './data-table/data-table.component';
import {DynamicFormsComponent} from './dynamic-forms/dynamic-forms.component';

@NgModule({
  imports: [
    //AppRoutingModule,
    RouterModule,
    CommonModule,
    ChartsModule,
    TypeaheadModule.forRoot(),
    AppBreadcrumbModule.forRoot(),
    TreeModule.forRoot(),
    TabsModule.forRoot(),
    // forms
    FormsModule, ReactiveFormsModule
  ],
  declarations: [
    BreadcrumbComponent,
    DataTableComponent,
    DynamicFormsComponent,
    GraphComponent,
    LeftSidebarComponent,
    RightSidebarComponent,
    ToastComponent
  ],
  exports: [
    BreadcrumbComponent,
    DataTableComponent,
    DynamicFormsComponent,
    GraphComponent,
    LeftSidebarComponent,
    RightSidebarComponent,
    ToastComponent
  ]
})
export class ComponentsModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ViewsRoutingModule } from './views-routing.module';
import {TableViewComponent} from './table-view/table-view.component';
import {DataTableComponent} from '../components/data-table/data-table.component';
import {SqlConsoleComponent} from './sql-console/sql-console.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ButtonsModule, CollapseModule, TypeaheadModule} from 'ngx-bootstrap';
import {ComponentsModule} from '../components/components.module';
import {EditColumnsComponent} from './edit-columns/edit-columns.component';

@NgModule({
  imports: [
    CommonModule,
    ViewsRoutingModule,
    FormsModule, ReactiveFormsModule,
    ButtonsModule.forRoot(),
    CollapseModule,
    ComponentsModule,
    TypeaheadModule
  ],
  declarations: [
    TableViewComponent,
    DataTableComponent,
    SqlConsoleComponent,
    EditColumnsComponent
  ]
})
export class ViewsModule { }

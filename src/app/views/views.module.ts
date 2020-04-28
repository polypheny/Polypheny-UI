import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ViewsRoutingModule } from './views-routing.module';
import {TableViewComponent} from './table-view/table-view.component';
import {SqlConsoleComponent} from './querying/sql-console/sql-console.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {
  BsDropdownModule,
  ButtonsModule,
  CollapseModule,
  ModalModule, PopoverModule,
  ProgressbarModule,
  TooltipModule,
  TypeaheadModule
} from 'ngx-bootstrap';
import {ComponentsModule} from '../components/components.module';
import {EditColumnsComponent} from './schema-editing/edit-columns/edit-columns.component';
import {AppAsideModule, AppFooterModule, AppHeaderModule, AppSidebarModule} from '@coreui/angular';
import {UmlComponent} from './uml/uml.component';
import {GraphicalQueryingComponent} from './querying/graphical-querying/graphical-querying.component';
import {TreeModule} from 'angular-tree-component';
import {FormGeneratorComponent} from './forms/form-generator/form-generator.component';
import { SchemaEditingComponent } from './schema-editing/schema-editing.component';
import { EditTablesComponent } from './schema-editing/edit-tables/edit-tables.component';
import { MonitoringComponent } from './monitoring/monitoring.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import { RelationalAlgebraComponent } from './querying/relational-algebra/relational-algebra.component';
import { QueryingComponent } from './querying/querying.component';
import { NodeComponent } from './querying/relational-algebra/node/node.component';
import {AutocompleteLibModule} from 'angular-ng-autocomplete';
import { StoresComponent } from './stores/stores.component';
import { HubComponent } from './hub/hub.component';
import { RefinementOptionsComponent } from './querying/graphical-querying/refinement-options/refinement-options.component';
import {Ng5SliderModule} from 'ng5-slider';
import { ExploreByExampleComponent } from './querying/explore-by-example/explore-by-example.component';
import {AboutComponent} from './about/about.component';

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
    TreeModule,
    BsDropdownModule,
    DragDropModule,
    ModalModule.forRoot(),
    AutocompleteLibModule,
    ProgressbarModule,
    Ng5SliderModule, PopoverModule
  ],
  declarations: [
    EditColumnsComponent,
    FormGeneratorComponent,
    GraphicalQueryingComponent,
    SqlConsoleComponent,
    TableViewComponent,
    UmlComponent,
    SchemaEditingComponent,
    EditTablesComponent,
    MonitoringComponent,
    RelationalAlgebraComponent,
    QueryingComponent,
    NodeComponent,
    StoresComponent,
    HubComponent,
    RefinementOptionsComponent,
    ExploreByExampleComponent,
    AboutComponent
  ],
    exports: [
        ExploreByExampleComponent
    ]
})
export class ViewsModule { }

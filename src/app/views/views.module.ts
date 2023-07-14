import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {ViewsRoutingModule} from './views-routing.module';
import {TableViewComponent} from './table-view/table-view.component';
import {ConsoleComponent} from './querying/console/console.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ComponentsModule} from '../components/components.module';
import {EditColumnsComponent} from './schema-editing/edit-columns/edit-columns.component';
import {AppAsideModule, AppFooterModule, AppHeaderModule, AppSidebarModule} from '@coreui/angular';
import {UmlComponent} from './uml/uml.component';
import {GraphicalQueryingComponent} from './querying/graphical-querying/graphical-querying.component';
import {TreeModule} from 'angular-tree-component';
import {FormGeneratorComponent} from './forms/form-generator/form-generator.component';
import {SchemaEditingComponent} from './schema-editing/schema-editing.component';
import {EditTablesComponent} from './schema-editing/edit-tables/edit-tables.component';
import {MonitoringComponent} from './monitoring/monitoring.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {RelationalAlgebraComponent} from './querying/relational-algebra/relational-algebra.component';
import {QueryingComponent} from './querying/querying.component';
import {NodeComponent} from './querying/relational-algebra/node/node.component';
import {AutocompleteLibModule} from 'angular-ng-autocomplete';
import {AdaptersComponent} from './adapters/adapters.component';
import {
    RefinementOptionsComponent
} from './querying/graphical-querying/refinement-options/refinement-options.component';
import {ExploreByExampleComponent} from './querying/explore-by-example/explore-by-example.component';
import {AboutComponent} from './about/about.component';
import {ButtonsModule} from 'ngx-bootstrap/buttons';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {TypeaheadModule} from 'ngx-bootstrap/typeahead';
import {TooltipModule} from 'ngx-bootstrap/tooltip';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {ModalModule} from 'ngx-bootstrap/modal';
import {ProgressbarModule} from 'ngx-bootstrap/progressbar';
import {PopoverModule} from 'ngx-bootstrap/popover';
import {NgxSliderModule} from '@m0t0r/ngx-slider';
import {QueryInterfacesComponent} from './query-interfaces/query-interfaces.component';
import {EditSourceColumnsComponent} from './schema-editing/edit-source-columns/edit-source-columns.component';
import {SearchFilterPipe, ValuePipe} from '../pipes/pipes';
import {
    DocumentEditCollectionsComponent
} from './schema-editing/document-edit-collections/document-edit-collections.component';
import {
    DocumentEditCollectionComponent
} from './schema-editing/document-edit-collection/document-edit-collection.component';
import {StatisticsColumnComponent} from './schema-editing/statistics-column/statistics-column.component';
import {GraphEditGraphComponent} from './schema-editing/graph-edit-graph/graph-edit-graph.component';
import {DockerConfigComponent} from './forms/form-generator/docker-config/docker-config.component';
import {FileUploaderComponent} from './forms/form-generator/file-uploader/file-uploader.component';
import {DockerComponent} from './docker/docker.component';
import {DockerconfigComponent} from './dockerconfig/dockerconfig.component';


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
        PopoverModule,
        NgxSliderModule
    ],
    declarations: [
        EditColumnsComponent,
        FormGeneratorComponent,
        GraphicalQueryingComponent,
        ConsoleComponent,
        TableViewComponent,
        UmlComponent,
        SchemaEditingComponent,
        EditTablesComponent,
        DocumentEditCollectionsComponent,
        DocumentEditCollectionComponent,
        GraphEditGraphComponent,
        MonitoringComponent,
        DashboardComponent,
        RelationalAlgebraComponent,
        QueryingComponent,
        NodeComponent,
        AdaptersComponent,
        RefinementOptionsComponent,
        ExploreByExampleComponent,
        AboutComponent,
        QueryInterfacesComponent,
        EditSourceColumnsComponent,
        StatisticsColumnComponent,
        ValuePipe,
        SearchFilterPipe,
        DockerConfigComponent,
        FileUploaderComponent,
        DockerComponent,
        DockerconfigComponent,
    ],
    exports: [
        ExploreByExampleComponent
    ]
})
export class ViewsModule {
}

import {NgModule} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';

import {ViewsRoutingModule} from './views-routing.module';
import {TableViewComponent} from './table-view/table-view.component';
import {ConsoleComponent} from './querying/console/console.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ComponentsModule} from '../components/components.module';
import {EditColumnsComponent} from './schema-editing/edit-columns/edit-columns.component';
import {UmlComponent} from './uml/uml.component';
import {GraphicalQueryingComponent} from './querying/graphical-querying/graphical-querying.component';
import {FormGeneratorComponent} from './forms/form-generator/form-generator.component';
import {SchemaEditingComponent} from './schema-editing/schema-editing.component';
import {EditTablesComponent} from './schema-editing/edit-tables/edit-tables.component';
import {MonitoringComponent} from './monitoring/monitoring.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {AlgebraComponent} from './querying/algebra/algebra.component';
import {QueryingComponent} from './querying/querying.component';
import {NodeComponent} from './querying/algebra/node/node.component';
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
import {FileUploaderComponent} from './forms/form-generator/file-uploader/file-uploader.component';
import {DockerconfigComponent} from './dockerconfig/dockerconfig.component';
import {
    BadgeComponent,
    BorderDirective,
    ButtonCloseDirective,
    ButtonDirective,
    ButtonGroupComponent,
    CardBodyComponent,
    CardComponent,
    CardFooterComponent,
    CardHeaderComponent,
    ColComponent,
    ColDirective,
    ContainerComponent,
    DropdownComponent,
    DropdownDividerDirective,
    DropdownItemDirective,
    DropdownMenuDirective,
    DropdownToggleDirective,
    FormCheckComponent,
    FormCheckInputDirective,
    FormCheckLabelDirective,
    FormControlDirective,
    FormDirective,
    FormFeedbackComponent,
    FormSelectDirective,
    FormTextDirective,
    GutterDirective,
    HeaderComponent,
    InputGroupComponent,
    InputGroupTextDirective,
    ModalBodyComponent,
    ModalComponent,
    ModalContentComponent,
    ModalDialogComponent,
    ModalFooterComponent,
    ModalHeaderComponent,
    ModalTitleDirective,
    ModalToggleDirective,
    PlaceholderDirective,
    RowComponent,
    RowDirective,
    SpinnerComponent,
    TableDirective,
    TooltipDirective
} from '@coreui/angular';
import {EditEntityComponent} from './schema-editing/edit-entity/edit-entity.component';
import {TreeModule} from "@ali-hm/angular-tree-component";


@NgModule({
    imports: [
        //AppModule,
        CommonModule,
        ViewsRoutingModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonsModule.forRoot(),
        CollapseModule,
        ComponentsModule,
        TypeaheadModule,
        // coreui / bootstrap
        TooltipModule.forRoot(),
        BsDropdownModule,
        DragDropModule,
        ModalModule.forRoot(),
        AutocompleteLibModule,
        ProgressbarModule,
        PopoverModule,
        RowComponent,
        ColComponent,
        ContainerComponent,
        CardComponent,
        CardHeaderComponent,
        CardBodyComponent,
        GutterDirective,
        HeaderComponent,
        CardFooterComponent,
        BorderDirective,
        InputGroupComponent,
        FormDirective,
        FormFeedbackComponent,
        InputGroupTextDirective,
        FormControlDirective,
        RowDirective,
        ColDirective,
        FormSelectDirective,
        ButtonDirective,
        TableDirective,
        FormCheckLabelDirective,
        FormCheckInputDirective,
        DropdownComponent,
        DropdownToggleDirective,
        DropdownMenuDirective,
        FormTextDirective,
        ModalComponent,
        ModalContentComponent,
        ModalDialogComponent,
        ModalHeaderComponent,
        ModalBodyComponent,
        ModalFooterComponent,
        ModalTitleDirective,
        ButtonCloseDirective,
        ModalToggleDirective,
        ButtonGroupComponent,
        DropdownItemDirective,
        DropdownDividerDirective,
        TooltipDirective,
        SpinnerComponent,
        NgOptimizedImage,
        BadgeComponent,
        FormCheckComponent,
        TreeModule,
        PlaceholderDirective
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
        AlgebraComponent,
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
        FileUploaderComponent,
        DockerconfigComponent,
        EditEntityComponent,
    ],
  exports: [
    ExploreByExampleComponent,
  ]
})
export class ViewsModule {
}

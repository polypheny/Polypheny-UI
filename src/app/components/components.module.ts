import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {GraphComponent} from './graph/graph.component';
import {NgChartsModule} from 'ng2-charts';

import {
    AccordionButtonDirective,
    AccordionComponent,
    AccordionItemComponent,
    AlertComponent,
    BadgeComponent,
    BgColorDirective,
    BreadcrumbComponent as BreadCrumb,
    ButtonCloseDirective,
    ButtonDirective,
    ButtonGroupComponent,
    ButtonToolbarComponent,
    CardBodyComponent,
    CardComponent,
    CardFooterComponent,
    CardHeaderComponent,
    ColComponent,
    ColDirective,
    CollapseDirective,
    ContainerComponent,
    DropdownComponent,
    DropdownDividerDirective,
    DropdownItemDirective,
    DropdownMenuDirective,
    DropdownToggleDirective,
    FormCheckComponent,
    FormCheckLabelDirective,
    FormControlDirective,
    FormDirective,
    FormFeedbackComponent,
    FormSelectDirective,
    FormTextDirective,
    GutterDirective,
    InputGroupComponent,
    InputGroupTextDirective,
    ListGroupDirective,
    ListGroupItemDirective,
    ModalBodyComponent,
    ModalComponent,
    ModalContentComponent,
    ModalFooterComponent,
    ModalHeaderComponent,
    ModalTitleDirective,
    NavComponent,
    NavItemComponent,
    NavLinkDirective,
    PageItemDirective,
    PageLinkDirective,
    PaginationComponent,
    PopoverDirective,
    ProgressBarComponent,
    ProgressComponent,
    RowComponent,
    RowDirective,
    SpinnerComponent,
    TabContentComponent,
    TabContentRefDirective,
    TableDirective,
    TabPaneComponent,
    TemplateIdDirective,
    TextColorDirective,
    ToastBodyComponent,
    ToastCloseDirective,
    ToastComponent,
    ToasterComponent,
    ToastHeaderComponent,
    TooltipDirective
} from '@coreui/angular';

import {BreadcrumbComponent} from './breadcrumb/breadcrumb.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {LeftSidebarComponent} from './left-sidebar/left-sidebar.component';
import {RightSidebarComponent} from './right-sidebar/right-sidebar.component';
import {RouterModule} from '@angular/router';
import {DataTableComponent} from './data-view/data-table/data-table.component';
import {DynamicFormsComponent} from './dynamic-forms/dynamic-forms.component';
import {RenderItemComponent} from './information-manager/render-item/render-item.component';
import {InformationManagerComponent} from './information-manager/information-manager.component';
import {InputComponent} from './data-view/input/input.component';
import {EditorComponent} from './editor/editor.component';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {TooltipModule} from 'ngx-bootstrap/tooltip';
import {ProgressbarModule} from 'ngx-bootstrap/progressbar';
import {ModalModule} from 'ngx-bootstrap/modal';
import {TabsModule} from 'ngx-bootstrap/tabs';
import {TypeaheadModule} from 'ngx-bootstrap/typeahead';
import {DataCardComponent} from './data-view/data-card/data-card.component';
import {CarouselModule} from 'ngx-bootstrap/carousel';
import {DataViewComponent} from './data-view/data-view.component';
import {MediaComponent} from './data-view/media/media.component';
import {DeleteConfirmComponent} from './delete-confirm/delete-confirm.component';
import {ExpandableTextComponent} from './data-view/expandable-text/expandable-text.component';
import {JsonTextComponent} from './data-view/json-text/json-text.component';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {JsonEditorComponent} from './json/json-editor.component';
import {JsonElemComponent} from './json/json-elem/json-elem.component';
import {DataGraphComponent} from './data-view/data-graph/data-graph.component';
import {DatesPipeModule} from './data-view/shared-module';
import {LoadingScreenComponent} from './loading-screen/loading-screen.component';
import {DockerhandshakeComponent} from './docker/dockerhandshake/dockerhandshake.component';
import {DockersettingsComponent} from './docker/dockersettings/dockersettings.component';
import {TreeModule} from '@ali-hm/angular-tree-component';
import {ToastExposerComponent} from './toast-exposer/toast-exposer.component';
import {ToastComponent as Toast} from './toast-exposer/toast/toast.component';
import {ReloadButtonComponent} from '../views/util/reload-button/reload-button.component';
import {ViewComponent} from './data-view/view/view.component';
import {DockerInstanceComponent} from './docker/dockerinstance/dockerinstance.component';
import {AlgViewerComponent} from './polyalg/polyalg-viewer/alg-viewer.component';
import {AlgNodeComponent} from './polyalg/algnode/alg-node.component';
import {ReteModule} from 'rete-angular-plugin/18';
import {EntityArgComponent} from './polyalg/controls/entity-arg/entity-arg.component';
import {AutocompleteLibModule} from 'angular-ng-autocomplete';
import {ListArgComponent} from './polyalg/controls/list-arg/list-arg.component';
import {RexArgComponent} from './polyalg/controls/rex-arg/rex-arg.component';
import {StringArgComponent} from './polyalg/controls/string-arg/string-arg.component';
import {BooleanArgComponent} from './polyalg/controls/boolean-arg/boolean-arg.component';
import {CustomSocketComponent} from './polyalg/custom-socket/custom-socket.component';
import {CustomConnectionComponent} from './polyalg/custom-connection/custom-connection.component';
import {EnumArgComponent} from './polyalg/controls/enum-arg/enum-arg.component';
import {IntArgComponent} from './polyalg/controls/int-arg/int-arg.component';
import {FieldArgComponent} from './polyalg/controls/field-arg/field-arg.component';
import {CorrelationArgComponent} from './polyalg/controls/correlation-arg/correlation-arg.component';
import {CollationArgComponent} from './polyalg/controls/collation-arg/collation-arg.component';
import {AggArgComponent} from './polyalg/controls/agg-arg/agg-arg.component';
import {LaxAggArgComponent} from './polyalg/controls/lax-agg/lax-agg-arg.component';
import {MagneticConnectionComponent} from './polyalg/polyalg-viewer/magnetic-connection/magnetic-connection.component';
import {PopoverModule} from 'ngx-bootstrap/popover';
import {AlgMetadataComponent} from './polyalg/algnode/alg-metadata/alg-metadata.component';
import {DoubleArgComponent} from './polyalg/controls/double-arg/double-arg.component';
import {WindowArgComponent} from './polyalg/controls/window-arg/window-arg.component';
import {AutocompleteComponent} from './autocomplete/autocomplete.component';


@NgModule({
    imports: [
        //AppRoutingModule,
        RouterModule,
        CommonModule,
        NgChartsModule,
        TypeaheadModule.forRoot(),
        TabsModule.forRoot(),
        ToasterComponent,
        ToastBodyComponent,
        ToastHeaderComponent,
        ProgressbarModule,
        // forms
        FormsModule, ReactiveFormsModule,
        CollapseModule,
        TooltipModule,
        ProgressbarModule.forRoot(),
        ModalModule.forRoot(),
        CarouselModule,
        NgxJsonViewerModule,
        DatesPipeModule,
        ToastComponent,
        BgColorDirective,
        TreeModule,
        RowComponent,
        ColComponent,
        InputGroupComponent,
        FormControlDirective,
        InputGroupTextDirective,
        ProgressBarComponent,
        ProgressComponent,
        ToastCloseDirective,
        BreadCrumb,
        SpinnerComponent,
        ButtonDirective,
        TableDirective,
        CardComponent,
        CardHeaderComponent,
        CardBodyComponent,
        CardFooterComponent,
        FormFeedbackComponent,
        ListGroupDirective,
        ListGroupItemDirective,
        PaginationComponent,
        PageItemDirective,
        PageLinkDirective,
        TextColorDirective,
        ModalComponent,
        ModalContentComponent,
        ModalHeaderComponent,
        ModalBodyComponent,
        ButtonCloseDirective,
        ButtonGroupComponent,
        NavComponent,
        NavItemComponent,
        NavLinkDirective,
        TabContentComponent,
        TabPaneComponent,
        TabContentRefDirective,
        ModalFooterComponent,
        GutterDirective,
        ColDirective,
        DropdownMenuDirective,
        DropdownItemDirective,
        DropdownDividerDirective,
        DropdownToggleDirective,
        ModalTitleDirective,
        FormDirective,
        RowDirective,
        DropdownComponent,
        FormSelectDirective,
        TooltipDirective,
        ContainerComponent,
        ReteModule,
        AutocompleteLibModule,
        FormCheckLabelDirective,
        AccordionComponent,
        AccordionItemComponent,
        AccordionButtonDirective,
        TemplateIdDirective,
        CollapseDirective,
        PopoverDirective,
        PopoverModule,
        ButtonToolbarComponent,
        BadgeComponent,
        FormCheckComponent,
        AlertComponent, FormTextDirective
    ],
    declarations: [
        BreadcrumbComponent,
        DynamicFormsComponent,
        GraphComponent,
        LeftSidebarComponent,
        RightSidebarComponent,
        InformationManagerComponent,
        RenderItemComponent,
        InputComponent,
        EditorComponent,
        JsonEditorComponent,
        DataViewComponent,
        DataCardComponent,
        DataTableComponent,
        DataGraphComponent,
        MediaComponent,
        DeleteConfirmComponent,
        ExpandableTextComponent,
        JsonTextComponent,
        JsonElemComponent,
        LoadingScreenComponent,
        DockerhandshakeComponent,
        DockersettingsComponent,
        ToastExposerComponent,
        Toast,
        ReloadButtonComponent,
        ViewComponent,
        DockerInstanceComponent,
        AlgNodeComponent,
        EntityArgComponent,
        ListArgComponent,
        RexArgComponent,
        StringArgComponent,
        BooleanArgComponent,
        CustomSocketComponent,
        CustomConnectionComponent,
        EnumArgComponent,
        AlgViewerComponent,
        IntArgComponent,
        FieldArgComponent,
        CorrelationArgComponent,
        CollationArgComponent,
        AggArgComponent,
        LaxAggArgComponent,
        MagneticConnectionComponent,
        AlgMetadataComponent,
        DoubleArgComponent,
        WindowArgComponent,
        AutocompleteComponent
    ],
    exports: [
        BreadcrumbComponent,
        DataViewComponent,
        DataTableComponent,
        DataCardComponent,
        DynamicFormsComponent,
        GraphComponent,
        LeftSidebarComponent,
        RightSidebarComponent,
        ToastComponent,
        InformationManagerComponent,
        InputComponent,
        JsonEditorComponent,
        EditorComponent,
        DeleteConfirmComponent,
        LoadingScreenComponent,
        DockerhandshakeComponent,
        DockersettingsComponent,
        ToastExposerComponent,
        Toast,
        ReloadButtonComponent,
        DockerInstanceComponent,
        AlgViewerComponent,
        JsonTextComponent,
        AutocompleteComponent
    ]
})
export class ComponentsModule {
}

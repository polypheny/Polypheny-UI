import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {GraphComponent} from './graph/graph.component';
import {NgChartsModule} from 'ng2-charts';

import {
    BgColorDirective,
    BreadcrumbComponent as BreadCrumb,
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
    DropdownToggleDirective, FormCheckComponent, FormCheckInputDirective, FormCheckLabelDirective,
    FormControlDirective,
    FormDirective,
    FormFeedbackComponent,
    FormSelectDirective,
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
    ProgressBarComponent,
    ProgressComponent,
    RowComponent,
    RowDirective,
    SpinnerComponent,
    TabContentComponent,
    TabContentRefDirective,
    TableDirective,
    TabPaneComponent,
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
import {ExplainVisualizerModule} from '../explain-visualizer/explain-visualizer.module';
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

//import 'hammerjs';

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
        ExplainVisualizerModule,
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
        DropdownToggleDirective, ModalTitleDirective, FormDirective, RowDirective, DropdownComponent, FormSelectDirective, TooltipDirective, ContainerComponent, FormCheckComponent, FormCheckInputDirective, FormCheckLabelDirective
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
    ]
})
export class ComponentsModule {
}

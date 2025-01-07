import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WorkflowViewerComponent} from './components/workflow-viewer/workflow-viewer.component';
import {ReteModule} from 'rete-angular-plugin/17';
import {WorkflowsDashboardComponent} from './components/workflows-dashboard/workflows-dashboard.component';
import {WorkflowSessionComponent} from './components/workflow-session/workflow-session.component';
import {
    AccordionButtonDirective,
    AccordionComponent,
    AccordionItemComponent,
    BadgeComponent,
    ButtonCloseDirective,
    ButtonDirective,
    ButtonGroupComponent,
    ColComponent,
    FormControlDirective,
    FormFeedbackComponent,
    FormSelectDirective,
    GutterDirective,
    InputGroupComponent,
    InputGroupTextDirective,
    ListGroupDirective,
    ListGroupItemDirective,
    ModalBodyComponent,
    ModalComponent,
    ModalFooterComponent,
    ModalHeaderComponent,
    ModalTitleDirective,
    NavComponent,
    NavLinkDirective,
    OffcanvasBodyComponent,
    OffcanvasComponent,
    OffcanvasHeaderComponent,
    OffcanvasTitleDirective,
    OffcanvasToggleDirective,
    RowComponent,
    SidebarBrandComponent,
    SidebarComponent,
    SidebarFooterComponent,
    SidebarHeaderComponent,
    SidebarNavComponent,
    SidebarToggleDirective,
    TabContentComponent,
    TabContentRefDirective,
    TabPaneComponent,
    TemplateIdDirective
} from '@coreui/angular';
import {FormsModule} from '@angular/forms';
import {ActivityComponent} from './components/workflow-viewer/editor/activity/activity.component';
import {EdgeComponent} from './components/workflow-viewer/editor/edge/edge.component';
import {RightMenuComponent} from './components/workflow-viewer/right-menu/right-menu.component';
import {ComponentsModule} from '../../components/components.module';
import {
    ActivityConfigEditorComponent
} from './components/workflow-viewer/right-menu/activity-config-editor/activity-config-editor.component';


@NgModule({
    imports: [
        CommonModule,
        ReteModule,
        AccordionComponent,
        AccordionItemComponent,
        AccordionButtonDirective,
        TemplateIdDirective,
        FormsModule,
        ListGroupDirective,
        ListGroupItemDirective,
        InputGroupComponent,
        ButtonDirective,
        FormControlDirective,
        InputGroupTextDirective,
        ColComponent,
        BadgeComponent,
        FormSelectDirective,
        RowComponent,
        GutterDirective,
        ButtonGroupComponent,
        ButtonCloseDirective,
        ModalBodyComponent,
        ModalComponent,
        ModalFooterComponent,
        ModalHeaderComponent,
        ModalTitleDirective,
        FormFeedbackComponent,
        OffcanvasComponent,
        OffcanvasHeaderComponent,
        OffcanvasBodyComponent,
        OffcanvasToggleDirective,
        OffcanvasTitleDirective,
        SidebarComponent,
        SidebarHeaderComponent,
        SidebarBrandComponent,
        SidebarNavComponent,
        SidebarFooterComponent,
        SidebarToggleDirective,
        NavComponent,
        TabContentRefDirective,
        TabContentComponent,
        TabPaneComponent,
        NavLinkDirective,
        ComponentsModule,
        ActivityConfigEditorComponent,
    ],
    declarations: [
        WorkflowViewerComponent,
        WorkflowsDashboardComponent,
        WorkflowSessionComponent,
        ActivityComponent,
        EdgeComponent,
        RightMenuComponent
    ],
    exports: [
        WorkflowViewerComponent,
        WorkflowsDashboardComponent
    ]
})
export class WorkflowsModule {
}

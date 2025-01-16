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
    BgColorDirective,
    BorderDirective,
    ButtonCloseDirective,
    ButtonDirective,
    ButtonGroupComponent,
    CardBodyComponent,
    CardComponent,
    CardHeaderComponent,
    CardSubtitleDirective,
    CardTextDirective,
    CardTitleDirective,
    ColComponent,
    ColDirective,
    CollapseDirective,
    FormCheckComponent,
    FormCheckInputDirective,
    FormCheckLabelDirective,
    FormControlDirective,
    FormDirective,
    FormFeedbackComponent,
    FormFloatingDirective,
    FormLabelDirective,
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
    PopoverDirective,
    RowComponent,
    RowDirective,
    SidebarBrandComponent,
    SidebarComponent,
    SidebarFooterComponent,
    SidebarHeaderComponent,
    SidebarNavComponent,
    SidebarToggleDirective,
    SpinnerComponent,
    TabContentComponent,
    TabContentRefDirective,
    TableColorDirective,
    TableDirective,
    TabPaneComponent,
    TemplateIdDirective,
    TooltipDirective
} from '@coreui/angular';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ActivityComponent} from './components/workflow-viewer/editor/activity/activity.component';
import {EdgeComponent} from './components/workflow-viewer/editor/edge/edge.component';
import {RightMenuComponent} from './components/workflow-viewer/right-menu/right-menu.component';
import {ComponentsModule} from '../../components/components.module';
import {ActivityConfigEditorComponent} from './components/workflow-viewer/right-menu/activity-config-editor/activity-config-editor.component';
import {WorkflowConfigEditorComponent} from './components/workflow-viewer/workflow-config-editor/workflow-config-editor.component';
import {LeftMenuComponent} from './components/workflow-viewer/left-menu/left-menu.component';
import {ActivityHelpComponent} from './components/workflow-viewer/activity-help/activity-help.component';
import {MarkdownComponent} from 'ngx-markdown';
import {ActivitySettingsComponent} from './components/workflow-viewer/right-menu/activity-settings/activity-settings.component';
import {IntSettingComponent} from './components/workflow-viewer/right-menu/activity-settings/int-setting/int-setting.component';
import {StringSettingComponent} from './components/workflow-viewer/right-menu/activity-settings/string-setting/string-setting.component';
import {CdkDrag, CdkDragPreview, CdkDropList} from '@angular/cdk/drag-drop';
import {AngularMultiSelectModule} from 'angular2-multiselect-dropdown';
import {BooleanSettingComponent} from './components/workflow-viewer/right-menu/activity-settings/boolean-setting/boolean-setting.component';
import {DoubleSettingComponent} from './components/workflow-viewer/right-menu/activity-settings/double-setting/double-setting.component';
import {EntitySettingComponent} from './components/workflow-viewer/right-menu/activity-settings/entity-setting/entity-setting.component';
import {ActivityExecStatsComponent} from './components/workflow-viewer/right-menu/activity-exec-stats/activity-exec-stats.component';

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
        FormDirective,
        FormCheckComponent,
        FormCheckInputDirective,
        FormCheckLabelDirective,
        FormLabelDirective,
        CardComponent,
        CardBodyComponent,
        CardTitleDirective,
        CardSubtitleDirective,
        CardTextDirective,
        CardHeaderComponent,
        BorderDirective,
        MarkdownComponent,
        CollapseDirective,
        CdkDrag,
        CdkDropList,
        CdkDragPreview,
        AngularMultiSelectModule,
        ColDirective,
        ReactiveFormsModule,
        RowDirective,
        TableDirective,
        TableColorDirective,
        TooltipDirective,
        PopoverDirective,
        FormFloatingDirective,
        BgColorDirective,
        SpinnerComponent,
    ],
    declarations: [
        WorkflowViewerComponent,
        WorkflowsDashboardComponent,
        WorkflowSessionComponent,
        ActivityComponent,
        EdgeComponent,
        RightMenuComponent,
        WorkflowConfigEditorComponent,
        LeftMenuComponent,
        ActivityHelpComponent,
        ActivitySettingsComponent,
        IntSettingComponent,
        StringSettingComponent,
        BooleanSettingComponent,
        DoubleSettingComponent,
        EntitySettingComponent,
        ActivityExecStatsComponent
    ],
    exports: [
        WorkflowViewerComponent,
        WorkflowsDashboardComponent
    ]
})
export class WorkflowsModule {
}

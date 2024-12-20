import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {WorkflowViewerComponent} from './components/workflow-viewer/workflow-viewer.component';
import {ReteModule} from 'rete-angular-plugin/17';
import {WorkflowsDashboardComponent} from './components/workflows-dashboard/workflows-dashboard.component';
import {WorkflowSessionComponent} from './components/workflow-session/workflow-session.component';
import {AccordionButtonDirective, AccordionComponent, AccordionItemComponent, ListGroupDirective, ListGroupItemDirective, TemplateIdDirective} from '@coreui/angular';
import {FormsModule} from '@angular/forms';


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
    ],
    declarations: [
        WorkflowViewerComponent,
        WorkflowsDashboardComponent,
        WorkflowSessionComponent
    ],
    exports: [
        WorkflowViewerComponent,
        WorkflowsDashboardComponent
    ]
})
export class WorkflowsModule {
}

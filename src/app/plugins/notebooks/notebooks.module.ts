import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ComponentsModule} from '../../components/components.module';
import {NotebooksComponent} from './components/notebooks.component';
import {ModalModule} from 'ngx-bootstrap/modal';
import {NotebooksSidebarService} from './services/notebooks-sidebar.service';
import {ManageNotebookComponent} from './components/manage-notebook/manage-notebook.component';
import {EditNotebookComponent} from './components/edit-notebook/edit-notebook.component';
import {NotebooksContentService} from './services/notebooks-content.service';
import {NotebooksDashboardComponent} from './components/notebooks-dashboard/notebooks-dashboard.component';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {NbCellComponent} from './components/edit-notebook/nb-cell/nb-cell.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {TooltipModule} from 'ngx-bootstrap/tooltip';
import {MarkdownModule} from 'ngx-markdown';
import {NbInputEditorComponent} from './components/edit-notebook/nb-input-editor/nb-input-editor.component';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {NbOutputDataComponent} from './components/edit-notebook/nb-output-data/nb-output-data.component';
import {UnsavedChangesGuard} from './services/unsaved-changes.guard';
import {NbPolyOutputComponent} from './components/edit-notebook/nb-poly-output/nb-poly-output.component';
import {SafeHtmlPipe} from './services/safe-html.pipe';
import {TreeModule} from '@ali-hm/angular-tree-component';
import {
    BadgeComponent,
    BgColorDirective,
    ButtonCloseDirective,
    ButtonDirective,
    ButtonGroupComponent,
    ButtonToolbarComponent,
    CardBodyComponent,
    CardComponent,
    CardFooterComponent,
    CardHeaderComponent,
    ColComponent,
    ContainerComponent,
    FormControlDirective,
    FormDirective,
    FormSelectDirective,
    FormTextDirective,
    GutterDirective,
    InputGroupComponent,
    InputGroupTextDirective,
    ModalBodyComponent,
    ModalComponent,
    ModalContentComponent,
    ModalDialogComponent,
    ModalFooterComponent,
    ModalHeaderComponent,
    ModalTitleDirective,
    RowComponent,
    RowDirective,
    TooltipDirective
} from '@coreui/angular';
import {IconDirective} from '@coreui/icons-angular';


@NgModule({
    imports: [
        CommonModule,
        FormsModule, ReactiveFormsModule,
        ComponentsModule,
        DragDropModule,
        ModalModule.forRoot(),
        BsDropdownModule,
        TooltipModule,
        MarkdownModule,
        TreeModule,
        NgxJsonViewerModule, ModalHeaderComponent, ModalContentComponent, ModalDialogComponent, ModalComponent, InputGroupComponent, CardBodyComponent, ModalFooterComponent, ButtonDirective, InputGroupTextDirective, FormSelectDirective, FormControlDirective, ModalTitleDirective, ButtonCloseDirective, ModalBodyComponent, CardFooterComponent, CardHeaderComponent, RowComponent, CardComponent, IconDirective, ButtonGroupComponent, ColComponent, BadgeComponent, ContainerComponent, BgColorDirective, ButtonToolbarComponent, TooltipDirective, GutterDirective, FormDirective, FormTextDirective, RowDirective
    ],
    declarations: [
        NotebooksComponent,
        ManageNotebookComponent,
        EditNotebookComponent,
        NotebooksDashboardComponent,
        NbCellComponent,
        NbInputEditorComponent,
        NbOutputDataComponent,
        NbPolyOutputComponent,
        SafeHtmlPipe
    ],
    exports: [
        NotebooksComponent
    ],
    providers: [
        NotebooksSidebarService,
        NotebooksContentService,
        UnsavedChangesGuard
    ]
})
export class NotebooksModule {
}


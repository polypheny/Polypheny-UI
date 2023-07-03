import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NotebooksApiComponent} from './components/notebooks-api-view/notebooks-api.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ComponentsModule} from '../../components/components.module';
import {NotebooksComponent} from './components/notebooks-view/notebooks.component';
import {ModalModule} from 'ngx-bootstrap/modal';
import {NotebooksSidebarService} from './services/notebooks-sidebar.service';
import {ManageNotebookComponent} from './components/notebooks-view/manage-notebook/manage-notebook.component';
import {EditNotebookComponent} from './components/notebooks-view/edit-notebook/edit-notebook.component';
import {NotebooksContentService} from './services/notebooks-content.service';
import {
    NotebooksDashboardComponent
} from './components/notebooks-view/notebooks-dashboard/notebooks-dashboard.component';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {NbCellComponent} from './components/notebooks-view/edit-notebook/nb-cell/nb-cell.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {TooltipModule} from 'ngx-bootstrap/tooltip';
import {MarkdownModule, MarkedOptions} from 'ngx-markdown';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {
    NbInputEditorComponent
} from './components/notebooks-view/edit-notebook/nb-input-editor/nb-input-editor.component';
import {TreeModule} from 'angular-tree-component';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {NbOutputDataComponent} from './components/notebooks-view/edit-notebook/nb-output-data/nb-output-data.component';
import {UnsavedChangesGuard} from './services/unsaved-changes.guard';
import {DbPolyOutputComponent} from './components/notebooks-view/edit-notebook/db-poly-output/db-poly-output.component';
import { SafeHtmlPipe } from './services/safe-html.pipe';


@NgModule({
    imports: [
        CommonModule,
        FormsModule, ReactiveFormsModule,
        ComponentsModule,
        DragDropModule,
        ModalModule.forRoot(),
        BsDropdownModule,
        TooltipModule,
        MarkdownModule.forRoot({
            markedOptions: {
                provide: MarkedOptions,
                useFactory: baseUrlFactory,
                deps: [WebuiSettingsService]
            }
        }),
        TreeModule, NgxJsonViewerModule
    ],
    declarations: [
        NotebooksApiComponent,
        NotebooksComponent,
        ManageNotebookComponent,
        EditNotebookComponent,
        NotebooksDashboardComponent,
        NbCellComponent,
        NbInputEditorComponent,
        NbOutputDataComponent,
        DbPolyOutputComponent,
        SafeHtmlPipe
    ],
    exports: [
        NotebooksApiComponent,
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

// https://stackoverflow.com/questions/69218645/dynamic-configuration-for-angular-module-imports
export function baseUrlFactory(_settings: WebuiSettingsService) {
    return {baseUrl: _settings.getConnection('notebooks.file') + '/notebooks/'};
}

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NotebooksApiComponent} from './components/notebooks-api-view/notebooks-api.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ComponentsModule} from '../../components/components.module';
import {NotebooksComponent} from './components/notebooks-view/notebooks.component';
import {ModalModule} from 'ngx-bootstrap/modal';
import {NotebooksSidebarService} from './services/notebooks-sidebar.service';
import { ManageNotebookComponent } from './components/notebooks-view/manage-notebook/manage-notebook.component';
import { EditNotebookComponent } from './components/notebooks-view/edit-notebook/edit-notebook.component';
import {NotebooksContentService} from './services/notebooks-content.service';
import { NotebooksDashboardComponent } from './components/notebooks-view/notebooks-dashboard/notebooks-dashboard.component';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';


@NgModule({
    imports: [
        CommonModule,
        FormsModule, ReactiveFormsModule,
        ComponentsModule,

        ModalModule.forRoot(),
        BsDropdownModule,
    ],
    declarations: [
        NotebooksApiComponent,
        NotebooksComponent,
        ManageNotebookComponent,
        EditNotebookComponent,
        NotebooksDashboardComponent
    ],
    exports: [
        NotebooksApiComponent,
        NotebooksComponent
    ],
    providers: [
        NotebooksSidebarService,
        NotebooksContentService
    ]
})
export class NotebooksModule {
}

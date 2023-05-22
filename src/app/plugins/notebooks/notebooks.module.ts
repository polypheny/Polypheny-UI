import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NotebooksApiComponent} from './components/notebooks-api-view/notebooks-api.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ComponentsModule} from '../../components/components.module';
import {NotebooksComponent} from './components/notebooks-view/notebooks.component';
import {ModalModule} from 'ngx-bootstrap/modal';
import {NotebooksSidebarService} from './services/notebooks-sidebar.service';


@NgModule({
    imports: [
        CommonModule,
        FormsModule, ReactiveFormsModule,
        ComponentsModule,

        ModalModule.forRoot(),
    ],
    declarations: [
        NotebooksApiComponent,
        NotebooksComponent
    ],
    exports: [
        NotebooksApiComponent,
        NotebooksComponent
    ],
    providers: [
        NotebooksSidebarService
    ]
})
export class NotebooksModule {
}

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
import {
    NotebooksDashboardComponent
} from './components/notebooks-dashboard/notebooks-dashboard.component';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {NbCellComponent} from './components/edit-notebook/nb-cell/nb-cell.component';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {TooltipModule} from 'ngx-bootstrap/tooltip';
import {MarkdownModule, MarkedOptions, MarkedRenderer} from 'ngx-markdown';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {
    NbInputEditorComponent
} from './components/edit-notebook/nb-input-editor/nb-input-editor.component';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {NbOutputDataComponent} from './components/edit-notebook/nb-output-data/nb-output-data.component';
import {UnsavedChangesGuard} from './services/unsaved-changes.guard';
import {NbPolyOutputComponent} from './components/edit-notebook/nb-poly-output/nb-poly-output.component';
import {SafeHtmlPipe} from './services/safe-html.pipe';
import {TreeModule} from '@ali-hm/angular-tree-component';


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
                useFactory: markedOptionsFactory,
                deps: [WebuiSettingsService]
            }
        }),
        TreeModule, 
        NgxJsonViewerModule
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

// https://stackoverflow.com/questions/69218645/dynamic-configuration-for-angular-module-imports
export function markedOptionsFactory(_settings: WebuiSettingsService) {
    const renderer = new MarkedRenderer();

    renderer.blockquote = (text: string) => {
        return '<blockquote class="blockquote"><p>' + text + '</p></blockquote>';
    };

    const defaultLinkRenderer = renderer.link.bind(renderer);
    renderer.link = (href, title, text) => {
        const link = defaultLinkRenderer(href, title, text);
        return link.startsWith('<a') ? '<a target="_blank"' + link.slice(2) : link;
    };

    return {
        renderer: renderer,
        baseUrl: _settings.getConnection('notebooks.file') + '/notebooks/'
    };
}

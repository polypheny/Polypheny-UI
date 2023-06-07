import {NotebooksService} from './notebooks.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {DirectoryContent} from '../models/notebooks-response.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {SidebarButton} from '../../../models/sidebar-button.model';
import {BreadcrumbItem} from '../../../components/breadcrumb/breadcrumb-item';
import {Subject} from 'rxjs';
import {ToastService} from '../../../components/toast/toast.service';
import {Injectable} from '@angular/core';
import {NotebooksContentService} from './notebooks-content.service';

@Injectable()
export class NotebooksSidebarService {

    private _baseUrl = 'views/notebooks/ui';

    private pathSegments: string[];
    private parentPath: string;
    private directoryPath: string;
    private directory: DirectoryContent;

    private movedSubject = new Subject<string>();
    private addButtonSubject = new Subject<void>();
    private uploadButtonSubject = new Subject<void>();
    private notebookClickedSubject = new Subject<[any, any, any]>(); // tree, node, $event

    constructor(private _notebooks: NotebooksService,
                private _content: NotebooksContentService,
                private _leftSidebar: LeftSidebarService,
                private _breadcrumb: BreadcrumbService,
                private _toast: ToastService) {
        _content.onContentChange().subscribe(() => this.update());
        _content.onSessionsChange().subscribe(() => this.updateSidebar());
    }

    private update() {
        this.pathSegments = this._content.pathSegments;
        this.parentPath = this._content.parentPath;
        this.directoryPath = this._content.directoryPath;
        this.directory = this._content.directory;
        this.updateBreadcrumbs();
        this.updateSidebar();

    }

    private updateBreadcrumbs() {
        const renamedSegments = ['Dashboard', ...this.pathSegments.slice(1)];
        const breadcrumbs = renamedSegments.slice(0, -1).map((segment, i) => new BreadcrumbItem(
            segment,
            this._baseUrl + '/' + this.pathSegments.slice(0, i + 1).join('/')
        ));
        breadcrumbs.push(new BreadcrumbItem(renamedSegments[renamedSegments.length - 1]));
        this._breadcrumb.setBreadcrumbs(breadcrumbs);
        this._breadcrumb.hideZoom();
    }

    private updateSidebar() {
        if (!this.directoryPath) {
            return;
        }
        const nodes: SidebarNode[] = [
            new SidebarNode('$breadcrumbs', this.directoryPath.split('/').slice(1).join(' > ')).asSeparator()
        ];
        if (this.parentPath) { //check if not in root
            const parent = new SidebarNode(
                this.parentPath, '..', 'fa fa-arrow-left', this._baseUrl + '/' + this.parentPath,
                false, false, true
            );
            parent.setDropAction((action, treeNode, $event, {from, to}) => {
                this.moveFile(from.data.id, this.parentPath + '/' + from.data.name);
            });
            nodes.push(parent);

        } else {
            nodes.push(new SidebarNode('rootSeparator', '').asSeparator());
        }
        const fileNodes = []; // files should be below all directories
        for (const file of this.directory.content) {
            const routerLink = file.type === 'notebook' ? null : this._baseUrl + '/' + file.path;
            const node = new SidebarNode(
                file.path,
                file.name,
                this.getIcon(file.type, file.type === 'notebook' && this._content.hasRunningKernel(file.path)),
                routerLink,
                true,
                true,
                file.type === 'directory'
            );
            if (file.type === 'directory') {
                node.setDropAction((action, treeNode, $event, {from, to}) => {
                    this.moveFile(from.data.id, to.parent.data.id + '/' + from.data.name);
                });
                nodes.push(node);
                continue;
            } else if (file.type === 'notebook') {
                node.setAction((tree, actionNode, $event) =>
                    this.notebookClickedSubject.next([tree, actionNode, $event]));
            }
            fileNodes.push(node);
        }

        this._leftSidebar.setNodes(nodes.concat(fileNodes));

        const buttons = [
            new SidebarButton('+', () => this.addButtonSubject.next(), false),
            new SidebarButton('Upload', () => this.uploadButtonSubject.next(), true),
        ];
        this._leftSidebar.setTopButtons(buttons);
    }

    private getIcon(type: string, isActive = false) {
        switch (type) {
            case 'file':
                return 'fa fa-file';
            case 'directory':
                return 'fa fa-folder';
            case 'notebook':
                return isActive ? 'fa fa-book text-danger' : 'fa fa-book';
        }
    }

    moveFile(from: string, to: string) {
        //const fromFile = this.directory.content.find(file => file.path === from);
        this._notebooks.moveFile(from, to).subscribe(res => {
            if (this._content.isCurrentPath(from)) {
                this.movedSubject.next(to);
            } else {
                this._content.update();
            }
            if (this._content.hasRunningKernel(from)) {
                this._content.moveSessionsWithFile(from, res.name, to);
            }

        }, err => {
            this._toast.error(err.error.message, `Failed to move '${from}'`);
        });

    }

    open() {
        this._content.setAutoUpdate(true);
        this._leftSidebar.open();
    }

    close() {
        this._content.setAutoUpdate(false);
        this._breadcrumb.hide();
        this._leftSidebar.setTopButtons([]);
        this._leftSidebar.close();
    }

    onAddButtonClicked() {
        return this.addButtonSubject;
    }

    onUploadButtonClicked() {
        return this.uploadButtonSubject;
    }

    onCurrentFileMoved() {
        return this.movedSubject;
    }

    onNotebookClicked() {
        return this.notebookClickedSubject;
    }

    // Getters
    get baseUrl(): string {
        return this._baseUrl;
    }
}

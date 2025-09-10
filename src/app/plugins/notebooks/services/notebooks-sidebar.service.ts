import {NotebooksService} from './notebooks.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {DirectoryContent} from '../models/notebooks-response.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {SidebarButton} from '../../../models/sidebar-button.model';
import {BreadcrumbItem} from '../../../components/breadcrumb/breadcrumb-item';
import {Subject, Subscription} from 'rxjs';
import {inject, Injectable} from '@angular/core';
import {NotebooksContentService} from './notebooks-content.service';
import {LoadingScreenService} from '../../../components/loading-screen/loading-screen.service';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';

@Injectable()
export class NotebooksSidebarService {

    private readonly _notebooks = inject(NotebooksService);
    private readonly _content = inject(NotebooksContentService);
    private readonly _leftSidebar = inject(LeftSidebarService);
    private readonly _breadcrumb = inject(BreadcrumbService);
    private readonly _toast = inject(ToasterService);
    private readonly _loading = inject(LoadingScreenService);

    private _baseUrl = 'views/';

    private pathSegments: string[];
    private parentPath: string;
    private directoryPath: string;
    private directory: DirectoryContent;

    private movedSubject = new Subject<string>();
    private addButtonSubject = new Subject<void>();
    private uploadButtonSubject = new Subject<void>();
    private notebookClickedSubject = new Subject<[any, any, any]>(); // tree, node, $event
    private subscriptions = new Subscription();

    constructor() {
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
    }

    /**
     * Update the sidebar and breadcrumb based on the current state of the NotebooksContentService.
     */
    private updateSidebar() {
        if (!this.directoryPath) {
            return;
        }
        const nodes: SidebarNode[] = [
            new SidebarNode('$breadcrumbs', this.directoryPath.split('/').slice(1).join(' > ') || '/').asSeparator()
        ];
        if (this.parentPath) { //check if not in root
            const parent = new SidebarNode(
                this.parentPath, '..', 'fa fa-arrow-left', this._baseUrl + '/' + this.parentPath,
                false, false, true
            );
            parent.setDropAction((action, treeNode, $event, {from}) => {
                this.moveFile(from.data.id, this.parentPath + '/' + from.data.name);
            });
            nodes.push(parent);

        }
        const fileNodes = []; // files should be below all directories
        for (const file of this.directory?.content || []) {
            const routerLink = file.type === 'notebook' ? null : this._baseUrl + '/' + file.path;
            const node = new SidebarNode(
                file.path,
                file.name,
                this.getIcon(file.type,
                    file.type === 'notebook' && this._content.hasRunningKernel(file.path),
                    this._content.getPreferredSessionId(file.path) != null),
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

        if (this._content.isRoot && !this._loading.isShown() && this._leftSidebar.selectedNodeId) {
            this.deselect();
        }
    }

    private getIcon(type: string, isActive = false, hasPreferred = false) {
        switch (type) {
            case 'file':
                return 'fa fa-file';
            case 'directory':
                return 'fa fa-folder';
            case 'notebook':
                return isActive ?
                    (hasPreferred ? 'fa fa-book text-success' : 'fa fa-book text-danger') :
                    'fa fa-book';
        }
    }

    moveFile(from: string, to: string) {
        if (this._content.hasRunningKernel(from) && this._content.isDirectory(from)) {
            this._toast.warn('Cannot move a folder that contains notebooks with running kernels.');
            return;
        }
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
        this.subscriptions.unsubscribe();
        this.subscriptions = new Subscription();
        this.subscriptions.add(this._content.onContentChange().subscribe(() => this.update()));
        this.subscriptions.add(this._content.onSessionsChange().subscribe(() => this.updateSidebar()));
        this._leftSidebar.open();
    }

    close() {
        this.subscriptions.unsubscribe();
        this._breadcrumb.hide();
        this._leftSidebar.setTopButtons([]);
        this._leftSidebar.close();
    }

    deselect() {
        this._leftSidebar.reset(true);
        this._leftSidebar.selectedNodeId = null;
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

import {NotebooksService} from './notebooks.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {Content, DirectoryContent, KernelSpecs, SessionResponse} from '../models/notebooks-response.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {SidebarButton} from '../../../models/sidebar-button.model';
import {UrlSegment} from '@angular/router';
import {BreadcrumbItem} from '../../../components/breadcrumb/breadcrumb-item';
import {BehaviorSubject, interval, Subject, Subscription} from 'rxjs';
import {ToastService} from '../../../components/toast/toast.service';
import {Injectable} from '@angular/core';

@Injectable()
export class NotebooksSidebarService {

    private _baseUrl = 'views/notebooks/ui';

    private _path: string;
    private pathSegments: string[];
    private _type = 'directory';

    //Example path structure:
    //Files:                                root/parent/current/file.txt
    //Directories (path = currentPath):     root/parent/current/
    private _parentPath: string;
    private _currentPath: string;
    private _isRoot = true;

    private movedSubject = new Subject<string>();
    private invalidLocationSubject = new Subject<string>();
    private addButtonSubject = new Subject<void>();
    private uploadButtonSubject = new Subject<void>();

    private content = new BehaviorSubject<Content>(null);
    private sessions = new BehaviorSubject<SessionResponse[]>([]);
    private kernelSpecs = new BehaviorSubject<KernelSpecs>(null);
    private interval$: Subscription;

    constructor(private _notebooks: NotebooksService,
                private _leftSidebar: LeftSidebarService,
                private _breadcrumb: BreadcrumbService,
                private _toast: ToastService) {
        this.interval$ = interval(15000).subscribe(() => {
            this.updateSidebar();
        });
    }

    update(url: UrlSegment[]) {
        this.pathSegments = url.map((segment) => decodeURIComponent(segment.toString()));
        this._path = this.pathSegments.join('/');
        this._currentPath = this._path;
        this._parentPath = null;

        this._notebooks.getContents(this._path, false).subscribe(res => {
                if (res == null) {
                    this.invalidLocationSubject.next();
                    return;
                }
                this._type = res.type;

                this._isRoot = false;
                if (this._type === 'directory') {
                    if (this.pathSegments.length === 1) {
                        this._isRoot = true;
                    } else {
                        this._parentPath = this.pathSegments.slice(0, -1).join('/');
                    }

                } else {
                    this._currentPath = this.pathSegments.slice(0, -1).join('/');
                    if (this.pathSegments.length > 2) {
                        this._parentPath = this.pathSegments.slice(0, -2).join('/');
                    }
                }
                this.content.next(res);
                this.updateBreadcrumbs();
                this.updateSidebar();
                return;
            },
            err => this.invalidLocationSubject.next());
    }

    private updateBreadcrumbs() {
        const breadcrumbs = this.pathSegments.slice(0, -1).map((segment, i) => new BreadcrumbItem(
            segment,
            this._baseUrl + '/' + this.pathSegments.slice(0, i + 1).join('/')
        ));
        breadcrumbs.push(new BreadcrumbItem(this.pathSegments[this.pathSegments.length - 1]));
        this._breadcrumb.setBreadcrumbs(breadcrumbs);
        this._breadcrumb.hideZoom();
    }

    updateSidebar() {
        this.updateAvailableKernels();
        this._notebooks.getSessions().subscribe(res => {
            this.sessions.next(res);
        });

        this._notebooks.getContents(this._currentPath, true).subscribe(res => {
            const dir = <DirectoryContent>res;
            const nodes: SidebarNode[] = [
                new SidebarNode('$breadcrumbs', this._currentPath.split('/').slice(1).join(' > ')).asSeparator()
            ];
            if (this._parentPath) { //check if not in root
                const parent = new SidebarNode(
                    this._parentPath, '..', 'fa fa-arrow-left', this._baseUrl + '/' + this._parentPath,
                    false, false, true
                );
                parent.setDropAction((action, treeNode, $event, {from, to}) => {
                    this.moveFile(from.data.id, this._parentPath + '/' + from.data.name);
                });
                nodes.push(parent);

            } else {
                nodes.push(new SidebarNode('rootSeparator', '').asSeparator());
            }
            const fileNodes = []; // files should be below all directories
            for (const file of dir.content) {
                const node = new SidebarNode(
                    file.path,
                    file.name,
                    this.getIcon(file.type, file.type === 'notebook' && this.hasRunningKernel(file.path)),
                    this._baseUrl + '/' + file.path,
                    true,
                    true,
                    file.type === 'directory'
                );
                if (file.type === 'directory') {
                    node.setDropAction((action, treeNode, $event, {from, to}) => {
                        this.moveFile(from.data.id, to.parent.data.id + '/' + from.data.name);
                    });
                    nodes.push(node);
                } else {
                    fileNodes.push(node);
                }
            }
            this._leftSidebar.setNodes(nodes.concat(fileNodes));

            const buttons = [
                new SidebarButton('+', () => this.addButtonSubject.next(), false),
                new SidebarButton('Upload', () => this.uploadButtonSubject.next(), true),
            ];
            this._leftSidebar.setTopButtons(buttons);

        }, err => this.invalidLocationSubject.next());
    }

    updateAvailableKernels() {
        this._notebooks.getKernelspecs().subscribe(res => this.kernelSpecs.next(res));
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

    private hasRunningKernel(path: string) {
        const session = this.sessions.getValue().find(s => s.path.startsWith(path));
        return session !== undefined;
    }

    moveFile(from: string, to: string) {
        this._notebooks.moveFile(from, to).subscribe(res => {
            if (from === this._path) {
                this.movedSubject.next(to);
            } else {
                this.updateSidebar();
            }
        }, err => {
            this._toast.error(err.error.message, `Failed to move '${from}'`);
        });

    }

    open() {
        this._leftSidebar.open();
    }

    close() {
        this.interval$.unsubscribe();
        this._leftSidebar.setTopButtons([]);
        this._leftSidebar.close();
    }

    isValidSessionId(sessionId: string, path: string):boolean {
        if (sessionId?.length === 36) {
            const session = this.sessions.getValue().find(s => s.id === sessionId);
            return session && session.path.startsWith(path);
        }
    }

    addSession(session: SessionResponse) {
        this.sessions.next([...this.sessions.getValue(), session]);
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

    onInvalidLocation() {
        return this.invalidLocationSubject;
    }

    onContentChange() {
        return this.content;
    }

    onSessionsChange() {
        return this.sessions;
    }

    onKernelSpecsChange() {
        return this.kernelSpecs;
    }

    // Getters
    get baseUrl(): string {
        return this._baseUrl;
    }

    get path(): string {
        return this._path;
    }

    get type(): string {
        return this._type;
    }

    get parentPath(): string {
        return this._parentPath;
    }

    get currentPath(): string {
        return this._currentPath;
    }

    get isRoot(): boolean {
        return this._isRoot;
    }
}

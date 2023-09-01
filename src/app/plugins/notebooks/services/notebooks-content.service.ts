import {Injectable} from '@angular/core';
import {NotebooksService} from './notebooks.service';
import {BehaviorSubject, forkJoin, interval, Observable, of, Subject, Subscription} from 'rxjs';
import {
    Content,
    DirectoryContent, FileContent, KernelSpec,
    KernelSpecs,
    NotebookContent,
    SessionResponse
} from '../models/notebooks-response.model';
import {UrlSegment} from '@angular/router';
import {mergeMap, switchMap, tap} from 'rxjs/operators';
import {Notebook} from '../models/notebook.model';
import {SchemaRequest} from '../../../models/ui-request.model';
import {CrudService} from '../../../services/crud.service';

@Injectable()
export class NotebooksContentService {

    private _path: string;
    private _pathSegments: string[];
    private _type = 'directory';

    private _parentPath: string; // Files: root/parent/current/file.txt
    private _directoryPath: string; // Directories (path = directoryPath):     root/parent/current/
    private _isRoot = true;

    private contentChange = new Subject<null>();

    private _directory: DirectoryContent;
    private _metadata: Content;
    private cachedNb: NotebookContent = null;
    private sessions = new BehaviorSubject<SessionResponse[]>([]);
    private kernelSpecs = new BehaviorSubject<KernelSpecs>(null);
    private invalidLocationSubject = new Subject<string>();
    private serverUnreachableSubject = new Subject<string>();
    private updateInterval$: Subscription;

    private preferredSessions: Map<string, string> = new Map<string, string>();
    private readonly LOCAL_STORAGE_PREFERRED_SESSIONS_KEY = 'notebooks-preferred-sessions';
    private namespaces = new BehaviorSubject<string[]>([]);

    constructor(private _notebooks: NotebooksService,
                private _crud: CrudService) {
        this.updateExistingNamespaces();
        this.updateAvailableKernels();
        this.updateSessions();
        this.loadPreferredSessions();
    }

    updateLocation(url: UrlSegment[]) {
        this._pathSegments = url.map((segment) => decodeURIComponent(segment.toString()));
        this._pathSegments.unshift('notebooks');
        this._path = this._pathSegments.join('/');
        this._directoryPath = this._path;
        this._parentPath = null;
        if (this._pathSegments.length === 1) {
            this._isRoot = true;
        }

        this.update();
    }

    update() {
        this._notebooks.getContents(this._path, false).pipe(
            mergeMap(res => {
                this.updateMetadata(res);
                return this._notebooks.getContents(this._directoryPath, true);
            })
        ).subscribe(
            res => {
                this.updateDirectory(<DirectoryContent>res);
            },
            () => this.invalidLocationSubject.next(null)
        ).add(() => this.contentChange.next(null));
    }

    private updateMetadata(res: Content) {
        if (res == null) {
            this.invalidLocationSubject.next(null);
            return;
        }
        this._type = res.type;
        this._metadata = res;

        this._isRoot = false;
        if (this._type === 'directory') {
            if (this._pathSegments.length === 1) {
                this._isRoot = true;
            } else {
                this._parentPath = this._pathSegments.slice(0, -1).join('/');
            }

        } else {
            this._directoryPath = this._pathSegments.slice(0, -1).join('/');
            if (this._pathSegments.length > 2) {
                this._parentPath = this._pathSegments.slice(0, -2).join('/');
            }
        }
    }

    private updateDirectory(res: DirectoryContent) {
        this._directory = res;
    }

    updateAvailableKernels() {
        this._notebooks.getKernelspecs().subscribe(res => this.kernelSpecs.next(res),
            () => this.serverUnreachableSubject.next(null));
    }

    updateSessions() {
        forkJoin([this._notebooks.getSessions(), this._notebooks.getOpenConnections()]).subscribe(
            ([sessions, openConnections]) => {
                const modifiedSessions = sessions.map(session => { // insert correct connections number
                    if (session.kernel) {
                        session.kernel.connections = openConnections[session.kernel.id] || 0;
                    }
                    return session;
                });
                this.updatePreferredSessions(modifiedSessions);
                this.sessions.next(modifiedSessions);

            },
            () => {
                this.sessions.next([]);
                this.serverUnreachableSubject.next(null);
            }
        );
    }

    hasRunningKernel(path: string) {
        const session = this.sessions.getValue().find(s => s.path.startsWith(path));
        return session !== undefined;
    }

    isCurrentPath(path: string) {
        return path === this._path;
    }

    setAutoUpdate(active: boolean) {
        this.updateInterval$?.unsubscribe();
        if (active) {
            this.updateInterval$ = interval(10000).subscribe(() => {
                this.updateExistingNamespaces();
                this.updateAvailableKernels();
                this.updateSessions();
                this.update();
            });
            this.updateExistingNamespaces();
        }
    }

    addSession(session: SessionResponse) {
        this.sessions.next([...this.sessions.getValue(), session]);
    }

    deleteSession(sessionId: string): Observable<any> {
        return this._notebooks.deleteSession(sessionId).pipe(
            tap(() => {
                const newSessions = this.sessions.getValue().filter(s => s.id !== sessionId);
                this.sessions.next(newSessions);
            })
        );

    }

    deleteSessions(notebookPath: string): Observable<Object[]> {
        const sessionIds = this.getSessionsForNotebook(notebookPath).map(session => session.id);
        return this._notebooks.deleteSessions(sessionIds).pipe(
            tap(() => {
                const newSessions = this.sessions.getValue().filter(s => !sessionIds.includes(s.id));
                this.sessions.next(newSessions);
            })
        );
    }

    deleteAllSessions(onlyUnused = false): Observable<Object[]> {
        let sessionIds = [];
        if (onlyUnused) {
            sessionIds = this.sessions.getValue()
                .filter(session => session.kernel?.connections === 0)
                .map(session => session.id);
        } else {
            sessionIds = this.sessions.getValue().map(session => session.id);
        }
        return this._notebooks.deleteSessions(sessionIds).pipe(
            tap(() => {
                this.sessions.next(this.sessions.getValue().filter(session => !sessionIds.includes(session.id)));
            })
        );
    }

    moveSessionsWithFile(fromPath: string, toName: string, toPath: string) {
        const sessionsToMove = this.sessions.getValue().filter(s => s.path.startsWith(fromPath));
        const preferredId = this.preferredSessions.get(fromPath);
        this.deletePreferredSessionId(fromPath);
        forkJoin(
            sessionsToMove.map(s => {
                const uid = this._notebooks.getUniqueIdFromSession(s);
                if (preferredId === s.id) {
                    this.setPreferredSessionId(toPath, s.id);
                }
                return this._notebooks.moveSession(s.id, toName + uid, toPath + uid);
            })
        ).subscribe().add(() => this.updateSessions());
    }

    /**
     * Observable that can be used to find out which kernel is specified inside a notebook file.
     * If not yet done, the notebook content must first be retrieved.
     */
    getSpecifiedKernel(path: string): Observable<KernelSpec> {
        if (path === this.cachedNb?.path && this.cachedNbIsFresh()) {
            return of(this.getKernelspec(this.cachedNb.content.metadata?.kernelspec?.name));
        }
        return this._notebooks.getContents(path, true).pipe(
            tap((res: Content) => {
                this.cacheNb(<NotebookContent>res);
            }),
            switchMap(() => of(this.getKernelspec(this.cachedNb.content.metadata?.kernelspec?.name)))
        );
    }

    getNotebookContent(path: string, allowCache = true): Observable<NotebookContent> {
        if (allowCache && path === this.cachedNb?.path && this.cachedNbIsFresh()) {
            const cached = of(this.cachedNb);
            this.cachedNb = null; // only return content once, since it could get modified
            return cached;
        }
        return this._notebooks.getContents(path, true).pipe(
            tap((res: Content) => {
                this.cacheNb(<NotebookContent>res);
            }),
            switchMap(() => of(this.cachedNb))
        );
    }

    /**
     * To determine the specified kernel of a notebook, its content must be loaded.
     * To prevent the notebook from being loaded twice, when it is actually opened, we cache it.
     * It is guaranteed that the cached version is only used if it has the same modification date as the one on disk.
     */
    private cacheNb(nb: NotebookContent) {
        if (nb.type !== 'notebook') {
            this.cachedNb = null;
        }
        this.cachedNb = nb;
    }

    clearNbCache() {
        this.cachedNb = null;
    }

    private cachedNbIsFresh(): boolean {
        return this._directory.content.some(file => {
            return file.path === this.cachedNb?.path &&
                file.last_modified === this.cachedNb.last_modified;
        });
    }

    downloadFile() {
        if (this.type !== 'directory') {
            this._notebooks.getContents(this.metadata.path).subscribe(res => {
                const file = <FileContent>res;
                this.download(file.content, file.name, file.format);
            });
        }
    }

    downloadNotebook(notebook: Notebook, name: string) {
        this.download(notebook, name, 'json');
    }

    private download(content: string | Notebook, name: string, format: string) {
        let blob: Blob;
        if (format === 'json' || typeof content !== 'string') {
            blob = new Blob([JSON.stringify(content, null, 1)], {type: 'application/json'});
        } else if (format === 'base64') {
            // https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
            const byteCharacters = atob(content);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            blob = new Blob([new Uint8Array(byteNumbers)], {type: 'application/octet-stream'});
        } else {
            blob = new Blob([content], {type: 'text/plain'});
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.style.display = 'none';

        a.click();
        URL.revokeObjectURL(url);
    }

    getKernelspec(kernelName: string): KernelSpec {
        return this.kernelSpecs.getValue().kernelspecs[kernelName];
    }

    getSessionsForNotebook(path: string = this.metadata.path): SessionResponse[] {
        return this.sessions.getValue().filter(session => session.path.startsWith(path));
    }

    /**
     * Returns the sessionId for the given notebook that was last used.
     * It is not guaranteed that the session still exists.
     */
    getPreferredSessionId(path: string): string {
        return this.preferredSessions.get(path);
    }

    setPreferredSessionId(path: string, sessionId: string) {
        this.preferredSessions.set(path, sessionId);
        this.storePreferredSessions();
        this.updateSessions();
    }

    deletePreferredSessionId(path: string) {
        this.preferredSessions.delete(path);
        this.storePreferredSessions();
    }

    private updatePreferredSessions(validSessions: SessionResponse[]) {
        const ids = validSessions.map(s => s.id);
        let changed = false;
        for (const [path, id] of this.preferredSessions.entries()) {
            if (!ids.includes(id)) {
                changed = true;
                this.preferredSessions.delete(path);
            }
        }
        if (changed) {
            this.storePreferredSessions();
        }
    }

    private storePreferredSessions() {
        localStorage.setItem(this.LOCAL_STORAGE_PREFERRED_SESSIONS_KEY,
            JSON.stringify(Array.from(this.preferredSessions.entries())));
    }

    private loadPreferredSessions() {
        this.preferredSessions = new Map<string, string>(
            JSON.parse(localStorage.getItem(this.LOCAL_STORAGE_PREFERRED_SESSIONS_KEY)));
    }


    private updateExistingNamespaces() {
        /*this._crud.get(new SchemaRequest('views/notebooks/', false, 1, false)).subscribe(
            res => {
                const names = [];
                for (const namespace of <any[]>res) {
                    names.push(namespace?.name);
                }
                this.namespaces.next(names);
            }todo dl
        );*/
    }

    /**
     * Returns true if there exists a directory file inside the current directory with the specified path.
     * Also returns true if the specified path is the current directory.
     */
    isDirectory(path: string) {
        return path === this._directoryPath || this._directory.content.some(file =>
            file.type === 'directory' && file.path === path);
    }

    onContentChange() {
        return this.contentChange;
    }

    onSessionsChange() {
        return this.sessions;
    }

    onKernelSpecsChange() {
        return this.kernelSpecs;
    }

    onNamespaceChange() {
        return this.namespaces;
    }

    onDirectoryChange() {
        return this._directory;
    }

    onInvalidLocation() {
        return this.invalidLocationSubject;
    }

    onServerUnreachable() {
        return this.serverUnreachableSubject;
    }

    // Getters

    get path(): string {
        return this._path;
    }

    get type(): string {
        return this._type;
    }

    get parentPath(): string {
        return this._parentPath;
    }

    get directoryPath(): string {
        return this._directoryPath;
    }

    get isRoot(): boolean {
        return this._isRoot;
    }

    get pathSegments(): string[] {
        return this._pathSegments;
    }

    get directory(): DirectoryContent {
        return this._directory;
    }

    get metadata(): Content {
        return this._metadata;
    }
}

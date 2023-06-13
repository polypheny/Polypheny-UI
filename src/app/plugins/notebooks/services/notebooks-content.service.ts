import {Injectable} from '@angular/core';
import {NotebooksService} from './notebooks.service';
import {BehaviorSubject, forkJoin, interval, Observable, of, Subject, Subscription} from 'rxjs';
import {
    Content,
    DirectoryContent, KernelSpec,
    KernelSpecs,
    NotebookContent,
    SessionResponse
} from '../models/notebooks-response.model';
import {UrlSegment} from '@angular/router';
import {mergeMap, switchMap, tap} from 'rxjs/operators';

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
    private updateInterval$: Subscription;

    private preferredSessions: Map<string, string> = new Map<string, string>();

    constructor(private _notebooks: NotebooksService,) {
        this.updateAvailableKernels();
        this.updateSessions();
    }

    updateLocation(url: UrlSegment[]) {
        this._pathSegments = url.map((segment) => decodeURIComponent(segment.toString()));
        this._path = this._pathSegments.join('/');
        this._directoryPath = this._path;
        this._parentPath = null;

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
                this.contentChange.next();
            },
            error => this.invalidLocationSubject.next()
        );
    }

    private updateMetadata(res: Content) {
        if (res == null) {
            this.invalidLocationSubject.next();
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
        this._notebooks.getKernelspecs().subscribe(res => this.kernelSpecs.next(res));
    }

    updateSessions() {
        this._notebooks.getSessions().subscribe(res => this.sessions.next(res));
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
            this.updateInterval$ = interval(15000).subscribe(() => {
                this.updateAvailableKernels();
                this.updateSessions();
                this.update();
            });
        }
    }

    addSession(session: SessionResponse) {
        this.sessions.next([...this.sessions.getValue(), session]);
    }

    removeSessions(sessionIds: string[]) {
        const newSessions = this.sessions.getValue().filter(s => !sessionIds.includes(s.id));
        this.sessions.next(newSessions);
    }

    moveSessionsWithFile(fromPath: string, toName: string, toPath: string) {
        const sessionsToMove = this.sessions.getValue().filter(s => s.path.startsWith(fromPath));
        const preferredId = this.preferredSessions.get(fromPath);
        this.preferredSessions.delete(fromPath);
        forkJoin(
            sessionsToMove.map(s => {
                const uid = this._notebooks.getUniqueIdFromSession(s);
                if (preferredId === s.id) {
                    this.preferredSessions.set(toPath, s.id);
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

    getNotebookContent(path: string): Observable<NotebookContent> {
        if (path === this.cachedNb?.path && this.cachedNbIsFresh()) {
            console.log('return cached');
            return of(this.cachedNb);
        }
        return this._notebooks.getContents(path, true).pipe(
            tap((res: Content) => {
                console.log('return new');
                this.cacheNb(<NotebookContent>res);
            }),
            switchMap(() => of(this.cachedNb))
        );
    }

    updateCachedModifiedTime(path: string, lastModified: string) {
        if (path === this.cachedNb?.path) {
            this.cachedNb.last_modified = lastModified;
        }
    }

    private cacheNb(nb: NotebookContent) {
        if (nb.type !== 'notebook') {
            this.cachedNb = null;
        }
        this.cachedNb = nb;
    }

    private cachedNbIsFresh(): boolean {
        return this._directory.content.some(file => {
            return file.path === this.cachedNb?.path &&
                file.last_modified === this.cachedNb.last_modified;
        });
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
        this.updateSessions();
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

    onDirectoryChange() {
        return this._directory;
    }

    onInvalidLocation() {
        return this.invalidLocationSubject;
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

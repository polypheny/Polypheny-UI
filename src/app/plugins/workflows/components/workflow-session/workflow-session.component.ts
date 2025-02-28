import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../../../components/left-sidebar/left-sidebar.service';
import {WorkflowsService} from '../../services/workflows.service';
import {SessionModel} from '../../models/workflows.model';
import {MarkdownService, MarkedRenderer} from 'ngx-markdown';

@Component({
    selector: 'app-workflow-session',
    templateUrl: './workflow-session.component.html',
    styleUrl: './workflow-session.component.scss'
})
export class WorkflowSessionComponent implements OnInit, OnDestroy {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _toast = inject(ToasterService);
    private readonly _sidebar = inject(LeftSidebarService);
    private readonly _workflows = inject(WorkflowsService);
    private readonly _markdown = inject(MarkdownService);

    sessionId: string;
    session: SessionModel;

    nestedSessionStack = signal<SessionModel[]>([]); // nested sessions are stored in a stack to allow navigating back
    nestedSession = computed(() => this.nestedSessionStack()[this.nestedSessionStack().length - 1]);
    hideNested = false;

    ngOnInit(): void {
        this._sidebar.hide();
        this.initMarkdown();

        this._route.paramMap.subscribe(params => {
            this.sessionId = params.get('sessionId');
            if (this.sessionId) {
                this._workflows.getSession(this.sessionId).subscribe({
                    next: res => this.session = res,
                    error: () => this.backToDashboard()
                });
            }
        });

        this.sessionId = this._route.snapshot.paramMap.get('sessionId');
    }

    ngOnDestroy(): void {
    }

    isRegistryLoaded() {
        return this._workflows.registryLoaded();
    }

    backToDashboard() {
        this._router.navigate(['/views/workflows/dashboard']);
    }

    saveSession(message: string) {
        this._workflows.saveSession(this.sessionId, message).subscribe({
            next: version => {
                if (this.session.version !== undefined) {
                    this.session.version = version;
                }
                this._toast.success('Successfully saved workflow version ' + version, 'Saved Workflow');
            },
            error: e => {
                this._toast.error(e.error, 'Unable to Save Workflow');
            }
        });
    }

    terminateSession() {
        this._workflows.terminateSession(this.sessionId).subscribe({
            next: () => this.backToDashboard(),
            error: e => this._toast.error(e.error, 'Unable to Terminate Session'),
        });
    }

    openNestedSession(session: SessionModel) {
        if (session.type !== 'NESTED_SESSION') {
            return;
        }
        this.nestedSessionStack.update(stack => {
            return [...stack, session];
        });
        if (this.nestedSessionStack().length > 1) {
            this.hideNested = true;
            setTimeout(() => this.hideNested = false, 10); // destroy and instantiate editor again
        }
    }

    closeNestedSession() {
        this.nestedSessionStack.update(stack => {
            stack.pop();
            return [...stack];
        });
        if (this.nestedSessionStack().length > 0) {
            this.hideNested = true;
            setTimeout(() => this.hideNested = false, 10); // destroy and instantiate editor again
        }
    }

    private initMarkdown() {
        const renderer = new MarkedRenderer();
        renderer.blockquote = (text: string) => {
            return `<div class="callout callout-warning">
                        ${text}
                    </div>`;
        };

        renderer.codespan = (code) => {
            return `<kbd>${code}</kbd>`;
        };

        const defaultHeadingRenderer = renderer.heading.bind(renderer);
        renderer.heading = (text: string, level: number, raw: string) => {
            return defaultHeadingRenderer(text, level + 3, raw);
        };

        const defaultLinkRenderer = renderer.link.bind(renderer);
        renderer.link = (href, title, text) => {
            const link = defaultLinkRenderer(href, title, text);
            return link.startsWith('<a') ? '<a target="_blank"' + link.slice(2) : link;
        };

        // https://github.com/jfcere/ngx-markdown/issues/149#issuecomment-1008360616
        const baseUrl = 'assets/img/plugin/workflows';
        const defaultImageRenderer = renderer.image.bind(renderer);
        renderer.image = (href: string | null, title: string | null, text) => {
            href = `${baseUrl}/${href}`;
            return defaultImageRenderer(href, title, text);
        };

        this._markdown.renderer = renderer;
    }
}

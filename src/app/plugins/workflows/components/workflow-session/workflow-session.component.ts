import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../../../components/left-sidebar/left-sidebar.service';
import {WorkflowsService} from '../../services/workflows.service';
import {SessionModel} from '../../models/workflows.model';
import {MarkdownService} from 'ngx-markdown';
import {Parser, Renderer, Tokens} from 'marked';

@Component({
    selector: 'app-workflow-session',
    templateUrl: './workflow-session.component.html',
    styleUrl: './workflow-session.component.scss',
    standalone: false
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
    showEditor = true;

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

    backToJob() {
        this._router.navigate([`/views/workflows/jobs/${this.session.jobId}`]);
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

    reloadViewer() {
        this.showEditor = false;
        setTimeout(() => {
            this.showEditor = true;
            this._toast.info('Completed workflow synchronization');
        }, 100);
    }

    renameWorkflow(data: { name: string; description: string }) {
        this._workflows.renameWorkflow(this.session.workflowId, data.name, null, data.description).subscribe({
            next: () => {
                this.session.workflowDef.name = data.name;
                this.session.workflowDef.description = data.description;
                this._toast.success('Successfully modified workflow', 'Modify Workflow');
            },
            error: e => this._toast.error(e.error, 'Unable to modify workflow name / description')
        });
    }

    private initMarkdown() {
        const renderer = new Renderer();
        renderer.parser = new Parser();

        renderer.blockquote = ({tokens}: Tokens.Blockquote) => {
            return `<div class="callout callout-warning">
                        ${renderer.parser.parse(tokens)}
                    </div>`;
        };

        renderer.codespan = ({text}: Tokens.Codespan) => {
            return `<kbd>${text}</kbd>`;
        };

        const defaultHeadingRenderer = renderer.heading.bind(renderer);
        renderer.heading = (heading: Tokens.Heading) => {
            return defaultHeadingRenderer({...heading, depth: heading.depth + 3});
        };

        const defaultLinkRenderer = renderer.link.bind(renderer);
        renderer.link = ({href, title, text}: Tokens.Link) => {
            const link = defaultLinkRenderer(href, title, text);
            return link.startsWith('<a') ? '<a target="_blank"' + link.slice(2) : link;
        };

        // https://github.com/jfcere/ngx-markdown/issues/149#issuecomment-1008360616
        const baseUrl = 'assets/img/plugin/workflows';
        const defaultImageRenderer = renderer.image.bind(renderer);
        renderer.image = ({href, title, text}: Tokens.Image) => {
            href = `${baseUrl}/${href}`;
            return defaultImageRenderer(href, title, text);
        };

        this._markdown.renderer = renderer;
    }
}

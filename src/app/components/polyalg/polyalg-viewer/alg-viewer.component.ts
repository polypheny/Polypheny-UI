import {AfterViewInit, Component, computed, effect, ElementRef, EventEmitter, Injector, Input, OnChanges, OnDestroy, Output, signal, SimpleChanges, untracked, ViewChild} from '@angular/core';
import {createEditor, UserMode} from './alg-editor';
import {PlanNode} from '../models/polyalg-plan.model';
import {PolyAlgService} from '../polyalg.service';
import {EditorComponent} from '../../editor/editor.component';
import {AlgValidatorService, trimLines} from './alg-validator.service';
import {ToasterService} from '../../toast-exposer/toaster.service';
import {Subscription, timer} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {ActivatedRoute, Router} from '@angular/router';
import {PlanType} from '../../../models/information-page.model';
import {OperatorModel} from '../models/polyalg-registry';
import {AccordionItemComponent} from '@coreui/angular';

type editorState = 'SYNCHRONIZED' | 'CHANGED' | 'INVALID' | 'READONLY';

@Component({
    selector: 'app-alg-viewer',
    templateUrl: './alg-viewer.component.html',
    styleUrl: './alg-viewer.component.scss'
})
export class AlgViewerComponent implements AfterViewInit, OnChanges, OnDestroy {

    @Input() polyAlg?: string;
    @Input() initialPlan?: string;
    @Input() initialUserMode?: UserMode;
    @Input() planType: PlanType;
    @Input() isReadOnly: boolean;
    @Output() execute = new EventEmitter<[string, OperatorModel]>();
    @ViewChild('rete') container!: ElementRef;
    @ViewChild('textEditor') textEditor: EditorComponent;
    @ViewChild('itemText') textAccordionItem: AccordionItemComponent;

    private polyAlgPlan = signal<PlanNode>(undefined); // null: empty plan
    private planTypeSignal = signal<PlanType>(undefined); // we need an additional signal to automatically execute the effect
    userMode = signal(UserMode.SIMPLE);
    textEditorState = signal<editorState>('SYNCHRONIZED');
    textEditorError = signal<string>('');
    textEditorIsLocked = computed(() => this.userMode() === UserMode.SIMPLE && !this.isReadOnly); // only relevant when plan is editable
    nodeEditorState = signal<editorState>('SYNCHRONIZED');
    nodeEditorError = signal<string>('');
    readonly stateText = {
        'SYNCHRONIZED': '',
        'CHANGED': ' (edited)',
        'INVALID': ' (invalid)'
    };
    canSyncEditors = computed<boolean>(() =>
        (this.textEditorState() === 'SYNCHRONIZED' && this.nodeEditorState() === 'INVALID') ||
        (this.textEditorState() === 'INVALID' && this.nodeEditorState() === 'SYNCHRONIZED')
    );
    isSynchronized = computed(() => this.nodeEditorState() === 'SYNCHRONIZED' && this.textEditorState() === 'SYNCHRONIZED');
    showEditButton: boolean;
    showEditModal = signal(false);

    private modifySubscription: Subscription;
    nodeEditor: { getTransform: any; onModify: any; destroy: any; toPolyAlg: any; showMetadata: any; layout?: () => Promise<void>; hasUnregisteredNodes?: boolean; };
    showNodeEditor = computed(() => this._registry.registryLoaded());
    private isNodeFocused = false; // If a node is focused we must assume that a control has changed. Thus, the nodeEditor cannot be 'SYNCHRONIZED'.
    showMetadata = false;

    polyAlgSnapshot: string; // keep track whether the textEditor has changed
    initialPolyAlg: string; // only used for initially setting the text representation
    readonly textEditorOpts = {
        minLines: 12,
        maxLines: 12,
        showLineNumbers: false,
        highlightGutterLine: false,
        highlightActiveLine: true,
        fontSize: '1rem',
        tabSize: 2
    };
    protected readonly UserMode = UserMode;

    constructor(private injector: Injector,
                private _registry: PolyAlgService,
                private _toast: ToasterService,
                private _validator: AlgValidatorService,
                private _router: Router,
                private _route: ActivatedRoute) {

        effect(() => {
            const el = this.container.nativeElement;

            if (this.showNodeEditor() && this.polyAlgPlan() !== undefined && this.planTypeSignal() !== undefined && el) {
                untracked(() => {
                    this.modifySubscription?.unsubscribe();
                    const oldTransform = this.nodeEditor ? this.nodeEditor.getTransform() : null;
                    this.nodeEditor?.destroy();
                    createEditor(el, this.injector, _registry, this.polyAlgPlan(), this.planTypeSignal(), this.isReadOnly, this.userMode, oldTransform)
                    .then(editor => {
                        this.nodeEditor = editor;
                        this.generateTextFromNodeEditor();
                        this.modifySubscription = this.nodeEditor.onModify.pipe(
                            switchMap(() => {
                                this.nodeEditorState.set('CHANGED');
                                return timer(500);
                            })
                        ).subscribe(() => this.generateTextFromNodeEditor(true));
                    });
                });
            }
        });
    }

    ngAfterViewInit(): void {
        this.showEditButton = this.isReadOnly;
        this.showMetadata = this.isReadOnly;

        if (this.initialUserMode) {
            this.userMode.set(this.initialUserMode);
            this.textAccordionItem.visible = this.initialUserMode === UserMode.ADVANCED;
        }

        this.textEditor.setScrollMargin(5, 5);
        if (!this.isReadOnly) {
            this.textEditor.setReadOnly(this.userMode() === UserMode.SIMPLE);
            this.textEditor.onBlur(() => this.onTextEditorBlur());
            this.textEditor.onChange(() => this.onTextEditorChange());
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.polyAlg) {
            if (this.polyAlg == null) {
                return;
            }
            this._validator.buildPlan(this.polyAlg, this.planType).subscribe({
                next: (plan) => this.polyAlgPlan.set(plan),
                error: (err) => {
                    this.textEditor.setCode(this.polyAlg);
                    this.textEditorState.set('INVALID');
                    this.textEditorError.set(err.error.errorMsg);
                    this.nodeEditorState.set('INVALID');
                    this.nodeEditorError.set(err.error.errorMsg);
                    this._toast.error('Unable to build the initial plan. It most likely contains a (yet) unsupported feature.');
                }
            });
        }

        if (changes.planType) {
            if (this.planType === 'PHYSICAL' && this.planTypeSignal() != null) {
                this.setUserMode(UserMode.ADVANCED); // user mode for PHYSICAL is Advanced by default
            }
            this.planTypeSignal.set(this.planType);
        }

        if (changes.initialPlan && !this.polyAlg && !this.polyAlgPlan()) {
            this.polyAlgPlan.set(JSON.parse(this.initialPlan));
        }
    }

    ngOnDestroy() {
        this.modifySubscription?.unsubscribe();
        this.nodeEditor?.destroy();
    }

    generateTextFromNodeEditor(validatePlanWithBackend = false) {
        this.getPolyAlgFromTree().then(([str, model]) => {
            if (str != null) {
                if (!this.initialPolyAlg) {
                    this.initialPolyAlg = str;
                }
                if (validatePlanWithBackend && !this._validator.isConfirmedValid(str)) {
                    this._validator.buildPlan(str, this.planTypeSignal()).subscribe({
                        next: () => this.updateTextEditor(str),
                        error: (err) => {
                            this.nodeEditorState.set('INVALID');
                            this.nodeEditorError.set(err.error.errorMsg);
                        }
                    });
                } else {
                    this.updateTextEditor(str);
                }
            } else {
                this.nodeEditorState.set('INVALID');
                this.nodeEditorError.set('Invalid plan structure');
            }
        });
    }

    private updateTextEditor(str: string) {
        this.textEditor.setCode(str);
        this.polyAlgSnapshot = trimLines(str);
        this.textEditorState.set('SYNCHRONIZED');
        if (!this.isNodeFocused) {
            this.nodeEditorState.set('SYNCHRONIZED');
        }
    }

    generateNodesFromTextEditor(updatedPolyAlg = this.textEditor.getCode()) {
        this._validator.buildPlan(updatedPolyAlg, this.planTypeSignal()).subscribe({
            next: (plan) => {
                this.polyAlgPlan.set(plan); // this has the effect of calling generateTextFromNodeEditor() since the nodeEditor is the sync authority
            },
            error: (err) => {
                this.textEditorState.set('INVALID');
                this.textEditorError.set(err.error.errorMsg);
            }
        });

    }

    getPolyAlgFromTree(): Promise<[string, OperatorModel]> {
        return this.nodeEditor.toPolyAlg();
    }

    private onTextEditorBlur() {
        if (this.isReadOnly) {
            return;
        }
        const updatedPolyAlg = this.textEditor.getCode();
        const trimmed = trimLines(updatedPolyAlg);
        if (trimmed === this.polyAlgSnapshot) {
            return;
        }

        if (this._validator.isInvalid(updatedPolyAlg)) {
            this.textEditorState.set('INVALID');
            this._toast.warn('Parentheses are not balanced', 'Invalid Algebra');
            return;
        }

        this.textEditorState.set('CHANGED');
        this.generateNodesFromTextEditor(updatedPolyAlg);

        this.polyAlgSnapshot = trimmed;
    }

    private onTextEditorChange() {
        if (this.isReadOnly) {
            return;
        }
        const trimmed = trimLines(this.textEditor.getCode());
        if (trimmed !== this.polyAlgSnapshot) {
            this.textEditorState.set('CHANGED');
        } else {
            this.textEditorState.set('SYNCHRONIZED');
        }
    }


    onNodeEditorBlur() {
        if (this.isReadOnly) {
            return;
        }
        this.isNodeFocused = false;
        this.generateTextFromNodeEditor(true);
    }

    onNodeEditorFocus() {
        if (this.isReadOnly) {
            return;
        }
        this.isNodeFocused = true;
        this.nodeEditorState.set('CHANGED');
    }

    synchronizeEditors() {
        if (this.textEditorState() === 'INVALID') {
            this.generateTextFromNodeEditor();
        } else {
            this.generateNodesFromTextEditor();
        }
    }

    openInPlanEditor(forced = false, newTab = false) {
        if (!this.isReadOnly) {
            return;
        }
        if (this.nodeEditor.hasUnregisteredNodes) {
            this._toast.warn('Plan contains unregistered operators', 'Cannot edit plan');
            return;
        }
        const isSameRoute = this._route.snapshot.params.route === 'polyalg';
        if (isSameRoute && !forced) {
            this.showEditModal.set(true);
            return;
        }

        localStorage.setItem('polyalg.polyAlg', this.textEditor.getCode());
        localStorage.setItem('polyalg.planType', this.planTypeSignal());
        if (isSameRoute) {
            if (newTab) {
                const newRelativeUrl = this._router.createUrlTree(['/views/querying/polyalg']);
                const baseUrl = window.location.href.replace(this._router.url, '');

                window.open(baseUrl + newRelativeUrl, '_blank');
                //const url = this._router.serializeUrl(this._router.createUrlTree(['/#/views/querying/polyalg']));
                //window.open(url, '_blank');
            } else {
                // https://stackoverflow.com/questions/47813927/how-to-refresh-a-component-in-angular
                this._router.navigateByUrl('/', {skipLocationChange: true}).then(() => {
                    this._router.navigate(['/views/querying/polyalg']).then(null);
                });
            }
        } else {
            this._router.navigate(['/views/querying/polyalg']).then(null);
        }
        this.showEditModal.set(false);

    }

    toggleEditModal() {
        this.showEditModal.update(b => !b);
    }

    handleEditModalChange($event: boolean) {
        this.showEditModal.set($event);
    }

    executePlan() {
        this.getPolyAlgFromTree().then(([str, model]) => {
            if (str.length > 0 && model) {
                this.execute.emit([str, model]);
            }
        });
    }

    setUserMode(mode: UserMode) {
        this.userMode.set(mode);
        if (!this.isReadOnly) {
            const isSimple = mode === UserMode.SIMPLE;
            this.textEditor.setReadOnly(isSimple);
            this.textAccordionItem.visible = !isSimple;
            this.refreshTextEditor();
        }
    }

    toggleTextEditor() {
        this.textAccordionItem.visible = !this.textAccordionItem.visible;
        this.refreshTextEditor();
    }

    refreshTextEditor() {
        // If the editor is hidden when setCode is used, the visible text is not correctly updated.
        // We fix this by forcing it to render again.
        this.textEditor.setCode(this.textEditor.getCode());
    }

    toggleMetadata() {
        // if all nodes are already in the state !this.showMetadata, then the returned boolean is inverted
        this.showMetadata = this.nodeEditor.showMetadata(!this.showMetadata);
    }
}

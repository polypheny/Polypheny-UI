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
import {DataModel} from '../../../models/ui-request.model';
import {Transform} from 'rete-area-plugin/_types/area';

type editorState = 'SYNCHRONIZED' | 'CHANGED' | 'INVALID';

@Component({
    selector: 'app-alg-viewer',
    templateUrl: './alg-viewer.component.html',
    styleUrl: './alg-viewer.component.scss'
})
export class AlgViewerComponent implements AfterViewInit, OnChanges, OnDestroy {

    constructor(private injector: Injector,
                private _registry: PolyAlgService,
                private _toast: ToasterService,
                private _validator: AlgValidatorService,
                private _router: Router,
                private _route: ActivatedRoute) {

        effect(() => {
            const el = this.container.nativeElement;

            if (this.showNodeEditor() && this.polyAlgPlan() !== undefined && el) {
                untracked(() => {
                    this.modifySubscription?.unsubscribe();
                    const oldTransform = this.nodeEditor ? this.nodeEditor.getTransform() : null;
                    createEditor(el, this.injector, _registry, this.polyAlgPlan(), this.isReadOnly, this.userMode, oldTransform)
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

    @Input() polyAlg?: string;
    @Input() initialPlan?: string;
    @Input() planType: 'LOGICAL' | 'ROUTED' | 'PHYSICAL';
    @Input() isReadOnly: boolean;
    @Output() execute = new EventEmitter<[string, DataModel]>();
    @ViewChild('rete') container!: ElementRef;
    @ViewChild('textEditor') textEditor: EditorComponent;

    private polyAlgPlan = signal<PlanNode>(undefined); // null: empty plan
    textEditorState = signal<editorState>('SYNCHRONIZED');
    textEditorError = signal<string>('');
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
    //isSimpleMode = signal(false);
    userMode = signal(UserMode.ADVANCED);

    private modifySubscription: Subscription;
    nodeEditor: { onModify: any; destroy: any; toPolyAlg: any; layout?: () => Promise<void>; showMetadata: (b: boolean) => boolean; getTransform: () => Transform };
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

    ngAfterViewInit(): void {
        this.showEditButton = this.isReadOnly && !(this.planType === 'LOGICAL' && this._route.snapshot.params.route === 'polyalg');
        this.showMetadata = this.isReadOnly;

        this.textEditor.setScrollMargin(5, 5);
        if (!this.isReadOnly) {
            this.textEditor.onBlur(() => this.onTextEditorBlur());
            this.textEditor.onChange(() => this.onTextEditorChange());
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.polyAlg) {
            if (!this.polyAlg) {
                return;
            }
            this._validator.buildPlan(this.polyAlg).subscribe({
                next: (plan) => this.polyAlgPlan.set(plan),
                error: () => {
                    this.nodeEditorState.set('INVALID');
                    this.textEditorState.set('INVALID');
                    this.textEditor.setCode(this.polyAlg);
                }
            });
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
                    this._validator.buildPlan(str).subscribe({
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
        this._validator.buildPlan(updatedPolyAlg).subscribe({
            next: (plan) => {
                this.polyAlgPlan.set(plan); // this has the effect of calling generateTextFromNodeEditor() since the nodeEditor is the sync authority
            },
            error: (err) => {
                this.textEditorState.set('INVALID');
                this.textEditorError.set(err.error.errorMsg);
            }
        });

    }

    getPolyAlgFromTree(): Promise<[string, DataModel]> {
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
            this._toast.warn('Parentheses are not balanced', 'Invalid PolyAlgebra');
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

    openInPlanEditor() {
        if (!this.isReadOnly) {
            return;
        }
        localStorage.setItem('polyalg.polyAlg', this.textEditor.getCode());
        this._router.navigate(['/views/querying/polyalg']).then(null);

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
    }

    toggleMetadata() {
        // if all nodes are already in the state !this.showMetadata, then the returned boolean is inverted
        this.showMetadata = this.nodeEditor.showMetadata(!this.showMetadata);
    }
}

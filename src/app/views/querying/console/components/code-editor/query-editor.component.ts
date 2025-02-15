import {
    Component,
    effect,
    EventEmitter,
    inject,
    Input,
    OnInit,
    Output,
    signal, untracked,
    ViewChild,
    WritableSignal
} from '@angular/core';
import {ToasterService} from "../../../../../components/toast-exposer/toaster.service";
import {NamespaceModel} from "../../../../../models/catalog.model";
import {QueryHistory} from "../../query-history.model";
import {CatalogService} from "../../../../../services/catalog.service";
import {usesAdvancedConsole} from "../console-helper";
import {EditorComponent} from "../../../../../components/editor/editor.component";


@Component({
    selector: 'app-query-editor',
    templateUrl: './query-editor.component.html',
    styleUrls: ['query-editor.component.scss']
})
export class QueryEditor implements OnInit {
    public readonly _toast = inject(ToasterService);
    public readonly _catalog = inject(CatalogService);

    readonly namespaces: WritableSignal<NamespaceModel[]> = signal([]);
    private readonly LOCAL_STORAGE_NAMESPACE_KEY = 'polypheny-namespace';
    showNamespaceConfig: boolean;

    @Input() language: WritableSignal<string> = signal('sql');
    @Input() activeNamespace: WritableSignal<string> = signal("");
    @ViewChild('editor', {static: false}) codeEditor: EditorComponent;

    constructor() {
        effect(() => {
            const namespace = this._catalog.namespaces();
            untracked(() => {
                this.namespaces.set(Array.from(namespace.values()));
            });
        });
    }

    ngOnInit() {
        this.loadAndSetNamespaceDB();
    }

    setCode(code: string): void {
        this.codeEditor.setCode(code);
    }

    getCode(): string {
        return this.codeEditor.getCode();
    }

    private loadAndSetNamespaceDB() {
        let namespaceName = localStorage.getItem(this.LOCAL_STORAGE_NAMESPACE_KEY);

        if (namespaceName === null || (this.namespaces && this.namespaces.length > 0 && (this.namespaces().filter(n => n.name === namespaceName).length === 0))) {
            if (this.namespaces() && this.namespaces().length > 0) {
                namespaceName = this.namespaces()[0].name;
            } else {
                namespaceName = 'public';
            }
        }
        if (!namespaceName) {
            return;
        }

        this.activeNamespace.set(namespaceName);
        this.storeNamespace(namespaceName);
    }

    storeNamespace(name: string) {
        localStorage.setItem(this.LOCAL_STORAGE_NAMESPACE_KEY, name);
    }

    clearConsole() {
        this.codeEditor.setCode('');
    }

    parse(code: string) {
        const formatted = JSON.stringify(JSON.parse('[' + code + ']'), null, 4);
        return formatted.substring(1, formatted.length - 1);
    }

    formatQuery() {
        let code = this.codeEditor.getCode();
        if (!code) {
            return;
        }
        let before = '';
        const after = ')';

        // here we replace the Json incompatible types with placeholders
        const temp = code.match(/NumberDecimal\([^)]*\)/g);

        if (temp !== null) {
            for (let i = 0; i < temp.length; i++) {
                code = code.replace(temp[i], '"___' + i + '"');
            }
        }

        const splits = code.split('(');
        before = splits.shift() + '(';

        try {
            let json = this.parse(splits.join('(').slice(0, -1));
            // we have to translate them back
            if (temp !== null) {
                for (let i = 0; i < temp.length; i++) {
                    json = json.replace('"___' + i + '"', temp[i]);
                }
            }

            this.codeEditor.setCode(before + json + after);
        } catch (e) {
            this._toast.warn(e);
        }
    }

    toggleNamespaceField() {
        this.showNamespaceConfig = !this.showNamespaceConfig;
    }

    changedDefaultDB(n) {
        this.activeNamespace.set(n);
    }

    protected readonly usesAdvancedConsole = usesAdvancedConsole;
}

import {ActivityConfigModel, ActivityModel, ActivityState, CommonType, EdgeModel, EdgeState, errorKey, ErrorVariable, ExecutionInfoModel, RenderModel, SettingsModel, TypePreviewModel, Variables, WorkflowConfigModel, WorkflowModel, WorkflowState} from '../../models/workflows.model';
import {computed, Injector, Signal, signal, WritableSignal} from '@angular/core';
import * as _ from 'lodash';
import {Subject} from 'rxjs';
import {ActivityDef, ActivityRegistry} from '../../models/activity-registry.model';
import JsonPointer from 'json-pointer';
import {toSignal} from '@angular/core/rxjs-interop';

export function edgeToString(edge: EdgeModel) {
    return JSON.stringify({
        fromId: edge.fromId,
        toId: edge.toId,
        fromPort: edge.fromPort,
        toPort: edge.toPort,
        isControl: edge.isControl
    });
}

export function stringToEdge(edgeString: string, state?: EdgeState) {
    const edge: EdgeModel = JSON.parse(edgeString);
    edge.state = state;
    return edge;
}

export class Workflow {
    readonly state: WritableSignal<WorkflowState>;
    private readonly activities: Map<string, Activity> = new Map();
    private readonly edgeStates: Map<string, WritableSignal<EdgeState>> = new Map();
    readonly config: WritableSignal<WorkflowConfigModel>;
    readonly variables: WritableSignal<Variables>;
    readonly hasUnfinishedActivities: Signal<boolean>;
    private readonly openedActivity = signal<Activity>(undefined); // which activity settings are open

    private readonly activityChangeSubject = new Subject<string>();
    private readonly activityRemoveSubject = new Subject<string>();
    private readonly activityAddSubject = new Subject<Activity>();
    private readonly activityDirtySubject = new Subject<string>(); // if the activity state changed without updating the activity itself
    private readonly edgeChangeSubject = new Subject<string>(); // edgeString
    private readonly edgeAddSubject = new Subject<[EdgeModel, WritableSignal<EdgeState>]>();
    private readonly edgeRemoveSubject = new Subject<string>(); // edgeString

    constructor(workflowModel: WorkflowModel, private readonly registry: ActivityRegistry, injector: Injector) {
        this.state = signal(workflowModel.state);
        workflowModel.activities.forEach(model =>
            this.activities.set(model.id, new Activity(
                model,
                registry.getDef(model.type),
                computed(() => this.openedActivity()?.id === model.id)
            )));
        workflowModel.edges.forEach(edge => this.edgeStates.set(edgeToString(edge), signal(edge.state)));
        this.config = signal(workflowModel.config, {equal: _.isEqual});
        this.variables = signal(workflowModel.variables, {equal: _.isEqual});

        const addActivitySignal = toSignal(this.activityAddSubject, {injector: injector});
        const removeActivitySignal = toSignal(this.activityRemoveSubject, {injector: injector});

        this.hasUnfinishedActivities = computed(() => {
            addActivitySignal(); // force recompute when activity is added or removed
            removeActivitySignal();
            return [...this.activities.values()].some(
                a => a.state() !== ActivityState.FINISHED && a.state() !== ActivityState.SAVED
            );
        });
    }

    getActivities() {
        return [...this.activities.values()];
    }

    getEdges(): [EdgeModel, WritableSignal<EdgeState>][] {
        const edges = [];
        for (const [edgeString, state] of this.edgeStates.entries()) {
            const edgeModel = stringToEdge(edgeString, state());
            edges.push([edgeModel, state]);
        }
        return edges;
    }

    getInEdges(activityId: string, type: 'data' | 'control' | 'both') {
        const edges = this.getEdges();
        switch (type) {
            case 'data':
                return edges.filter(([model,]) => !model.isControl && model.toId === activityId);
            case 'control':
                return edges.filter(([model,]) => model.isControl && model.toId === activityId);
            case 'both':
                return edges.filter(([model,]) => model.toId === activityId);
        }
    }

    getEdgeState(edge: EdgeModel | string): WritableSignal<EdgeState> | undefined {
        if (typeof edge === 'string') {
            return this.edgeStates.get(edge);
        } else {
            return this.edgeStates.get(edgeToString(edge));
        }
    }

    getActivity(activityId: string): Activity | undefined {
        return this.activities.get(activityId);
    }

    removeActivity(activityId: string) {
        this.activities.delete(activityId);
        this.activityRemoveSubject.next(activityId);
        if (this.openedActivity()?.id === activityId) {
            this.openedActivity.set(null);
        }
    }

    updateOrCreateActivity(activityModel: ActivityModel) {
        if (this.applyIfExists(activityModel.id, a => a.update(activityModel))) {
            this.activityChangeSubject.next(activityModel.id);
        } else {
            const activity = new Activity(activityModel, this.registry.getDef(activityModel.type),
                computed(() => this.openedActivity()?.id === activityModel.id));
            this.activities.set(activityModel.id, activity);
            this.activityAddSubject.next(activity);
        }
    }

    removeEdge(edge: EdgeModel | string) {
        const edgeString = typeof edge === 'string' ? edge : edgeToString(edge);
        if (this.edgeStates.delete(edgeString)) {
            this.edgeRemoveSubject.next(edgeString);
        }
    }

    /**
     * Attempts to create the specified edge or update its state if it already exists.
     * @param edgeModel the ege to create or update
     * @return a boolean indicating the success of the operation. False is returned if either the source or target
     * activity does not exist yet.
     */
    updateOrCreateEdge(edgeModel: EdgeModel): boolean {
        if (this.updateEdgeState(edgeModel)) {
            // edge changed
            this.edgeChangeSubject.next(edgeToString(edgeModel));
        } else {
            if (this.getActivity(edgeModel.fromId) === undefined || this.getActivity(edgeModel.toId) === undefined) {
                return false;
            }
            const stateSignal = signal(edgeModel.state);
            this.edgeStates.set(edgeToString(edgeModel), stateSignal);
            this.edgeAddSubject.next([edgeModel, stateSignal]);
        }
        return true;
    }

    updateActivityStates(activityStates: Record<string, ActivityState>,
                         invalidReasons: Record<string, string>,
                         invalidSettings: Record<string, Record<string, string>>,
                         inTypePreviews: Record<string, TypePreviewModel[]>,
                         outTypePreviews: Record<string, TypePreviewModel[]>): boolean {
        const missing = new Set<string>();
        const remaining = new Set<string>(this.activities.keys());

        for (const [id, state] of Object.entries(activityStates)) {
            const oldState = this.activities.get(id)?.state();
            if (this.updateActivityState(id, state, invalidReasons[id], invalidSettings[id], inTypePreviews[id], outTypePreviews[id])) {
                this.activityChangeSubject.next(id);
                if (state !== oldState) {
                    this.activityDirtySubject.next(id);
                }
                remaining.delete(id);
            } else {
                missing.add(id);
            }
        }
        remaining.forEach(a => this.removeActivity(a));
        return missing.size === 0;
    }

    updateProgress(progressMap: Record<string, number>): boolean {
        const missing = new Set<string>();

        for (const [id, progress] of Object.entries(progressMap)) {
            if (this.updateActivityProgress(id, progress)) {
                this.activityChangeSubject.next(id);
                // no tracking of remaining activities, as only subsets of activities might get updated
            } else {
                missing.add(id);
            }
        }
        return missing.size === 0;
    }

    updateActivityRendering(activityId: string, rendering: RenderModel): boolean {
        return this.applyIfExists(activityId, a => {
            a.rendering.set(rendering);
            this.activityChangeSubject.next(activityId);
        });
    }

    updateEdgeStates(edgeStates: EdgeModel[]): boolean {
        const missing = new Set<string>();
        const remaining = new Set<string>(this.edgeStates.keys());

        for (const edgeModel of edgeStates) {
            const edgeString = edgeToString(edgeModel);
            if (this.updateOrCreateEdge(edgeModel)) {
                remaining.delete(edgeString);
            } else {
                missing.add(edgeString); // missing because activity does not exist
            }
        }
        remaining.forEach(e => this.removeEdge(e));

        return missing.size === 0;
    }

    update(workflowModel: WorkflowModel) {
        this.state.set(workflowModel.state);
        this.config.set(workflowModel.config);
        this.variables.set(workflowModel.variables);

        const remainingActivities = new Set<string>(this.activities.keys());
        const remainingEdges = new Set<string>(this.edgeStates.keys());
        workflowModel.activities.forEach(activity => {
            this.updateOrCreateActivity(activity);
            remainingActivities.delete(activity.id);
        });
        workflowModel.edges.forEach(edge => {
            this.updateOrCreateEdge(edge);
            remainingEdges.delete(edgeToString(edge));
        });
        remainingEdges.forEach(edge => this.removeEdge(edge));
        remainingActivities.forEach(activityId => this.removeActivity(activityId));
    }

    setOpenedActivity(activityId: string) {
        const activity = this.getActivity(activityId);
        const old = this.openedActivity();
        this.openedActivity.set(activity);
        if (old) {
            this.activityChangeSubject.next(old.id);
        }
        if (activityId) {
            this.activityChangeSubject.next(activity.id);
        }
    }

    getOpenedActivity() {
        return this.openedActivity.asReadonly();
    }

    onActivityChange() {
        return this.activityChangeSubject.asObservable();
    }

    onActivityAdd() {
        return this.activityAddSubject.asObservable();
    }

    onActivityRemove() {
        return this.activityRemoveSubject.asObservable();
    }

    onActivityDirty() {
        return this.activityDirtySubject.asObservable();
    }

    onEdgeChange() {
        return this.edgeChangeSubject.asObservable();
    }

    onEdgeAdd() {
        return this.edgeAddSubject.asObservable();
    }

    onEdgeRemove() {
        return this.edgeRemoveSubject.asObservable();
    }

    private updateActivityState(activityId: string, state: ActivityState, invalidReason: string, invalidSettings: Record<string, string> | undefined,
                                inTypePreview: TypePreviewModel[], outTypePreview: TypePreviewModel[]): boolean {
        if (state === 'IDLE') {
            this.updateActivityProgress(activityId, 0); // reset progress
        }
        return this.applyIfExists(activityId, a => {
            a.state.set(state);
            a.invalidReason.set(invalidReason);
            a.invalidSettings.set(invalidSettings || {});
            a.inTypePreview.set(inTypePreview);
            a.outTypePreview.set(outTypePreview);
        });
    }

    private updateActivityProgress(activityId: string, progress: number): boolean {
        return this.applyIfExists(activityId, a => a.progress.set(progress));

    }

    private updateEdgeState(edge: EdgeModel): boolean {
        const edgeState = this.getEdgeState(edge);
        if (edgeState === undefined) {
            return false;
        }
        edgeState.set(edge.state);
        return true;
    }

    private applyIfExists(activityId: string, fct: (activity: Activity) => void): boolean {
        const activity = this.getActivity(activityId);
        if (activity === undefined) {
            return false;
        }
        fct(activity);
        return true;
    }
}

export class Activity {
    readonly type: string;
    readonly id: string;
    readonly def: ActivityDef;

    readonly state: WritableSignal<ActivityState>;
    readonly progress = signal(0);
    readonly settings: WritableSignal<Settings>;
    readonly config: WritableSignal<ActivityConfigModel>;
    readonly commonType: Signal<CommonType>;
    readonly rendering: WritableSignal<RenderModel>;
    readonly inTypePreview: WritableSignal<TypePreviewModel[]>;
    readonly outTypePreview: WritableSignal<TypePreviewModel[]>;
    readonly invalidReason: WritableSignal<string>;
    readonly invalidSettings: WritableSignal<Record<string, string>>;
    readonly hasInvalidSettings: Signal<boolean>;
    readonly variables: WritableSignal<Variables>;
    readonly hasVariables: Signal<boolean>;
    readonly displayName: Signal<string>;
    readonly executionInfo: WritableSignal<ExecutionInfoModel>;
    readonly logMessages: Signal<LogMessage[]>;
    readonly error: Signal<ErrorVariable>;

    constructor(activityModel: ActivityModel, def: ActivityDef, readonly isOpened: Signal<boolean>) {
        this.type = activityModel.type;
        this.id = activityModel.id;
        this.def = def;
        this.state = signal(activityModel.state);
        this.settings = signal(new Settings(activityModel.settings)); // deep equivalence check
        this.config = signal(this.prepareConfig(activityModel.config), {equal: _.isEqual});
        this.commonType = computed(() => this.config().commonType);
        this.rendering = signal(activityModel.rendering, {equal: _.isEqual});
        this.inTypePreview = signal(activityModel.inTypePreview, {equal: _.isEqual});
        this.outTypePreview = signal(activityModel.outTypePreview, {equal: _.isEqual});
        this.invalidReason = signal(activityModel.invalidReason);
        this.invalidSettings = signal(activityModel.invalidSettings);
        this.hasInvalidSettings = computed(() => Object.keys(this.invalidSettings()).length > 0);
        this.variables = signal(activityModel.variables, {equal: _.isEqual});
        this.hasVariables = computed(() => Object.keys(this.variables()).length > 0);
        this.displayName = computed(() => {
            return this.rendering().name || this.def.displayName;
        });
        this.executionInfo = signal(activityModel.executionInfo);
        this.logMessages = computed(() =>
            this.executionInfo().log?.map(m => new LogMessage(m))
            .filter(m => m.activityId === this.id) || []
        );
        this.error = computed(() => this.state() === ActivityState.FAILED && this.variables()[errorKey]);
    }

    update(activityModel: ActivityModel) {
        this.state.set(activityModel.state);
        this.settings.set(new Settings(activityModel.settings));
        this.config.set(this.prepareConfig(activityModel.config));
        this.rendering.set(activityModel.rendering);
        this.inTypePreview.set(activityModel.inTypePreview);
        this.outTypePreview.set(activityModel.outTypePreview);
        this.invalidReason.set(activityModel.invalidReason);
        this.invalidSettings.set(activityModel.invalidSettings);
        this.variables.set(activityModel.variables);
        this.executionInfo.set(activityModel.executionInfo);
    }

    prepareConfig(config: ActivityConfigModel) {
        // the received config might not be of correct length
        let prefs: string[] = config.preferredStores;
        if (prefs === null) {
            prefs = [];
        } else {
            prefs = prefs.map(store => store === null ? '' : store);
        }

        while (prefs.length < this.def.outPorts.length) {
            prefs.push('');
        }
        config.preferredStores = prefs;
        return config;
    }

}

export class Settings {
    readonly settings = new Map<string, Setting>();

    constructor(model: SettingsModel | string) {
        if (typeof model === 'string') {
            model = JSON.parse(model);
        }
        Object.entries(model).forEach(([key, value]) =>
            this.settings.set(key, new Setting(key, value)));
    }

    get(key: string): Setting | undefined {
        //console.log('getting Setting', key, this.settings); // TODO: reduce calls
        return this.settings.get(key);
    }

    toModel(insertRefs: boolean) {
        const model = {};
        for (const [key, value] of this.settings) {
            model[key] = value.toModel(insertRefs);
        }
        return model;
    }

    serialize() {
        return JSON.stringify(this.toModel(true));
    }

    keys() {
        return [...this.settings.keys()];
    }
}

export class Setting {
    readonly references: VariableReference[];
    value: any; // static value of this setting, possibly containing values that will get overwritten


    constructor(public readonly key: string, model: any) {
        const tokens = [];
        const copy = JSON.parse(JSON.stringify(model));
        [this.references, this.value] = Setting.splitRecursive(tokens, copy);
    }

    private static splitRecursive(tokens: string[], obj: any): [VariableReference[], any] {
        const references: VariableReference[] = [];
        if (obj === null) {
            return [references, null];
        } else if (Array.isArray(obj)) {
            for (const [i, value] of obj.entries()) {
                const [r, o] = Setting.splitRecursive([...tokens, i.toString()], value);
                references.push(...r);
                obj[i] = o;
            }
            // undefined in lists means there is a variable reference that does not overwrite an existing value
            obj = obj.filter(o => o !== undefined);
        } else if (typeof obj === 'object') {
            if (VARIABLE_REF_FIELD in obj) {
                const ref = new VariableReference(JsonPointer.compile(tokens), obj);
                references.push(ref);
                return [references, ref.defaultValue || undefined];
            } else {
                Object.entries(obj).forEach(([key, value]) => {
                    const [r, o] = Setting.splitRecursive([...tokens, key], value);
                    references.push(...r);
                    obj[key] = o;
                });
            }
        }

        return [references, obj];
    }

    static toModel(references: VariableReference[], value: any): any {
        let copy = JSON.parse(JSON.stringify(value));
        for (const ref of references) {
            let defaultValue = ref.defaultValue; // fallback
            if (ref.target === '/') {
                defaultValue = copy;
            } else {
                try {
                    defaultValue = JsonPointer.get(copy, ref.target); // overwrite with value set in settings component
                } catch (ignored) {
                }
            }

            const refObject = {[VARIABLE_REF_FIELD]: ref.varRef, [VARIABLE_DEFAULT_FIELD]: defaultValue};
            if (ref.target.length <= 1) {
                copy = refObject; // setting the root
            } else {
                JsonPointer.set(copy, ref.target, refObject); // TODO: try catch?
            }
        }
        return copy;
    }

    toModel(insertRefs: boolean): any {
        if (insertRefs) {
            return Setting.toModel(this.references, this.value);
        }
        return JSON.parse(JSON.stringify(this.value));
    }

    addReference(variablePointer: string, target: string): boolean {
        target = target.startsWith('/') ? target : '/' + target;
        if (this.isValidTargetPointer(target)) {
            this.references.push(VariableReference.of(target, variablePointer));
            return true;
        }
        return false;
    }

    deleteReference(ref: VariableReference) {
        this.references.splice(this.references.indexOf(ref), 1);

    }

    isValidTargetPointer(target: string) {

        if (this.references.find(ref => target.startsWith(ref.target) || ref.target.startsWith(target))) {
            return false; // cannot set two variables to same target
        }
        if (target === '/') {
            return true;
        }

        const slashCount = (target.match(/\//g) || []).length;

        // TODO: test if this works
        return JsonPointer.has(this.value, target) || (
            slashCount > 1 &&
            JsonPointer.has(this.value, target.substring(0, target.lastIndexOf('/')))
        );
    }
}

const VARIABLE_REF_FIELD = '$ref';
const VARIABLE_DEFAULT_FIELD = '$default';

export class VariableReference {
    readonly target: string; // Json-Pointer to target location in setting
    readonly varRef: string; // Json-Pointer to a variable
    readonly defaultValue: any | null;

    constructor(target: string, ref: { [VARIABLE_REF_FIELD]: string, [VARIABLE_DEFAULT_FIELD]?: any }) {
        this.target = target.startsWith('/') ? target : '/' + target;
        this.varRef = ref[VARIABLE_REF_FIELD];
        this.defaultValue = ref[VARIABLE_DEFAULT_FIELD] || null;
    }

    static of(target: string, varRef: string): VariableReference {
        return new VariableReference(target, {[VARIABLE_REF_FIELD]: varRef});
    }

}

export class LogMessage {
    activityId: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    timeMs: number;
    msg: string;

    constructor(rawMessage: string) {
        const [activityId, level, timeMs, ...rest] = rawMessage.split('|');
        const msg = rest.join('|');
        this.activityId = activityId;
        //@ts-ignore
        this.level = level;
        this.timeMs = parseInt(timeMs, 10);
        this.msg = msg;
    }
}

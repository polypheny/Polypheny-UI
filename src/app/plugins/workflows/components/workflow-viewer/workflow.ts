import {ActivityConfigModel, ActivityModel, ActivityState, CommonType, EdgeModel, EdgeState, RenderModel, Settings, TypePreviewModel, WorkflowConfigModel, WorkflowModel, WorkflowState} from '../../models/workflows.model';
import {computed, Signal, signal, WritableSignal} from '@angular/core';
import * as _ from 'lodash';
import {Subject} from 'rxjs';
import {ActivityDef, ActivityRegistry} from '../../models/activity-registry.model';

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
    readonly variables: WritableSignal<Settings>;
    readonly hasUnfinishedActivities: Signal<boolean>;

    private readonly activityChangeSubject = new Subject<string>();
    private readonly activityRemoveSubject = new Subject<string>();
    private readonly activityAddSubject = new Subject<Activity>();
    private readonly edgeChangeSubject = new Subject<string>(); // edgeString
    private readonly edgeAddSubject = new Subject<[EdgeModel, WritableSignal<EdgeState>]>();
    private readonly edgeRemoveSubject = new Subject<string>(); // edgeString

    constructor(workflowModel: WorkflowModel, private readonly registry: ActivityRegistry) {
        this.state = signal(workflowModel.state);
        workflowModel.activities.forEach(model =>
            this.activities.set(model.id, new Activity(model, registry.getDef(model.type))));
        workflowModel.edges.forEach(edge => this.edgeStates.set(edgeToString(edge), signal(edge.state)));
        this.config = signal(workflowModel.config, {equal: _.isEqual});
        this.variables = signal(workflowModel.variables, {equal: _.isEqual});

        this.hasUnfinishedActivities = computed(() => [...this.activities.values()].some(
            a => a.state() !== ActivityState.FINISHED && a.state() !== ActivityState.SAVED
        ));
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
    }

    updateOrCreateActivity(activityModel: ActivityModel) {
        if (this.applyIfExists(activityModel.id, a => a.update(activityModel))) {
            this.activityChangeSubject.next(activityModel.id);
        } else {
            const activity = new Activity(activityModel, this.registry.getDef(activityModel.type));
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

    updateActivityStates(activityStates: Record<string, ActivityState>): boolean {
        const missing = new Set<string>();
        const remaining = new Set<string>(this.activities.keys());

        for (const [id, state] of Object.entries(activityStates)) {
            if (this.updateActivityState(id, state)) {
                this.activityChangeSubject.next(id);
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

    onActivityChange() {
        return this.activityChangeSubject.asObservable();
    }

    onActivityAdd() {
        return this.activityAddSubject.asObservable();
    }

    onActivityRemove() {
        return this.activityRemoveSubject.asObservable();
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

    private updateActivityState(activityId: string, state: ActivityState): boolean {
        if (state === 'IDLE') {
            this.updateActivityProgress(activityId, 0); // reset progress
        }
        return this.applyIfExists(activityId, a => a.state.set(state));
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
    readonly invalidReason: WritableSignal<string>;
    readonly displayName: Signal<string>;

    constructor(activityModel: ActivityModel, def: ActivityDef) {
        this.type = activityModel.type;
        this.id = activityModel.id;
        this.def = def;
        this.state = signal(activityModel.state);
        this.settings = signal(activityModel.settings, {equal: _.isEqual}); // deep equivalence check
        this.config = signal(this.prepareConfig(activityModel.config), {equal: _.isEqual});
        this.commonType = computed(() => this.config().commonType);
        this.rendering = signal(activityModel.rendering, {equal: _.isEqual});
        this.inTypePreview = signal(activityModel.inTypePreview, {equal: _.isEqual});
        this.invalidReason = signal(activityModel.invalidReason);
        this.displayName = computed(() => this.rendering().name || this.def.displayName);
    }

    update(activityModel: ActivityModel) {
        this.state.set(activityModel.state);
        this.settings.set(activityModel.settings);
        this.config.set(this.prepareConfig(activityModel.config));
        this.rendering.set(activityModel.rendering);
        this.inTypePreview.set(activityModel.inTypePreview);
        this.invalidReason.set(activityModel.invalidReason);
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

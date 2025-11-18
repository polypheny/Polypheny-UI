import {computed, effect, Injectable, Signal, signal, WritableSignal} from '@angular/core';
import {WorkflowsWebSocketService} from './workflows-websocket.service';
import {CheckpointDataResponse, ResponseType, WsResponse} from '../models/ws-response.model';
import {FieldDefinition, Result} from '../../../components/data-view/models/result-set.model';
import {Activity} from '../components/workflow-viewer/workflow';
import {ActivityState} from '../models/workflows.model';
import {DataModel} from '../../../models/ui-request.model';
import {PortType} from '../models/activity-registry.model';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {EntityConfig} from '../../../components/data-view/data-table/entity-config';

@Injectable()
export class CheckpointViewerService {
    readonly showModal = signal(false);

    readonly selectedActivity = signal<Activity>(undefined);
    readonly selectedOutput = signal<number>(0);
    readonly outPreview = computed(() => this.selectedActivity().outTypePreview()[this.selectedOutput()]);
    readonly outPreviewAsResult: Signal<Result<any, FieldDefinition>> = computed(() => {
        if (this.outPreview().portType !== PortType.REL) {
            return null;
        }
        return {
            dataModel: DataModel.RELATIONAL,
            header: this.outPreview().columns,
            data: []
        } as Result<any, FieldDefinition>;
    });
    readonly isLoading = signal(false);
    readonly isWaitingForExecution = signal(false);
    result: WritableSignal<Result<any, any>> = signal(null);
    readonly limit = signal(0);
    readonly totalCount = signal(0);
    readonly isLimited = computed(() => this.totalCount() > this.limit());
    readonly config: EntityConfig = {
        create: false, update: false, delete: false, sort: false, search: false,
        exploring: true, hideCreateView: true, cardRelWidth: true
    };
    readonly canExecute = signal(false);

    constructor(private _websocket: WorkflowsWebSocketService, private _toast: ToasterService) {
        this._websocket.onMessage().subscribe(msg => this.handleWsMsg(msg));

        effect(() => {
            if (this.showModal() && this.isWaitingForExecution() && this.selectedActivity().state() === ActivityState.SAVED) {
                this.isWaitingForExecution.set(false);
                this._websocket.getCheckpoint(this.selectedActivity().id, this.selectedOutput());
            }
        });
    }

    toggleModal() {
        this.setModal(!this.showModal());
    }

    setModal(visible: boolean) {
        this.showModal.set(visible);
        if (!visible) {
            this.selectedActivity.set(null);
            this.selectedOutput.set(null);
            this.result.set(null);
            this.isLoading.set(false);
            this.isWaitingForExecution.set(false);
        }
    }

    private getCheckpoint(activity: Activity, outputIndex: number) {
        this.selectedActivity.set(activity);
        this.selectedOutput.set(outputIndex);
        this.isLoading.set(true);
        this._websocket.getCheckpoint(activity.id, outputIndex);
    }

    openCheckpoint(activity: Activity, outputIndex: number, canExecute: boolean) {
        this.canExecute.set(canExecute);
        if (activity.state() === ActivityState.FINISHED) {
            this.selectedActivity.set(activity);
            this.selectedOutput.set(outputIndex);

        } else if (activity.state() === ActivityState.SAVED) {
            this.getCheckpoint(activity, outputIndex);
        } else {
            return;
        }
        this.setModal(true);
    }

    private handleWsMsg(msg: { response: WsResponse; isDirect: boolean }) {
        const {response} = msg;
        if (response.type === ResponseType.CHECKPOINT_DATA) {
            const r = (response as CheckpointDataResponse);
            this.result.set(r.result);
            this.limit.set(r.limit);
            this.totalCount.set(r.totalCount);
            this.isLoading.set(false);
        }
    }

    materialize() {
        if (this.selectedActivity()) {
            this.isWaitingForExecution.set(true);
            this.isLoading.set(true);
            this._websocket.execute(this.selectedActivity().id);
        }
    }
}

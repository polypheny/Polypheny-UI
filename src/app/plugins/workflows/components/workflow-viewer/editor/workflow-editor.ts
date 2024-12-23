import {Injector} from '@angular/core';
import {ClassicPreset, GetSchemes, NodeEditor} from 'rete';
import {AreaExtensions, AreaPlugin} from 'rete-area-plugin';
import {ConnectionPlugin, Presets as ConnectionPresets} from 'rete-connection-plugin';
import {AngularArea2D, AngularPlugin, Presets} from 'rete-angular-plugin/15';
import {WorkflowModel} from '../../../models/workflows.model';
import {ActivityComponent, ActivityNode} from './activity/activity.component';
import {Edge, EdgeComponent} from './edge/edge.component';
import {ActivityPort, ActivityPortComponent} from './activity-port/activity-port.component';
import {addCustomBackground} from '../../../../../components/polyalg/polyalg-viewer/background';
import {ReadonlyPlugin} from 'rete-readonly-plugin';
import {useMagneticConnection} from '../../../../../components/polyalg/polyalg-viewer/magnetic-connection';
import {setupPanningBoundary} from '../../../../../components/polyalg/polyalg-viewer/panning-boundary';
import {MagneticConnectionComponent} from '../../../../../components/polyalg/polyalg-viewer/magnetic-connection/magnetic-connection.component';
import {getMagneticConnectionProps} from './workflow-editor-utils';

export type Schemes = GetSchemes<ActivityNode, Edge<ActivityNode>>;
type AreaExtra = AngularArea2D<Schemes>;

export class WorkflowEditor {
    private readonly editor: NodeEditor<Schemes> = new NodeEditor<Schemes>();
    private readonly connection: ConnectionPlugin<Schemes, AreaExtra> = new ConnectionPlugin<Schemes, AreaExtra>();
    private readonly readonlyPlugin = new ReadonlyPlugin<Schemes>();
    private readonly area: AreaPlugin<Schemes, AreaExtra>;
    private readonly render: AngularPlugin<Schemes, AreaExtra>;

    private readonly socket = new ActivityPort();

    constructor(private injector: Injector, container: HTMLElement, isReadOnly: boolean) {
        this.area = new AreaPlugin<Schemes, AreaExtra>(container);
        this.render = new AngularPlugin<Schemes, AreaExtra>({injector});

        const selector = AreaExtensions.selector();
        AreaExtensions.selectableNodes(this.area, selector, {
            accumulating: AreaExtensions.accumulateOnCtrl(),
        });

        this.render.addPreset(
            Presets.classic.setup({
                customize: {
                    node() {
                        return ActivityComponent;
                    },
                    connection(data) {
                        if (data.payload.isMagnetic) {
                            return MagneticConnectionComponent;
                        }
                        return EdgeComponent;
                    },
                    socket() {
                        return ActivityPortComponent;
                    },
                },
            })
        );

        this.connection.addPreset(ConnectionPresets.classic.setup());


        // Attach plugins
        this.editor.use(this.readonlyPlugin.root);
        this.editor.use(this.area);
        this.area.use(this.connection);
        this.area.use(this.render);
        this.area.use(this.readonlyPlugin.area);


        let panningBoundary = null;
        if (!isReadOnly) {
            this.area.use(this.connection);  // make connections editable
            //this.area.use(this.contextMenu); // add context menu
            useMagneticConnection(this.connection, getMagneticConnectionProps(this.editor));
            panningBoundary = setupPanningBoundary({area: this.area, selector, padding: 40, intensity: 2});
        }

        AreaExtensions.restrictor(this.area, {scaling: {min: 0.03, max: 5}}); // Restrict Zoom

        this.area.addPipe((c) => {
            if (c.type === 'render') {
                console.log(c.data);
            }
            return c;
        });
        AreaExtensions.simpleNodesOrder(this.area);
        addCustomBackground(this.area);
    }

    async initialize(workflow: WorkflowModel): Promise<void> {

        // Create nodes and connections
        const a = new ActivityNode();
        a.addControl('a', new ClassicPreset.InputControl('text', {initial: 'hello'}));
        a.addOutput('a', new ClassicPreset.Output(this.socket));
        await this.editor.addNode(a);

        const b = new ActivityNode();
        b.addControl('b', new ClassicPreset.InputControl('text', {initial: 'hello'}));
        b.addInput('b', new ClassicPreset.Input(this.socket));
        await this.editor.addNode(b);

        await this.area.translate(b.id, {x: 320, y: 0});
        await this.editor.addConnection(new Edge(a, 'a', b, 'b'));

        AreaExtensions.zoomAt(this.area, this.editor.getNodes());
    }

    destroy(): void {
        this.area.destroy();
    }
}

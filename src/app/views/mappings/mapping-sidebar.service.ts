import {inject, Injectable} from '@angular/core';
import {Params, Router} from '@angular/router';
import {EMPTY} from 'rxjs';
import {catchError, ignoreElements, map, tap} from 'rxjs/operators';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {SidebarNode} from '../../models/sidebar-node.model';
import {MappingService} from '../../services/mapping.service';
import {MAPPING_KINDS, mappingDetailLink, mappingKindLabel, mappingUsesSource, MappingKind, MappingSummary, PhysicalSourceSelection} from './mapping.model';

@Injectable({providedIn: 'root'})
export class MappingSidebarService {
    private readonly sidebar = inject(LeftSidebarService);
    private readonly router = inject(Router);
    private readonly mappings = inject(MappingService);

    loadGlobal(source: PhysicalSourceSelection | null, selectedId?: number) {
        const returnQuery = source ? {
            returnSourceAdapterId: source.adapterId,
            returnSourceNamespace: source.namespaceName,
            returnSourceTable: source.physicalName
        } : null;
        return this.mappings.getMappings().pipe(
            tap(({mappings}) => this.show(source ? mappings.filter(mapping => mappingUsesSource(mapping, source)) : mappings,
                selectedId, undefined, undefined, returnQuery)),
            map(({mappings}) => mappings)
        );
    }

    loadAdapter(adapterId: number, adapterName: string, selectedId?: number) {
        this.show([], selectedId, adapterId, undefined, undefined, adapterName);
        return this.mappings.getSummaries([adapterId]).pipe(
            tap(({adapters}) => {
                const adapter = adapters.find(item => item.adapterId === adapterId);
                if (adapter) {
                    this.show(adapter.mappings, selectedId, adapterId, undefined, undefined, adapter.adapterName);
                }
            }),
            catchError(() => EMPTY),
            ignoreElements()
        );
    }

    show(mappings: MappingSummary[], selectedId?: number, adapterId?: number, selectedKind?: MappingKind, returnQuery?: Params, adapterName?: string) {
        const groups = new Map<string, SidebarNode>();
        const adapterGroupId = `mapping-adapter:${adapterId}`;
        const orderedMappings = [...mappings].sort((a, b) => (adapterId == null ? MAPPING_KINDS.indexOf(a.kind) - MAPPING_KINDS.indexOf(b.kind) : 0)
            || a.mappingName.localeCompare(b.mappingName) || a.mappingId - b.mappingId);
        if (adapterId == null) {
            for (const kind of MAPPING_KINDS.filter(kind => kind === 'PHYSICAL_TO_LOGICAL' || kind === selectedKind
                || mappings.some(mapping => mapping.kind === kind))) {
                const groupId = `mapping-kind:${kind}`;
                const group = Object.assign(new SidebarNode(groupId, mappingKindLabel(kind), 'fa fa-exchange')
                    .disableRouting().setAutoExpand(false).setAutoActive(false)
                    .setAction(() => this.router.navigate(['/views/mappings/kind', kind])), {isExpanded: true});
                group.cssClass = kind === selectedKind ? 'node-content-wrapper-active' : '';
                groups.set(groupId, group);
            }
        } else {
            const name = adapterName ?? orderedMappings[0]?.adapterName;
            if (name != null) {
                const group = Object.assign(new SidebarNode(adapterGroupId, this.escape(name), 'fa fa-plug')
                    .disableRouting().setAutoExpand(false).setAutoActive(false)
                    .setAction(() => this.router.navigate(['/views/adapters', adapterId, 'mappings', 'list'])), {isExpanded: true});
                group.cssClass = selectedId == null ? 'node-content-wrapper-active' : '';
                groups.set(adapterGroupId, group);
            }
        }
        for (const mapping of orderedMappings) {
            const groupId = adapterId == null ? `mapping-kind:${mapping.kind}` : adapterGroupId;
            const commands = mappingDetailLink(mapping, adapterId);
            const node = new SidebarNode(`mapping:${mapping.mappingId}`,
                this.escape(mapping.mappingName), 'fa fa-exchange')
                .disableRouting().setAutoExpand(false).setAutoActive(false)
                .setAction(() => returnQuery ? this.router.navigate(commands, {queryParams: returnQuery}) : this.router.navigate(commands));
            node.cssClass = mapping.mappingId === selectedId ? 'node-content-wrapper-active' : '';
            groups.get(groupId).children.push(node);
        }
        this.sidebar.setTopButtons([]);
        this.sidebar.reset();
        this.sidebar.setNodes([...groups.values()]);
        this.sidebar.open();
    }

    close() {
        this.sidebar.close();
    }

    private escape(value: string): string {
        return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

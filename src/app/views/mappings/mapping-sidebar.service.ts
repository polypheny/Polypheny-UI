import {inject, Injectable} from '@angular/core';
import {Params, Router} from '@angular/router';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {SidebarNode} from '../../models/sidebar-node.model';
import {MAPPING_KINDS, mappingKindLabel, MappingKind, MappingSummary} from './mapping.model';

@Injectable({providedIn: 'root'})
export class MappingSidebarService {
    private readonly sidebar = inject(LeftSidebarService);
    private readonly router = inject(Router);

    show(mappings: MappingSummary[], selectedId?: number, adapterId?: number, selectedKind?: MappingKind, returnQuery?: Params) {
        const groups = new Map<string, SidebarNode>();
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
        }
        for (const mapping of [...mappings].sort((a, b) => (adapterId == null ? MAPPING_KINDS.indexOf(a.kind) - MAPPING_KINDS.indexOf(b.kind) : 0)
            || a.mappingName.localeCompare(b.mappingName) || a.mappingId - b.mappingId)) {
            const groupId = adapterId == null ? `mapping-kind:${mapping.kind}` : `mapping-adapter:${adapterId}`;
            if (!groups.has(groupId)) {
                const group = Object.assign(new SidebarNode(groupId,
                    this.escape(adapterId == null ? mappingKindLabel(mapping.kind) : mapping.adapterName),
                    adapterId == null ? 'fa fa-exchange' : 'fa fa-plug')
                    .disableRouting().setAutoExpand(false).setAutoActive(false)
                    .setAction(() => this.router.navigate(['/views/adapters', adapterId, 'mappings', 'list'])), {isExpanded: true});
                group.cssClass = selectedId == null ? 'node-content-wrapper-active' : '';
                groups.set(groupId, group);
            }
            const commands = adapterId == null
                ? ['/views/mappings', mapping.mappingId, ...(mapping.editable ? ['edit'] : [])]
                : ['/views/adapters', adapterId, 'mappings', mapping.mappingId];
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

import {AfterContentChecked, ChangeDetectorRef, Component, Inject, OnDestroy, signal} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {navItems} from '../../_nav';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {InformationService} from '../../services/information.service';
import {CrudService} from '../../services/crud.service';
import {PluginService} from '../../services/plugin.service';
import {freeSet} from '@coreui/icons';
import {WebuiSettingsService} from '../../services/webui-settings.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './default-layout.component.html',
    styleUrls: ['./default-layout.component.scss']
})
export class DefaultLayoutComponent implements OnDestroy, AfterContentChecked {
    public navItems = navItems;
    public sidebarMinimized = true;
    private changes: MutationObserver;
    public element: HTMLElement;
    icons = freeSet;
    hover = signal(false);
    modal = signal(false);


    constructor(
        public _sidebar: LeftSidebarService,
        public _information: InformationService,
        public _settings: WebuiSettingsService,
        public _crud: CrudService,
        public _plugin: PluginService,
        public _left: LeftSidebarService,
        private changeDetector: ChangeDetectorRef,
        @Inject(DOCUMENT) _document?: any,
    ) {

        this.changes = new MutationObserver(() => {
            this.sidebarMinimized = _document.body.classList.contains('sidebar-minimized');
        });
        this.element = _document.body;
        this.changes.observe(<Element>this.element, {
            attributes: true,
            attributeFilter: ['class']
        });

    }

    ngAfterContentChecked(): void {
        this.changeDetector.detectChanges();
    }

    ngOnDestroy(): void {
        this.changes.disconnect();
    }

    getConnectedColor() {
        return this._information.connected ? 'success' : 'danger';
    }

    exploreByExampleEnabled() {
        return this._plugin.getEnabledPlugins().includes('explore-by-example');
    }

    inventoryEnabled() {
        return this._plugin.getEnabledPlugins().includes('ent-inventory');
    }

    toggleDropdown() {
        console.log('enter');
    }

    getConnectionText() {
        return this._information.connected ? 'Connected to<br><span class="text-success">' + this._settings.getConnection('crud.rest') + '</span>' : '<span class="text-warning">Disconnected</span>';
    }

    isConnected() {
        return this._information.connected;
    }

    reconnect() {
        this._information.manualReconnect();
        console.log('reconnecting');
    }

    getConnectedSymbol() {
        return this._information.connected ? 'cil-check' : (this.hover ? 'cil-sync' : 'cil-warning');
    }

    openSettings() {
        this.modal.set(true);
    }

    handleModalChange($event: boolean) {
        this.modal.set($event);
    }
}

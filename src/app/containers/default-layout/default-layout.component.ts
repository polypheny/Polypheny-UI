import {AfterContentChecked, ChangeDetectorRef, Component, Inject, OnDestroy} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {navItems} from '../../_nav';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {InformationService} from '../../services/information.service';
import {CrudService} from '../../services/crud.service';
import {PluginService} from '../../services/plugin.service';
import {freeSet} from '@coreui/icons';

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
    showRight = false;
    icons = freeSet;

    constructor(
        public _sidebar: LeftSidebarService,
        public _information: InformationService,
        public _crud: CrudService,
        public _plugin: PluginService,
        public _left: LeftSidebarService,
        private changeDetector: ChangeDetectorRef,
        @Inject(DOCUMENT) _document?: any,
    ) {

        this.changes = new MutationObserver((mutations) => {
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

    getConnectionClass() {
        return this._information.connected ? 'connected' : 'disconnected';
    }

    exploreByExampleEnabled() {
        return this._plugin.getEnabledPlugins().includes('explore-by-example');

    }

    toggleDropdown() {
        console.log('enter');
    }
}

import {AfterContentChecked, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {navItems} from '../../_nav';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {InformationService} from '../../services/information.service';
import {CrudService} from '../../services/crud.service';
import {PluginService} from '../../services/plugin.service';
import {freeSet} from '@coreui/icons';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {filter, Subscription} from 'rxjs';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {map} from 'rxjs/operators';
import {SidebarComponent} from '@coreui/angular';

@Component({
    selector: 'app-dashboard',
    templateUrl: './default-layout.component.html',
    styleUrls: ['./default-layout.component.scss'],
    standalone: false
})
export class DefaultLayoutComponent implements OnInit, OnDestroy, AfterContentChecked {
    @ViewChild('leftSidebar') leftSidebarComponent: SidebarComponent;

    public navItems = navItems;
    public sidebarMinimized = true;
    private changes: MutationObserver;
    public element: HTMLElement;
    icons = freeSet;
    hover = signal(false);
    modal = signal(false);

    isFluid = signal(false);
    private routeDataSubscription: Subscription;


    constructor(
        public _information: InformationService,
        public _settings: WebuiSettingsService,
        public _crud: CrudService,
        public _plugin: PluginService,
        public _left: LeftSidebarService,
        private _route: ActivatedRoute,
        private _router: Router,
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

    ngOnInit(): void {
        this.isFluid.set(this.getLastChildData().isFullWidth || false);

        this.routeDataSubscription = this._router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(() => this.getLastChildData())
        ).subscribe(data => {
            this.isFluid.set(data.isFullWidth || false);
        });
    }

    ngAfterContentChecked(): void {
        this.changeDetector.detectChanges();
    }

    ngOnDestroy(): void {
        this.changes.disconnect();
        this.routeDataSubscription.unsubscribe();
    }

    getConnectedColor() {
        return this._information.connected ? 'success' : 'danger';
    }

    exploreByExampleEnabled() {
        return this._plugin.getEnabledPlugins().includes('explore-by-example');

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

    private getLastChildData() {
        // data of child routes: https://stackoverflow.com/a/50780702
        let route = this._route;
        while (route.firstChild) {
            route = route.firstChild;
        }
        return route.snapshot.data;
    }
}

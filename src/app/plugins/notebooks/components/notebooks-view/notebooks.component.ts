import {Component, OnDestroy, OnInit} from '@angular/core';
import {NotebooksService} from '../../services/notebooks.service';
import {LeftSidebarService} from '../../../../components/left-sidebar/left-sidebar.service';
import {ToastService} from '../../../../components/toast/toast.service';
import {WebuiSettingsService} from '../../../../services/webui-settings.service';
import {SidebarNode} from '../../../../models/sidebar-node.model';

@Component({
    selector: 'app-notebooks',
    templateUrl: './notebooks.component.html',
    styleUrls: ['./notebooks.component.scss']
})
export class NotebooksComponent implements OnInit, OnDestroy {

    constructor(
        private _notebooks: NotebooksService,
        private _leftSidebar: LeftSidebarService,
        private _toast: ToastService,
        private _settings: WebuiSettingsService) {
    }

    ngOnInit(): void {
        const nodes = [
            new SidebarNode('filesHeading', 'Files', '', '').asSeparator()
        ];
        this._leftSidebar.setNodes(nodes);
        this._leftSidebar.open();
    }

    ngOnDestroy() {
        this._leftSidebar.close();
    }
}

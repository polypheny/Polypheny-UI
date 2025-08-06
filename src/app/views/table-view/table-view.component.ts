import {Component, computed, effect, OnDestroy, OnInit, Signal, untracked} from '@angular/core';
import {DataTemplateComponent} from '../../components/data-view/data-template/data-template.component';
import {Router} from '@angular/router';

@Component({
    selector: 'app-table-view',
    templateUrl: './table-view.component.html',
    styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent extends DataTemplateComponent implements OnInit, OnDestroy {

    readonly fullName: Signal<string>;
    reload = () => {// we can preserve the "this" context
        if (!this.entity()) {
            return;
        }

        this.getEntityData();
    }

    constructor(readonly _router: Router) {
        super();
        this.fullName = computed(() => <string>this.routeParams()['id']);

        effect(() => {
            if (!this.entity()) {
                return;
            }

            untracked(() => {
                this.getEntityData();
            });
        });

        effect(() => {
            const catalog = this._catalog.listener();
            untracked(() => {
                this._sidebar.setSchema(this._router, '/views/data-table/', true, 2, false);
            });
        });
    }

    ngOnInit() {
        super.ngOnInit();

        const sub = this.webSocket.reconnecting.subscribe(
            b => {
                if (b) {
                    this.getEntityData();
                }
            }
        );
        this.subscriptions.add(sub);

    }


    ngOnDestroy() {
        this._sidebar.close();
        this.subscriptions.unsubscribe();
        this.webSocket.close();
    }

    openSchemaView() {
        this._router.navigate(['/views/schema-editing/' + this.fullName()]).then();
    }
}

import {Component, computed, effect, Injector, Input, OnDestroy, OnInit, Signal, untracked} from '@angular/core';
import {DataTemplateComponent} from '../../components/data-view/data-template/data-template.component';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent extends DataTemplateComponent implements OnInit, OnDestroy {

  readonly fullName: Signal<string>;

  constructor() {
    super();
    this.fullName = computed(() => <string>this.routeParams()['id']);

    effect(() => {
      if (!this.entity()) {
        return;
      }
      console.log(this.entity());

      untracked(() => {
        this.getEntityData();
      });

    });
  }

  ngOnInit() {
    super.ngOnInit();

    this._sidebar.setSchema(this._router, '/views/data-table/', true, 2, false);
    const sub = this.webSocket.reconnecting.subscribe(
        b => {
          if (b) {
            this._sidebar.setSchema(this._router, '/views/data-table/', true, 2, false);
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
}

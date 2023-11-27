import {Component, OnInit} from '@angular/core';
import {DataTemplateComponent} from '../data-template/data-template.component';
import {DataModel} from '../../../models/ui-request.model';

@Component({
  selector: 'app-data-card',
  templateUrl: './data-card.component.html',
  styleUrls: ['./data-card.component.scss']
})
export class DataCardComponent extends DataTemplateComponent implements OnInit {

  constructor() {
    super();
  }

  showInsertCard = false;
  jsonValid = false;

  protected readonly DataModel = DataModel;

  ngOnInit(): void {
    super.ngOnInit();
    if (this.entityConfig && this.entityConfig().create) {
      this.buildInsertObject();
    }
    this.setPagination();
  }

  setJsonValid($event: any) {
    this.jsonValid = $event;
  }

  showInsert() {
    this.editing = null;
    this.showInsertCard = true;
  }
}

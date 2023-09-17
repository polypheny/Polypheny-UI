import {Component, OnInit} from '@angular/core';
import {QueryLanguage} from '../models/result-set.model';
import {DataTemplateComponent} from '../data-template/data-template.component';
import {NamespaceType} from '../../../models/ui-request.model';

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

  protected readonly QueryLanguage = QueryLanguage;

  protected readonly NamespaceType = NamespaceType;

  ngOnInit(): void {
    super.ngOnInit();
    if (this.entityConfig && this.entityConfig.create) {
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

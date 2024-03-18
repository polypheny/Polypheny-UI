import {Component, computed, HostListener, Input, OnInit, signal, untracked, ViewEncapsulation} from '@angular/core';
import {InformationPage} from '../../models/information-page.model';
import {KeyValue} from '@angular/common';
import {InformationService} from '../../services/information.service';

@Component({
  selector: 'app-information-manager',
  templateUrl: './information-manager.component.html',
  styleUrls: ['./information-manager.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class InformationManagerComponent implements OnInit {

  @Input() data: InformationPage;
  refreshingPage = false;
  refreshingGroup = [];
  width = signal(1080);
  zoom = computed(() => {
    if (this.width() < 1200 || this.data.fullWidth) {
      return 12;
    } else {
      return 4;
    }
  });

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    untracked(() => {
      this.width.set(window.innerWidth);
    });
  }


  constructor(
      private _information: InformationService
  ) {
    this.onResize();
  }

  ngOnInit() {
  }

  getCardClass(color) {
    switch (color) {
      case 'BLUE':
        return 'bg-primary';
      case 'LIGHTBLUE':
        return 'bg-info';
      case 'YELLOW':
        return 'bg-warning';
      case 'RED':
        return 'bg-danger';
      case 'GREEN':
        return 'bg-success';
      default:
        return '';
    }
  }

  /** order groups within a page, respectively information-elements within a group
   * items with lower order value are rendered first, then this with higher values, then thows where uiOrder is null ( -> 0)
   */
  public order(a: KeyValue<string, any>, b: KeyValue<string, any>) {
    let out = 0;
    if (a.value.uiOrder !== 0 && b.value.uiOrder === 0) {
      out = -1;
    } else if (a.value.uiOrder === 0 && b.value.uiOrder !== 0) {
      out = 1;
    } else if (a.value.uiOrder > b.value.uiOrder) {
      out = 1;
    } else if (a.value.uiOrder < b.value.uiOrder) {
      out = -1;
    }
    return out;
  }

  refreshPage() {
    this.refreshingPage = true;
    this._information.refreshPage(this.data.id).subscribe().add(() => this.refreshingPage = false);
  }

  refreshGroup(id: string) {
    this.refreshingGroup[id] = true;
    this._information.refreshGroup(id).subscribe().add(() => this.refreshingGroup[id] = false);
  }

}

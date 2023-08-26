import {Component, ComponentRef, OnInit, ViewChild} from '@angular/core';
import {ToasterService} from './toaster.service';
import {UtilService} from '../../services/util.service';
import {ToasterComponent, ToasterPlacement} from '@coreui/angular';
import {ToastComponent} from './toast/toast.component';

@Component({
  selector: 'app-toast-exposer',
  templateUrl: './toast-exposer.component.html',
  styleUrls: ['./toast-exposer.component.scss']
})
export class ToastExposerComponent implements OnInit {


  placement = ToasterPlacement.TopEnd;

  @ViewChild(ToasterComponent) toaster!: ToasterComponent;

  constructor(
      private _toaster: ToasterService,
      private _util: UtilService
  ) {
    this._toaster.toasts.subscribe({
      next: toast => {
        const options = {
          title: toast.title,
          delay: 5000,
          placement: this.placement,
          color: toast.type,
          autohide: true
        };
        const componentRef:ComponentRef<ToastComponent> = this.toaster.addToast( ToastComponent, {...options});
        componentRef.instance.toast.next(toast);
      }
    });
  }

  ngOnInit() {
  }


}

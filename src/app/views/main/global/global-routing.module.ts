import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {GlobalComponent} from './global.component';

const routes: Routes = [
  {
    path: '',
    component: GlobalComponent,
    data: { title: 'Global view' }
  },
  {
    path: ':mode',
    component: GlobalComponent
    /*data: {
      title: 'Global view'
    }*/
  },
  {
    path: ':mode/:id',
    component: GlobalComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GlobalRoutingModule { }

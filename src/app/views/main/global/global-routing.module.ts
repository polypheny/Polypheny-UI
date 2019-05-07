import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GlobalComponent } from './global.component';

const routes: Routes = [
  {
    path: '',
    component: GlobalComponent
  },
  {
    path: ':mode',
    component: GlobalComponent
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

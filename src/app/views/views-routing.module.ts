import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {UmlComponent} from './uml/uml.component';
import {SqlConsoleComponent} from './sql-console/sql-console.component';
import {EditColumnsComponent} from './edit-columns/edit-columns.component';
import {GraphicalQueryingComponent} from './graphical-querying/graphical-querying.component';
import {FormGeneratorComponent} from './forms/form-generator/form-generator.component';
import {TableViewComponent} from './table-view/table-view.component';

const routes: Routes = [
  {
    path: 'uml/:id',
    component: UmlComponent,
    data: {
      title: 'UML'
    }
  },
  {
    path: 'sql-console',
    component: SqlConsoleComponent,
    data: {
      title: 'SQL Console'
    }
  },
  {
    path: 'data-table',
    component: TableViewComponent,
    data: {
      title: 'Data Table'
    }
  },
  {
    path: 'data-table/:id',
    component: TableViewComponent,
    data: {
      title: 'Data Table'
    }
  },
  {
    path: 'data-table/:id/:page',
    component: TableViewComponent,
    data: {
      title: 'Data Table'
    }
  },
  {
    path: 'edit-columns',
    component: EditColumnsComponent,
    data: {
      title: 'Edit Columns'
    }
  },
  {
    path: 'edit-columns/:id',
    component: EditColumnsComponent,
    data: {
      title: 'Edit Columns'
    }
  },
  {
    path: 'graphical-querying/:id',
    component: GraphicalQueryingComponent,
    data: {
      title: 'Graphical Querying'
    }
  },
  {
    path: 'config',
    component: FormGeneratorComponent,
    data: {
      title: 'Form Generator'
    }
  },
  {
    path: 'config/:page',
    component: FormGeneratorComponent,
    data: {
      title: 'Form Generator'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ViewsRoutingModule {}

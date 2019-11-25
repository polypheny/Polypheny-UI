import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {UmlComponent} from './uml/uml.component';
import {FormGeneratorComponent} from './forms/form-generator/form-generator.component';
import {TableViewComponent} from './table-view/table-view.component';
import {SchemaEditingComponent} from './schema-editing/schema-editing.component';
import {MonitoringComponent} from './monitoring/monitoring.component';
import {QueryingComponent} from './querying/querying.component';
import {StoresComponent} from './stores/stores.component';
import {HubComponent} from './hub/hub.component';

const routes: Routes = [
  {
    path: 'monitoring',
    component: MonitoringComponent,
    data: {
      title: 'Monitoring'
    }
  },
  {
    path: 'monitoring/:id',
    component: MonitoringComponent,
    data: {
      title: 'Monitoring'
    }
  },
  {
    path: 'uml',
    redirectTo: 'uml/',
    pathMatch: 'full'
  },
  {
    path: 'uml/:id',
    component: UmlComponent,
    data: {
      title: 'UML'
    }
  },
  {
    path: 'querying',
    redirectTo: 'querying/sql-console',
    pathMatch: 'full'
  },
  {
    path: 'querying/:route',
    component: QueryingComponent,
    data: {
      title: 'Querying'
    }
  },
  {
    path: 'data-table',
    redirectTo: 'data-table/',
    pathMatch: 'full'
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
    path: 'schema-editing',
    redirectTo: 'schema-editing/',
    pathMatch: 'full'
  },
  {
    path: 'schema-editing/:id',
    component: SchemaEditingComponent,
    data: {
      title: 'Schema Editing'
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
  },
  {
    path: 'stores',
    component: StoresComponent,
    data: {
      title: 'Stores'
    }
  },
  {
    path: 'hub',
    component: HubComponent,
    data: {
      title: 'Polypheny-DB Hub'
    }
  },
  {
    path: 'hub/:sub',
    component: HubComponent,
    data: {
      title: 'Polypheny-DB Hub'
    }
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ViewsRoutingModule {}

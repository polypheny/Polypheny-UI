import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Import Containers
import { DefaultLayoutComponent } from './containers';

import { P404Component } from './views/error/404.component';
import { P500Component } from './views/error/500.component';
import { LoginComponent } from './views/login/login.component';
import {SqlConsoleComponent} from './views/sql-console/sql-console.component';
import {EditColumnsComponent} from './views/edit-columns/edit-columns.component';
import {UmlComponent} from './views/uml/uml.component';
import {GraphicalQueryingComponent} from './views/graphical-querying/graphical-querying.component';
import {FormGeneratorComponent} from './views/forms/form-generator/form-generator.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home/global',
    pathMatch: 'full',
  },
  {
    path: '404',
    component: P404Component,
    data: {
      title: 'Page 404'
    }
  },
  {
    path: '500',
    component: P500Component,
    data: {
      title: 'Page 500'
    }
  },
  {
    path: 'login',
    component: LoginComponent,
    data: {
      title: 'Login Page'
    }
  },
  /*{
    path: 'register',
    component: RegisterComponent,
    data: {
      title: 'Register Page'
    }
  },*/
  {
    path: '',
    component: DefaultLayoutComponent,
    data: {
      title: 'Home'
    },
    children: [
      {
        path: 'base',
        loadChildren: './coreui/base/base.module#BaseModule'
      },
      {
        path: 'buttons',
        loadChildren: './coreui/buttons/buttons.module#ButtonsModule'
      },
      {
        path: 'charts',
        loadChildren: './coreui/chartjs/chartjs.module#ChartJSModule'
      },
      {
        path: 'dashboard',
        loadChildren: './coreui/dashboard/dashboard.module#DashboardModule'
      },
      {
        path: 'icons',
        loadChildren: './coreui/icons/icons.module#IconsModule'
      },
      {
        path: 'notifications',
        loadChildren: './coreui/notifications/notifications.module#NotificationsModule'
      },
      {
        path: 'theme',
        loadChildren: './coreui/theme/theme.module#ThemeModule'
      },
      {
        path: 'widgets',
        loadChildren: './coreui/widgets/widgets.module#WidgetsModule'
      },
      {
        path: 'home',
        loadChildren: './views/main/global/global.module#GlobalModule'
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
        loadChildren: './views/views.module#ViewsModule',
        data: {
          title: 'Data Table'
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
        path: 'uml/:id',
        component: UmlComponent,
        data: {
          title: 'UML'
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
    ]
  },
  { path: '**', component: P404Component }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}

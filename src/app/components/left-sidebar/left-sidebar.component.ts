import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/draggable';
import {KEYS, TREE_ACTIONS, TreeComponent, TreeModel, TreeNode } from 'angular-tree-component';
import {ConfigService} from '../../services/config.service';
import {ActivatedRoute, Router} from '@angular/router';
import {LeftSidebarService} from './left-sidebar.service';

@Component({
  selector: 'app-left-sidebar',
  templateUrl: './left-sidebar.component.html',
  styleUrls: ['./left-sidebar.component.scss']
})

//docs: https://angular2-tree.readme.io/docs/
export class LeftSidebarComponent implements OnInit , AfterViewInit {

  @ViewChild('tree') treeComponent: TreeComponent;
  nodes;
  options;

  constructor( _config:ConfigService,
               _router:Router,
               _sidebar: LeftSidebarService,
  ) {
    //this.nodes = nodes;
    this.options = {
      actionMapping: {
        mouse: {
          dblClick: (tree, node, $event) => {
            if (node.hasChildren) TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
          },
          click: (tree, node, $event) => {
            if ( ! node.hasChildren){
              _router.navigate([node.data.routerLink]);
              node.setIsActive(true);
            }
          }
        },
      },
      allowDrag: true,
      allowDrop: false
    };

    _sidebar.getNodes().subscribe(
      nodes => {
        this.nodes = nodes;
      }
    );
    /*_config.getPageList().subscribe(
      res => {
        this.nodes = res;
      }, err => {
        console.log(err);
      }
    );*/
  }

  ngOnInit() {
    $('body').addClass('sidebar-lg-show');
  }

  ngAfterViewInit(): void {
    const treeModel: TreeModel = this.treeComponent.treeModel;
    // treeModel.setState({id: 1, name: 'test'});// not working yet

    // todo 2-way-binding https://angular2-tree.readme.io/docs/save-restore

    $('#search-tree').on('keyup', function(e) {
      if (e.which === 27) { // esc
        $(this).val('');
      }
      treeModel.filterNodes((node) => {
        return node.data.name.startsWith($(this).val());
      });
    });

  }

  nodeIsActive ( node:any ): boolean {
    const regex = new RegExp('\\/('+ node.id +')$');
    return location.hash.match(regex) !== null;
    //  location.hash.match(/\/(\w+)$/)

  }

}

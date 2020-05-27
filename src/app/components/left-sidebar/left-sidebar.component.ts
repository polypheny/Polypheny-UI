import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import * as $ from 'jquery';
import {KEYS, TREE_ACTIONS, TreeComponent, TreeModel, TreeNode} from 'angular-tree-component';
import {Router} from '@angular/router';
import {LeftSidebarService} from './left-sidebar.service';

@Component({
  selector: 'app-left-sidebar',
  templateUrl: './left-sidebar.component.html',
  styleUrls: ['./left-sidebar.component.scss']
})

//docs: https://angular2-tree.readme.io/docs/
export class LeftSidebarComponent implements OnInit, AfterViewInit {

  @ViewChild('tree', {static: false}) treeComponent: TreeComponent;
  nodes = [];
  options;
  error;

  constructor(
    _router: Router,
    private _sidebar: LeftSidebarService,
  ) {
    //this.nodes = nodes;
    this.options = {
      actionMapping: {
        mouse: {
          click: (tree, node, $event) => {
            if (node.data.action !== null) {
              node.data.action(tree, node, $event);
            }
            if (node.data.routerLink && node.data.allowRouting) {
              _router.navigate([node.data.routerLink]);
            }
            if (node.data.isAutoExpand()) {
              node.toggleExpanded();
              //TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
            }
            if (node.data.isAutoActive()) {
              node.setIsActive(true, false);
            }
          }
        },
      },
      allowDrag: (node) => node.data.allowDrag,
      allowDrop: false
    };

    _sidebar.getError().subscribe(
      error => {
        this.error = error;
      }
    );
  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    const treeModel: TreeModel = this.treeComponent.treeModel;

    // todo 2-way-binding https://angular2-tree.readme.io/docs/save-restore

    $('#search-tree').on('keyup', function (e) {
      if (e.which === 27) { // esc
        $(this).val('');
      }
      treeModel.filterNodes((node) => {
        return node.data.name.toLowerCase().includes($(this).val().toLowerCase());
      });
    });

    this._sidebar.getNodes().subscribe(
      nodes => {
        this.nodes = nodes;
        if (nodes.length === 0) {
          this.treeComponent.treeModel.activeNodeIds = {};
          // this.treeComponent.treeModel.setFocusedNode(null);
          // this.treeComponent.treeModel.expandedNodeIds = {};
        }
        this.expandAll();
      }
    );

    this._sidebar.getInactiveNode().subscribe(
      inactiveNode => {
        if (inactiveNode !== null) {
          this.treeComponent.treeModel.getNodeById(inactiveNode).setIsActive(false, true);
        }
      }
    );

    this._sidebar.getResetSubject().subscribe(
      collapse => {
        if (collapse === true) {
          this.reset();
        } else {
          this.treeComponent.treeModel.activeNodeIds = {};
        }
      }
    );

  }


  expandAll() {
    this.treeComponent.treeModel.expandAll();
  }

  collapseAll() {
    this.treeComponent.treeModel.collapseAll();
  }

  /**
   * Reset tree completely, set all active nodes to inactive, collapse all
   */
  reset() {
    // from: https://angular2-tree.readme.io/discuss/583cc18bf0f9af0f007218ff
    this.treeComponent.treeModel.setFocusedNode(null);
    this.treeComponent.treeModel.expandedNodeIds = {};
    this.treeComponent.treeModel.activeNodeIds = {};
  }

}

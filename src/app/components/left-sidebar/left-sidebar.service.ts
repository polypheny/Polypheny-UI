import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject} from 'rxjs';
import {InformationService} from '../../services/information.service';
import {ConfigService} from '../../services/config.service';
import * as $ from 'jquery';
import {CrudService} from '../../services/crud.service';
import {SchemaRequest} from '../../models/ui-request.model';
import {SidebarNode, JavaPage} from '../../models/sidebar-node.model';
import {TreeNode} from 'angular-tree-component';

@Injectable({
  providedIn: 'root'
})
export class LeftSidebarService {

  constructor(
    private _http:HttpClient,
    private _informationService:InformationService,
    private _configService:ConfigService,
    private _crud: CrudService
  ) {}

  nodes: BehaviorSubject<Object[]> = new BehaviorSubject<Object[]>([]);
  error: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  action: (node: TreeNode) => void = null;
  //node that should be set inactive:
  private inactiveNode: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  private resetSubject = new BehaviorSubject<boolean>( false );

  private mapPages ( res:Object, mode:string ) {
    const pages = <JavaPage[]> res;
    const nodes:SidebarNode[] = [];
    let routerLink = '';
    for( const p of pages ) {
      switch (mode) {
        case 'config':
          routerLink = '/views/config/'+p.id;
          break;
        case 'information':
          routerLink = '/views/monitoring/'+p.id;
          break;
        default:
          console.error('sidebarNode with unknown group');
      }
      nodes.push(new SidebarNode(p.id, p.name, p.icon, routerLink));
    }
    return nodes;
  }

  listInformationManagerPages () {
    return this._informationService.getPageList().subscribe(
      res => {
        this.nodes.next(this.mapPages(res, 'information'));
        this.error.next(null);
      }, err => {
        this.nodes.next([]);
        this.error.next('Could not get page list.');
        console.log(err);
      }
    );
  }

  listConfigManagerPages () {
    return this._configService.getPageList().subscribe(
      res => {
        this.nodes.next(this.mapPages(res, 'config'));
        this.error.next(null);
      }, err => {
        this.nodes.next([]);
        this.error.next('Could not get page list.');
        console.log(err);
      }
    );
  }

  getNodes () {
    return this.nodes;
  }

  setNodes ( n: SidebarNode[] ) {
    n = [].concat(n); // convert to array if it is not an array
    this.nodes.next( n );
    this.error.next(null);
  }

  getError () {
    return this.error;
  }

  setError ( msg: string ) {
    this.error.next(msg);
    this.nodes.next([]);
  }

  open () {
    $('body').addClass('sidebar-lg-show');
  }

  close() {
    this.nodes.next( [] );
    this.clearAction();
    $('body').removeClass('sidebar-lg-show');
  }

  /**
   * Reset tree completely, set all active nodes to inactive
   * @param collapse collapse tree if true
   */
  reset( collapse = false ){
    this.resetSubject.next( collapse );
  }

  getResetSubject(){
    return this.resetSubject;
  }

  /**
   * Retrieve a schemaTree using the _crud service and apply it to the left sidebar
   */
  setSchema ( schemaRequest: SchemaRequest ){
    this._crud.getSchema( schemaRequest ).subscribe(
      res => {
        this.error.next(null);
        const schema = <SidebarNode[]> res;
        //Schema editing view
        if( !schemaRequest.views && schemaRequest.depth === 2 ){
          schema.forEach( (val, key) => {
            val.routerLink = schemaRequest.routerLinkRoot;
            val.children.forEach( (v, k) => {
              v.routerLink = schemaRequest.routerLinkRoot + val.id;
            });
            //val.children.unshift( new SidebarNode( val.id+'.manageTables', 'manage tables', 'fa fa-clone', schemaRequest.routerLinkRoot + val.id ) );
          });
          //schema.unshift( new SidebarNode( 'schema', 'schema', 'fa fa-database', '/views/schema-editing') );
        }
        //Uml view
        else if( schemaRequest.depth === 1 ){
          schema.forEach( (val, key) => {
            val.routerLink = schemaRequest.routerLinkRoot + val.id;
          });
        }
        this.setNodes( schema );
      }, err => {
        this.error.next('Could not load database schema.');
        //this._toast.toast( 'server error', 'Could not load database schema.', 0, 'bg-danger' );
        console.log(err);
      }
    );
    this.open();
  }

  /**
   * return the action to check if it is null
   */
  getAction(){
    return this.action;
  }

  /**
   * Define what should happen if you click on a node in the sidebar
   * @param action method to define what should happen if you click on a node in the sidebar
   */
  setAction ( action: ( node: TreeNode) => void ) {
    this.action = action;
  }

  clearAction(){
    this.action = null;
  }

  /**
   * sets a SidebarNode with id nodeId to inactive
   */
  setInactive( nodeId: string ) {
    this.inactiveNode.next( nodeId );
  }

  /**
   * Call this function to subscribe to the BehaviorSubject inactiveNode
   */
  getInactiveNode(){
    return this.inactiveNode;
  }

}

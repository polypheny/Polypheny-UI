import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import {CrudService} from '../../services/crud.service';
import {ToastService} from '../../components/toast/toast.service';

@Component({
  selector: 'app-docker',
  templateUrl: './docker.component.html',
  styleUrls: ['./docker.component.scss']
})
export class DockerComponent implements OnInit {

  form: FormGroup;
  hostname: string;
  handshakes: Map<String, OpenHandshake>;
  handshakesByStatus: Map<String, Map<String, OpenHandshake>>;
  intervalId: number;
  autoDockerAvailable: boolean;
  autoDockerResult: string;

  constructor(
    private _crud: CrudService,
    private _toast: ToastService,
  ) {
    this.handshakes = new Map();
    this.handshakesByStatus = new Map();
    this.handshakesByStatus.set('FAILED', new Map());
    this.handshakesByStatus.set('SUCCESS', new Map());
    this.handshakesByStatus.set('RUNNING', new Map());
    this.handshakesByStatus.set('NOT_RUNNING', new Map());
    this.updateHandshakes();

    this.autoDockerAvailable = false;
    this.autoDockerResult = "";

    this._crud.autoHandshakeAvailable().subscribe(
      res => {
	let a = <Available>res;
	this.autoDockerAvailable = a.available;
      }, err => {
	console.log(err);
      }
    );

    this.intervalId = setInterval(() => {
      if (this.handshakes.size > 0) {
	this.updateHandshakes();
      }
    }, 1000);
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }

  onSubmit(): void {
    if (this.hostname == "") {
      return;
    }
    this._crud.startHandshake(this.hostname).subscribe(
      res => {
	this.hostname = "";
	let h = <OpenHandshake>res;
	if (this.handshakes.has(h.hostname)) {
	  let status = this.handshakes.get(h.hostname).status;
	  this.handshakesByStatus.get(status).delete(h.hostname);
	}
	this.handshakes.set(h.hostname, h)
	this.handshakesByStatus.get(h.status).set(h.hostname, h);
      }, err => {
	console.log( err );
      }
    );
  }

  updateHandshakeLists(handshakes: OpenHandshake[]): void {
    this.handshakes = new Map();
    this.handshakesByStatus = new Map();
    this.handshakesByStatus.set('FAILED', new Map());
    this.handshakesByStatus.set('SUCCESS', new Map());
    this.handshakesByStatus.set('RUNNING', new Map());
    this.handshakesByStatus.set('NOT_RUNNING', new Map());

    for (let handshake of handshakes) {
      this.handshakes.set(handshake.hostname, handshake);
      this.handshakesByStatus.get(handshake.status).set(handshake.hostname, handshake);
    }
  }

  updateHandshakes(): void {
    this._crud.listHandshakes().subscribe(
      res => {
	this.updateHandshakeLists(<OpenHandshake[]>res);
      }, err => {
	console.log(err);
      }
    );
  }

  redoHandshake(hostname: string): void {
    let h = this.handshakes.get(hostname);
    this.handshakesByStatus.get(h.status).delete(h.hostname);
    this.handshakesByStatus.get('RUNNING').set(h.hostname, h);

    this._crud.redoHandshake(hostname).subscribe(
      res => {
	let h = this.handshakes.get(hostname);
	let newHandshake = <OpenHandshake>res;
	this.handshakesByStatus.get(h.status).delete(h.hostname);
	this.handshakesByStatus.get(h.status).set(h.hostname, h);
	this.handshakes.set(h.hostname, h);
      }, err => {
	console.log(err);
      }
    );
  }

  doAutoHandshake(): void {
    this.autoDockerAvailable = false;
    this.autoDockerResult = "waiting";
    this._crud.doAutoHandshake().subscribe(
      res => {
	let s = <Success>res;
	if (s.success) {
	  this.autoDockerResult = "success";
	} else {
	  this.autoDockerResult = "failure";
	}
      }, err => {
	console.log(err);
      }
    );
  }
}

export interface OpenHandshake {
  hostname: string,
  runCommand: string,
  execCommand: string,
  status: string,
  lastErrorMessage: string,
  containerExists: string,
}

export interface Available {
  available: boolean,
}

export interface Success {
  success: boolean,
}

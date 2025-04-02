import {Component, Inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';
import { RouterOutlet } from '@angular/router';
import {DatabaseInfo, TableInfo} from '../models/databaseInfo.model';
import {FormsModule} from '@angular/forms';
import {TableSelectionDialogComponent} from '../components/table-selection-dialog/table-selection-dialog.component';
import {MatDialog} from '@angular/material/dialog';

@Injectable({
    providedIn: 'root'
})
export class SchemaDiscoveryService {
    title = 'schemaui';
    message = '';
    databaseList: DatabaseInfo[] = [];

    constructor(private http: HttpClient, private dialog: MatDialog) {
    }

    makeRequest() {
        this.message = 'Button geklickt !!!';
    }


    sendRequest(): void {
        this.http.post<DatabaseInfo[]>('http://127.0.0.1:7659/confirm', {})
            .subscribe({
                next: (response) => {
                    this.databaseList = response;
                    console.log('Halter Datei: ', this.databaseList);
                    for (const db of response) {
                        this.message += `Datenbank: ${db.name}\n`;
                        for (const schema of db.schemas) {
                            this.message += `Schema: ${schema}\n`;
                        }
                    }
                    alert('Nachricht angekommen.');
                },
                error: (err) => {
                    console.log('Fehler beim Aufrufen der Daten:', err);
                    alert('Nachricht nicht angekommen !!!');
                }
            });
    }

    openTableDialog(): void {
        this.http.post<DatabaseInfo[]>('http://127.0.0.1:7659/confirm', {})
            .subscribe({
                next: (data) => {
                    alert('Nachricht angekommen.');
                    console.log('Dateien: ', data);
                    localStorage.setItem('databaseInfo', JSON.stringify(data));
                    window.open('/#/table-selection', 'popup', 'width=1000, height=700');
                },
                error: (err) => {
                    console.error('Fehler beim Abrufen der Datenbankstruktur:', err);
                    alert('Nachricht nicht angekommen !!!');
                }
            });
    }
}

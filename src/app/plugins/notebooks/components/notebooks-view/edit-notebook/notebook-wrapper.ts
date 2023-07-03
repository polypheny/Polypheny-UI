import {KernelSpec, NotebookContent} from '../../../models/notebooks-response.model';
import {
    CellDisplayDataOutput,
    CellErrorOutput,
    CellExecuteResultOutput,
    CellOutputType,
    CellStreamOutput,
    Notebook,
    NotebookCell
} from '../../../models/notebook.model';
import * as uuid from 'uuid';
import {NotebooksWebSocket} from '../../../services/notebooks-webSocket';
import {
    KernelDisplayData,
    KernelErrorMsg,
    KernelExecuteInput,
    KernelExecuteReply,
    KernelExecuteResult,
    KernelInterruptReply,
    KernelMsg,
    KernelShutdownReply,
    KernelStatus,
    KernelStream,
    KernelUpdateDisplayData
} from '../../../models/kernel-response.model';
import {interval, Subscription} from 'rxjs';

export class NotebookWrapper {
    private nb: Notebook;
    private codeOrigin: Map<string, string> = new Map<string, string>();
    private copyNbJson: string;
    kernelStatus: 'unknown' | 'idle' | 'busy' | 'starting' = 'unknown';
    lastModifiedWhenLoaded: string;
    private keepAlive: Subscription;
    trustedCellIds: Set<string> = new Set<string>(); // cells that were executed by the user -> trust html outputs

    constructor(private content: NotebookContent,
                private busyCellIds: Set<string>,
                private socket: NotebooksWebSocket,
                private onExecuteMdCell: (id: string) => void,
                private onReceivedErrorOutput: (id: string, output: CellErrorOutput) => void,
                private onReceivedStreamOutput: (id: string, output: CellStreamOutput) => void,
                private onRenderPolyCell: (id: string) => void) {
        this.nb = content.content;
        this.markAsSaved(content.last_modified);
        this.validateIds();
        if (!this.nb.metadata.polypheny?.expand_params) {
            const metadata = this.nb.metadata.polypheny || {};
            metadata.expand_params = false;
            this.nb.metadata.polypheny = metadata;
        }
        this.busyCellIds.clear();
        this.socket.onMessage().subscribe(msg => this.handleKernelMsg(msg),
            err => {
                console.log('received error: ' + err);
            }, () => {
                this.socket = null;
                this.kernelStatus = 'unknown';
            });
        this.socket.requestExecutionState();
        this.keepAlive = interval(60000).subscribe(() => this.socket?.requestExecutionState()); // prevent 300s timeout
    }

    closeSocket() {
        this.keepAlive?.unsubscribe();
        this.socket?.close();
    }

    requestExecutionState() {
        this.socket?.requestExecutionState();
    }

    markAsSaved(lastModified: string) {
        this.lastModifiedWhenLoaded = lastModified;
        this.copyNbJson = JSON.stringify(this.nb);
    }

    hasChangedSinceSave(): boolean {
        return this.copyNbJson && this.copyNbJson !== JSON.stringify(this.nb);
    }

    lastSaveDiffersFrom(other: Notebook): boolean {
        return JSON.stringify(other) !== this.copyNbJson;
    }

    private validateIds() {
        const ids = new Set<string>();
        for (const cell of this.nb.cells) {
            if (cell.id == null || ids.has(cell.id)) {
                cell.id = uuid.v4();
            }
            ids.add(cell.id);
        }
    }

    insertCellByIdx(i: number, below: boolean = true): NotebookCell {
        const newCell = this.getEmptyCell();
        this.nb.cells.splice(i + +below, 0, newCell);
        return newCell;
    }

    insertCell(id: string, below: boolean = true): NotebookCell {
        const i = this.getCellIndex(id);
        if (i !== -1) {
            const newCell = this.getEmptyCell();
            this.nb.cells.splice(i + +below, 0, newCell);
            return newCell;
        }
        return null;
    }

    insertCopyOfCell(jsonCell: string, reference: NotebookCell, below: boolean = true): NotebookCell {
        const i = this.nb.cells.indexOf(reference);
        if (i !== -1) {
            const copyCell = this.getCopyOfCell(jsonCell);
            this.nb.cells.splice(i + +below, 0, copyCell);
            return copyCell;
        }
        return null;

    }

    duplicateCell(id: string) {
        const originalCell = this.getCell(id);
        if (originalCell) {
            const copyCell = this.getCopyOfCell(JSON.stringify(originalCell));
            this.cells.splice(this.getCellIndex(id) + 1, 0, copyCell);
            return copyCell;
        }
        return null;
    }

    deleteCell(id: string) {
        const i = this.getCellIndex(id);
        if (i !== -1) {
            this.nb.cells.splice(i, 1);
        }
    }

    /**
     * Returns the index of the cell with the given id.
     * -1 if no cell was found.
     */
    getCellIndex(id: string) {
        return this.nb.cells.findIndex(cell => cell.id === id);
    }

    getCell(id: string) {
        return this.nb.cells.find(cell => cell.id === id);
    }

    cellAbove(id: string) {
        const idx = this.getCellIndex(id);
        return idx < 1 ? null : this.cells[idx - 1];
    }

    cellBelow(id: string) {
        const idx = this.getCellIndex(id);
        return idx === this.cells.length - 1 ? null : this.cells[idx + 1];
    }

    executeAll() {
        for (const cell of this.nb.cells) {
            this.executeCell(cell, true);
        }
    }

    executeCells(reference: NotebookCell, above: boolean, refAndBelow: boolean) {
        const idx = this.nb.cells.indexOf(reference);
        if (idx < 0) {
            return;
        }
        if (above) {
            for (const cell of this.nb.cells.slice(0, idx)) {
                this.executeCell(cell, true);
            }
        }
        if (refAndBelow) {
            this.executeCell(reference, false);
            for (const cell of this.nb.cells.slice(idx + 1)) {
                this.executeCell(cell, true);
            }
        }
    }

    executeCell(cell: NotebookCell | string, automatic = false) {
        if (typeof cell === 'string') {
            cell = this.getCell(cell);
        }
        if (!cell || (automatic && cell.metadata.polypheny?.manual_execution)) {
            return;
        }
        switch (this.getCellType(cell)) {
            case 'code':
                if (this.socket) {
                    cell.outputs = [];
                    const msgId = this.socket?.sendCode(cell.source);
                    this.codeOrigin.set(msgId, cell.id);
                    this.busyCellIds.add(cell.id);
                } else {
                    console.warn('Kernel socket seems to have closed. Cannot send code.');
                }
                break;
            case 'markdown':
                this.onExecuteMdCell(cell.id);
                break;
            case 'poly':
                if (this.socket) {
                    cell.outputs = [];
                    const poly = cell.metadata.polypheny;
                    const id = this.socket.sendQuery(cell.source, poly.language, poly.namespace,
                        poly.result_variable || '_', this.isExpansionAllowed() && poly.expand_params);
                    this.codeOrigin.set(id, cell.id);
                    this.busyCellIds.add(cell.id);
                }
                break;
            default:
        }
        this.trustedCellIds.add(cell.id);
    }

    executeMdCells() {
        for (const cell of this.nb.cells) {
            if (cell.cell_type === 'markdown') {
                this.executeCell(cell);
            }
        }
    }

    trustAllCells() {
        for (const cell of this.nb.cells) {
            if (cell.cell_type !== 'markdown') {
                this.trustedCellIds.add(cell.id);
            }
        }
    }

    setKernelSpec(kernel: KernelSpec) {
        this.nb.metadata.kernelspec = {
            display_name: kernel.spec.display_name,
            language: kernel.spec.language,
            name: kernel.name
        };
    }

    changeCellType(cell: NotebookCell, type: CellType) {
        const oldType = this.getCellType(cell);
        if (oldType === type) {
            return;
        }
        switch (oldType) {
            case 'code':
                delete cell.outputs;
                delete cell.execution_count;
                break;
            case 'markdown':
                break;
            case 'raw':
                break;
            case 'poly':
                delete cell.outputs;
                delete cell.execution_count;
                delete cell.metadata.polypheny?.cell_type;
                break;
        }
        const oldMeta = cell.metadata.polypheny;
        switch (type) {
            case 'code':
                cell.outputs = [];
                cell.execution_count = null;
                cell.metadata = {polypheny: oldMeta};
                break;
            case 'markdown':
                cell.metadata = {};
                break;
            case 'raw':
                cell.metadata = {};
                break;
            case 'poly':
                cell.outputs = [];
                cell.execution_count = null;
                cell.metadata = {
                    polypheny: {
                        cell_type: 'poly', language: oldMeta?.language || 'sql',
                        namespace: oldMeta?.namespace || 'public',
                        result_variable: oldMeta?.result_variable || 'result',
                        expand_params: oldMeta?.expand_params || true, // nb-lvl expand_params also needs to be true to work
                        manual_execution: oldMeta?.manual_execution || false
                    }
                };
                break;
            default:
                return;
        }
        cell.cell_type = type === 'poly' ? 'code' : type;
    }

    clearAllOutputs() {
        for (const cell of this.cells) {
            if (cell.cell_type === 'code') {
                cell.outputs = [];
            }
        }
    }

    private handleKernelMsg(msg: KernelMsg) {
        const cellId = this.codeOrigin.get(msg?.parent_header?.msg_id);
        if (!cellId && msg.msg_type !== 'status') {
            return; // we ignore messages from other users in the same session, except for status updates
        }
        if (msg.msg_type === 'status') {
            this.handleStatusMsg(<KernelStatus>msg);
            return;
        }
        const cell = this.getCell(cellId);
        if (!cell) {
            return;
        }

        switch (msg.msg_type) {
            case 'execute_input':
                this.handleInputMsg(<KernelExecuteInput>msg, cell);
                break;
            case 'execute_reply':
                this.handleReplyMsg(<KernelExecuteReply>msg, cell);
                break;
            case 'stream':
                this.handleStreamMsg(<KernelStream>msg, cell);
                break;
            case 'execute_result':
                this.handleResultMsg(<KernelExecuteResult>msg, cell);
                break;
            case 'error':
                this.handleErrorMsg(<KernelErrorMsg>msg, cell);
                break;
            case 'interrupt_reply':
                this.handleInterruptMsg(<KernelInterruptReply>msg, cell);
                break;
            case 'shutdown_reply':
                this.handleShutdownMsg(<KernelShutdownReply>msg, cell);
                break;
            case 'display_data':
                this.handleDisplayMsg(<KernelDisplayData>msg, cell);
                break;
            case 'update_display_data':
                this.handleUpdateDisplayMsg(<KernelUpdateDisplayData>msg, cell);
                break;
            default:
                console.error('received unknown message type:', msg.msg_type);
        }
    }

    private handleStatusMsg(msg: KernelStatus) {
        this.kernelStatus = msg.content.execution_state;
    }

    private handleInputMsg(msg: KernelExecuteInput, cell: NotebookCell) {
        this.busyCellIds.add(cell.id);
        cell.execution_count = msg.content.execution_count;
    }

    private handleReplyMsg(msg: KernelExecuteReply, cell: NotebookCell) {
        this.busyCellIds.delete(cell.id);
        if (msg.content.status === 'ok') {
            cell.execution_count = msg.content.execution_count;
        }
    }

    private handleStreamMsg(msg: KernelStream, cell: NotebookCell) {
        if (this.getCellType(cell) === 'poly') {
            return;
        }
        let lastOutput = cell.outputs[cell.outputs.length - 1];
        if (lastOutput && lastOutput.output_type === 'stream') {
            lastOutput = <CellStreamOutput>lastOutput;
            if (lastOutput.name === msg.content.name) {
                this.addTextToOutputStream(lastOutput, msg.content.text);
                this.onReceivedStreamOutput(cell.id, lastOutput);
                return;
            }

        }
        const output: CellStreamOutput = {
            output_type: 'stream',
            name: msg.content.name,
            text: [msg.content.text]
        };
        cell.outputs.push(output);
        this.onReceivedStreamOutput(cell.id, output);
    }

    private handleResultMsg(msg: KernelExecuteResult, cell: NotebookCell) {
        this.busyCellIds.delete(cell.id);
        if (this.getCellType(cell) === 'poly') {
            return;
        }
        const output = msg.content as CellExecuteResultOutput;
        output.output_type = msg.msg_type as CellOutputType;
        cell.outputs.push(output);
    }

    private handleErrorMsg(msg: KernelErrorMsg, cell: NotebookCell) {
        const output = msg.content as CellErrorOutput;
        output.output_type = msg.msg_type as CellOutputType;
        cell.outputs.push(output);
        this.busyCellIds.delete(cell.id);
        this.onReceivedErrorOutput(cell.id, output);
    }

    private handleInterruptMsg(msg: KernelInterruptReply, cell: NotebookCell) {
        this.busyCellIds.clear();

    }

    private handleShutdownMsg(msg: KernelShutdownReply, cell: NotebookCell) {
        this.busyCellIds.clear();

    }

    private handleDisplayMsg(msg: KernelDisplayData, cell: NotebookCell) {
        const output = msg.content as CellDisplayDataOutput;
        output.output_type = msg.msg_type as CellOutputType;
        delete output['transient']; // not supported yet
        cell.outputs.push(output);
        if (output.data['application/json'] && this.getCellType(cell) === 'poly') {
            output.metadata.polypheny = {result_variable: cell.metadata.polypheny.result_variable || '_'};
            this.onRenderPolyCell(cell.id);
        }
    }

    private handleUpdateDisplayMsg(msg: KernelUpdateDisplayData, cell: NotebookCell) {
        this.handleDisplayMsg(msg, cell); // not correctly supported yet
    }

    getCellType(cell: NotebookCell): CellType {
        if (cell.cell_type === 'code') {
            if (cell.metadata?.polypheny?.cell_type === 'poly') {
                return 'poly';
            }
        }
        return cell.cell_type;
    }

    private setCellType(cell: NotebookCell, type: CellType) {
        if (type === 'poly') {
            cell.cell_type = 'code';
            return;
        }
        cell.cell_type = type;
    }

    private addTextToOutputStream(lastOutput: CellStreamOutput, newText: string) {
        let text = lastOutput.text;
        if (Array.isArray(text)) {
            text = text.join('');
        } else if (!text) {
            text = '';
        }

        // Carriage return should 'overwrite' the last line -> enables dynamic progress bars
        const splitText = newText.split('\r');
        text += splitText[0];
        for (let i = 1; i < splitText.length; i++) {
            const line = splitText[i];
            const lastNewlineIdx = text.lastIndexOf('\n');
            if (line.charAt(0) === '\n' || lastNewlineIdx === -1) {
                text += line; // \r\n -> normal newline
                continue;
            }
            text = text.slice(0, lastNewlineIdx + 1) + line;
        }
        lastOutput.text = text;
    }

    private getEmptyCell(): NotebookCell {
        return {
            cell_type: 'code',
            id: uuid.v4(),
            metadata: {},
            source: [],
            execution_count: null,
            outputs: []
        };
    }

    private getCopyOfCell(jsonCell: string): NotebookCell {
        const copyCell = <NotebookCell>JSON.parse(jsonCell);
        copyCell.id = uuid.v4();
        return copyCell;
    }

    /**
     * Useful to set to signal to the user the UI is waiting for the kernel to restart.
     */
    setKernelStatusBusy() {
        this.kernelStatus = 'busy';
    }

    get cells() {
        return this.nb.cells;
    }

    get notebook() {
        return this.nb;
    }

    isExpansionAllowed(): boolean {
        return this.nb.metadata.polypheny?.expand_params;
    }

    setExpansionAllowed(allowed: boolean) {
        this.nb.metadata.polypheny.expand_params = allowed;
    }
}

export type CellType = 'code' | 'markdown' | 'raw' | 'poly';

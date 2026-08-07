import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import type { FileEntry } from '../filesystem/models';
import { PosixPermissions } from '../filesystem/models';
/** Simple single-text-field prompt, used for rename / new file / new folder. */
export declare class PromptDialogComponent {
    readonly modal: NgbActiveModal;
    title: string;
    value: string;
    constructor(modal: NgbActiveModal);
    save(): void;
}
/** Connect dialog: pick a saved bookmark or enter SFTP connection details manually. */
export declare class ConnectDialogComponent {
    readonly modal: NgbActiveModal;
    options: {
        host: string;
        port: number;
        username: string;
        password: string;
        privateKey: string;
    };
    constructor(modal: NgbActiveModal);
    connect(): void;
}
/** Linux-style rwx permission editor (Owner/Group/Other). */
export declare class PermissionDialogComponent {
    readonly modal: NgbActiveModal;
    entry: FileEntry;
    perm: PosixPermissions;
    constructor(modal: NgbActiveModal);
    ngOnInit(): void;
    get octal(): string;
    save(): void;
}
/** Read-only properties dialog (name/size/owner/group/dates/permissions). */
export declare class PropertiesDialogComponent {
    readonly modal: NgbActiveModal;
    entry: FileEntry;
    constructor(modal: NgbActiveModal);
    get octal(): string;
}
//# sourceMappingURL=dialogs.component.d.ts.map
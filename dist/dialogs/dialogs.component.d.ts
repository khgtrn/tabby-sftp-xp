import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import type { FileEntry, IFileSystem } from '../filesystem/models';
import { PosixPermissions } from '../filesystem/models';
/** Simple single-text-field prompt, used for rename / new file / new folder. */
export declare class PromptDialogComponent {
    readonly modal: NgbActiveModal;
    title: string;
    value: string;
    constructor(modal: NgbActiveModal);
    save(): void;
}
/** Create a symbolic link: both paths are full paths with live path suggestions. */
export declare class CreateSymlinkDialogComponent {
    readonly modal: NgbActiveModal;
    fs: IFileSystem;
    linkPath: string;
    targetPath: string;
    constructor(modal: NgbActiveModal);
    canCreate(): boolean;
    create(): void;
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

import { AppService, NotificationsService } from 'tabby-core';
import { BaseTerminalTabComponent, TerminalDecorator } from 'tabby-terminal';
/** Adds SFTP-XP immediately before Tabby's built-in SFTP button on connected SSH tabs. */
export declare class SftpXpTerminalDecorator extends TerminalDecorator {
    #private;
    private readonly app;
    private readonly notifications;
    constructor(app: AppService, notifications: NotificationsService);
    attach(terminal: BaseTerminalTabComponent<any>): void;
    detach(terminal: BaseTerminalTabComponent<any>): void;
}
//# sourceMappingURL=terminal-decorator.d.ts.map
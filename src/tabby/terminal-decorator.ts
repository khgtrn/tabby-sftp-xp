import { Injectable } from '@angular/core';
import { AppService, NotificationsService } from 'tabby-core';
import { BaseTerminalTabComponent, TerminalDecorator } from 'tabby-terminal';
import { getErrorMessage } from '../core/errors';
import { ExplorerTabComponent } from '../explorer/explorer-tab.component';
import { TabbySftpFileSystem, type TabbySftpSession } from '../sftp/tabby-sftp-filesystem';

/** Represents an active SSH tab with an open SSH session. */
type ActiveSshTab = BaseTerminalTabComponent<any> & {
  sshSession: { open: boolean; openSFTP(): Promise<TabbySftpSession> } | null;
};

/** Adds SFTP-XP immediately before Tabby's built-in SFTP button on connected SSH tabs. */
@Injectable()
export class SftpXpTerminalDecorator extends TerminalDecorator {
  #decoratedTerminals = new Map<
    BaseTerminalTabComponent<any>,
    {
      button: HTMLButtonElement;
      observer: MutationObserver;
      pollTimer: ReturnType<typeof setInterval>;
    }
  >();

  constructor(
    private readonly app: AppService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  attach(terminal: BaseTerminalTabComponent<any>): void {
    if (!this.#isSshTab(terminal)) {
      return;
    }

    // Get DOM element origin of tab terminal.
    // - `terminal.element` is Angular ElementRef.
    // - `nativeElement` is the actual HTML element.
    // - `as HTMLElement` helps TypeScript know that this object has APIs like `querySelectorAll()`.
    const host = terminal.element.nativeElement as HTMLElement;
    const button = this.#createButton(terminal);
    // Create a MutationObserver to watch for DOM changes inside the terminal.
    // Tabby's toolbar might not be rendered yet when attach() runs.
    // When Tabby adds or changes elements inside the terminal, the callback will be invoked.
    const observer = new MutationObserver((): void => this.#insertButton(terminal, host, button));
    observer.observe(host, { childList: true, subtree: true });
    // Try inserting the button every 500 ms.
    // his timer is a fallback mechanism because:
    // - SSH connection is asynchronous.
    // - MutationObserver only runs when the DOM changes.
    // - There are cases where SSH is connected but the DOM hasn't changed yet.
    // - Previous attempts might fail because sshSession or toolbar is not ready.
    const pollTimer = setInterval((): void => this.#insertButton(terminal, host, button), 500);

    this.#decoratedTerminals.set(terminal, { button, observer, pollTimer });
    this.#insertButton(terminal, host, button);
  }

  detach(terminal: BaseTerminalTabComponent<any>): void {
    const decorated = this.#decoratedTerminals.get(terminal);
    if (decorated) {
      // Stop observing DOM changes and clear the polling timer.
      decorated.observer.disconnect();
      // Clear the polling timer to stop trying to insert the button.
      clearInterval(decorated.pollTimer);
      // Remove the button from the DOM.
      decorated.button.remove();
      // Remove the terminal from the decorated map.
      this.#decoratedTerminals.delete(terminal);
    }

    super.detach(terminal);
  }

  /**
   * Create the SFTP-XP button for the given SSH tab.
   * Khi người dùng click, nó dùng kết nối SSH của terminal để mở tab SFTP-XP.
   * @param tab The active SSH tab.
   * @returns The created HTML button element.
   */
  #createButton(tab: ActiveSshTab): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm btn-link me-2 sftp-xp-toolbar-button';
    button.title = 'Open SFTP-XP in a new tab using this SSH connection';
    button.innerHTML = `<i class="far fa-folder-open"></i><span>SFTP-XP</span>`;
    button.addEventListener('click', (event): void => {
      event.preventDefault();
      event.stopPropagation();
      void this.#openExplorer(tab);
    });

    return button;
  }

  /**
   * Insert the SFTP-XP button into the terminal's toolbar, immediately before
   * Tabby's built-in SFTP button.
   * Checks if the button is already connected to the DOM and the SSH session is open.
   * @param tab
   * @param host
   * @param button
   * @returns
   */
  #insertButton(tab: ActiveSshTab, host: HTMLElement, button: HTMLButtonElement): void {
    if (button.isConnected || !tab.sshSession?.open || !tab.session?.open) {
      return;
    }

    // Get all buttons in the terminal toolbar
    const buttons = Array.from(host.querySelectorAll<HTMLButtonElement>('terminal-toolbar button'));
    // Find the default SFTP button by its text content.
    const defaultSftpButton = buttons.find(
      (button): boolean => button.textContent?.trim() === 'SFTP',
    );
    if (!defaultSftpButton?.parentElement) {
      return;
    }

    // insert button before the default SFTP button, so it appears to the left of it in the toolbar
    defaultSftpButton.parentElement.insertBefore(button, defaultSftpButton);
  }

  /**
   * Opens a new SFTP-XP tab using the given SSH tab's connection.
   * @param tab The active SSH tab.
   * @returns A promise that resolves when the SFTP-XP tab is opened, or rejects with an error.
   */
  async #openExplorer(tab: ActiveSshTab): Promise<void> {
    try {
      if (!tab.sshSession?.open) {
        throw new Error('SSH session is not connected');
      }

      const currentPath = (await tab.session?.getWorkingDirectory()) ?? '/';
      const session = await tab.sshSession.openSFTP();
      const remoteFs = new TabbySftpFileSystem(session, currentPath);
      this.app.openNewTabRaw({
        type: ExplorerTabComponent,
        inputs: { remoteFs },
      });
    } catch (error) {
      this.notifications.error(`Don't open SFTP-XP: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Check if the given terminal is an SSH tab by looking for host and user in its
   * profile options.
   * @param terminal The terminal tab to check.
   * @returns True if the terminal is an SSH tab, false otherwise.
   */
  #isSshTab(terminal: BaseTerminalTabComponent<any>): terminal is ActiveSshTab {
    // Duck-type via the profile, NOT `sshSession` - the session field stays `null` until
    // the SSH handshake completes, so checking it here would miss the tab at attach() time
    // (called when the tab is created, before it connects) and the decorator would never
    // set up the buttons at all, even after the connection succeeds.
    const options = (terminal as any).profile?.options;
    return !!options?.host && !!options?.user;
  }
}

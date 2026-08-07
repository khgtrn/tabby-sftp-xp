import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ConfigService } from 'tabby-core';

export type SftpXpTheme = 'light' | 'dark';

/** Keeps the persisted plugin theme in sync with the plugin UI and overlays. */
@Injectable({ providedIn: 'root' })
export class SftpXpThemeService implements OnDestroy {
  readonly #subscriptions = new Subscription();

  constructor(private readonly config: ConfigService) {
    this.#subscriptions.add(this.config.ready$.subscribe(() => this.applyConfiguredTheme()));
    this.#subscriptions.add(this.config.changed$.subscribe(() => this.applyConfiguredTheme()));
  }

  /** Emits after the persisted configuration changes. */
  get changed$(): Observable<void> {
    return this.config.changed$;
  }

  get current(): SftpXpTheme {
    return this.config.store?.sftpXp?.theme === 'light' ? 'light' : 'dark';
  }

  apply(theme: SftpXpTheme): void {
    document.documentElement.dataset.sftpXpTheme = theme;
  }

  applyConfiguredTheme(): void {
    const configured = this.config.store?.sftpXp?.theme;
    // Migrate the former 'default' value so the two-option select always has a valid value.
    if (configured !== 'light' && configured !== 'dark' && this.config.store?.sftpXp) {
      this.config.store.sftpXp.theme = 'dark';
      void this.config.save();
    }
    this.apply(this.current);
  }

  ngOnDestroy(): void {
    this.#subscriptions.unsubscribe();
  }
}

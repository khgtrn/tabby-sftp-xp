export type EditorThemeId = 'default' | 'dracula' | 'tokyo-night' | 'ayu-dark' | 'ayu-mirage' | 'one-dark-pro' | 'monokai' | 'nord';
export declare const EDITOR_THEME_OPTIONS: ReadonlyArray<{
    value: EditorThemeId;
    label: string;
}>;
export declare function registerEditorThemes(monaco: any): void;
export declare function resolveEditorTheme(theme: EditorThemeId, appTheme: 'light' | 'dark'): string;

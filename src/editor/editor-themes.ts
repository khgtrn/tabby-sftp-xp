export type EditorThemeId =
  | 'default' | 'dracula' | 'tokyo-night' | 'ayu-dark' | 'ayu-mirage'
  | 'one-dark-pro' | 'monokai' | 'nord';

export const EDITOR_THEME_OPTIONS: ReadonlyArray<{ value: EditorThemeId; label: string }> = [
  { value: 'default', label: 'Default' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'tokyo-night', label: 'Tokyo Night' },
  { value: 'ayu-dark', label: 'Ayu Dark' },
  { value: 'ayu-mirage', label: 'Ayu Mirage' },
  { value: 'one-dark-pro', label: 'One Dark Pro' },
  { value: 'monokai', label: 'Monokai' },
  { value: 'nord', label: 'Nord' },
];

function darkTheme(background: string, foreground: string, comment: string, keyword: string, string: string, type: string): any {
  const hex = (value: string): string => value.replace('#', '');
  return {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'comment', foreground: hex(comment), fontStyle: 'italic' },
      { token: 'keyword', foreground: hex(keyword) },
      { token: 'string', foreground: hex(string) },
      { token: 'number', foreground: hex(keyword) },
      { token: 'type', foreground: hex(type) },
      { token: 'identifier', foreground: hex(foreground) },
    ],
    colors: {
      'editor.background': background, 'editor.foreground': foreground,
      'editorLineNumber.foreground': comment, 'editorCursor.foreground': foreground,
      'editor.selectionBackground': `${type}55`,
      'editor.inactiveSelectionBackground': `${type}2f`,
    },
  };
}

const THEMES: Record<Exclude<EditorThemeId, 'default'>, any> = {
  dracula: darkTheme('#282a36', '#f8f8f2', '#6272a4', '#ff79c6', '#f1fa8c', '#8be9fd'),
  'tokyo-night': darkTheme('#1a1b26', '#c0caf5', '#565f89', '#bb9af7', '#9ece6a', '#7dcfff'),
  'ayu-dark': darkTheme('#0b0e14', '#bfbdb6', '#5c6773', '#ff8f40', '#aad94c', '#39bae6'),
  'ayu-mirage': darkTheme('#1f2430', '#cccac2', '#5c6773', '#ffad66', '#d5ff80', '#73d0ff'),
  'one-dark-pro': darkTheme('#282c34', '#abb2bf', '#5c6370', '#c678dd', '#98c379', '#56b6c2'),
  monokai: darkTheme('#272822', '#f8f8f2', '#75715e', '#f92672', '#e6db74', '#66d9ef'),
  nord: darkTheme('#2e3440', '#d8dee9', '#616e88', '#81a1c1', '#a3be8c', '#88c0d0'),
};

export function registerEditorThemes(monaco: any): void {
  for (const [name, definition] of Object.entries(THEMES)) {
    monaco.editor.defineTheme(`sftp-xp-${name}`, definition);
  }
}

export function resolveEditorTheme(theme: EditorThemeId, appTheme: 'light' | 'dark'): string {
  return theme === 'default' ? (appTheme === 'dark' ? 'vs-dark' : 'vs') : `sftp-xp-${theme}`;
}

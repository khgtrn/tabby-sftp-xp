export interface Bookmark {
    id: string;
    name: string;
    path: string;
    /** Which panel this bookmark applies to; `both` shows it in local and remote panels. */
    side: 'local' | 'remote' | 'both';
}
//# sourceMappingURL=bookmark.model.d.ts.map
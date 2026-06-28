//! replacer-util v1.6.5 ~~ https://github.com/center-key/replacer-util ~~ MIT License

export type Settings = {
    cd: string | null;
    concat: string | null;
    content: string | null;
    exclude: string | null;
    extensions: string[];
    filename: string | null;
    find: string | null;
    header: string | null;
    nonRecursive: boolean;
    noSourceMap: boolean;
    regex: RegExp | null;
    rename: string | null;
    replacement: string | null;
    templatingOn: boolean;
    titleSort: boolean;
    virtualInput: boolean;
};
export type Results = {
    source: string;
    target: string;
    count: number;
    concat: boolean;
    virtual: boolean;
    duration: number;
    files: {
        origin: string;
        dest: string;
        originPath: string;
        destPath: string;
    }[];
};
export type ReporterSettings = {
    summaryOnly: boolean;
};
declare const replacer: {
    version: string;
    assertOk(ok: unknown, message: string | null): void;
    transform(sourceFolder: string, targetFolder: string, options?: Partial<Settings>): Results;
    reporter(results: Results, options?: Partial<ReporterSettings>): Results;
    cli(): void;
};
export { replacer };

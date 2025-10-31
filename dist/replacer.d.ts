//! replacer-util v1.4.2 ~~ https://github.com/center-key/replacer-util ~~ MIT License

export type Settings = {
    cd: string | null;
    concat: string | null;
    content: string | null;
    exclude: string | null;
    extensions: string[];
    filename: string | null;
    find: string | null;
    header: string | null;
    noSourceMap: boolean;
    regex: RegExp | null;
    rename: string | null;
    replacement: string | null;
    templatingOn: boolean;
    titleSort: boolean;
};
export type Results = {
    source: string;
    target: string;
    count: number;
    duration: number;
    files: {
        origin: string;
        dest: string;
    }[];
};
export type ResultsFile = Results['files'][0];
export type ReporterSettings = {
    summaryOnly: boolean;
};
declare const replacer: {
    transform(sourceFolder: string, targetFolder: string, options?: Partial<Settings>): Results;
    reporter(results: Results, options?: Partial<ReporterSettings>): Results;
};
export { replacer };

//! files-replace v0.0.3 ~~ https://github.com/center-key/files-replace ~~ MIT License

export declare type Settings = {
    cd: string;
    extensions: string[];
    filename: string | null;
    find: string | null;
    replacement: string | null;
    pkg: false;
};
export declare type Options = Partial<Settings>;
export declare type Results = {
    source: string;
    target: string;
    count: number;
    duration: number;
    files: {
        origin: string;
        dest: string;
    }[];
};
export declare type ResultsFile = Results['files'][0];
declare const filesReplace: {
    transform(sourceFolder: string, targetFolder: string, options?: Options): Results;
};
export { filesReplace };

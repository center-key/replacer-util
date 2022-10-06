//! files-replace v0.0.2 ~~ https://github.com/center-key/files-replace ~~ MIT License

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "istextorbinary", "liquidjs", "fs", "glob", "path", "slash"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.filesReplace = void 0;
    const istextorbinary_1 = require("istextorbinary");
    const liquidjs_1 = require("liquidjs");
    const fs_1 = __importDefault(require("fs"));
    const glob_1 = __importDefault(require("glob"));
    const path_1 = __importDefault(require("path"));
    const slash_1 = __importDefault(require("slash"));
    const util = {
        normalizeFolder(folderPath) {
            return !folderPath ? '' : (0, slash_1.default)(path_1.default.normalize(folderPath)).replace(/\/$/, '');
        },
        isTextFile(filename) {
            return fs_1.default.statSync(filename).isFile() && !(0, istextorbinary_1.isBinary)(filename);
        },
        readPackageJson() {
            return JSON.parse(fs_1.default.readFileSync('package.json', 'utf-8'));
        },
    };
    const filesReplace = {
        transform(sourceFolder, targetFolder, options) {
            const defaults = {
                cd: null,
                fileExtensions: [],
                find: null,
                replacement: null,
                usePackageJson: false,
            };
            const settings = { ...defaults, ...options };
            const startTime = Date.now();
            const startFolder = settings.cd ? util.normalizeFolder(settings.cd) + '/' : '';
            const source = util.normalizeFolder(startFolder + sourceFolder);
            const target = util.normalizeFolder(startFolder + targetFolder);
            const missingFind = !settings.find && !!settings.replacement;
            if (targetFolder)
                fs_1.default.mkdirSync(target, { recursive: true });
            const errorMessage = !sourceFolder ? 'Must specify the source folder path.' :
                !targetFolder ? 'Must specify the target folder path.' :
                    !fs_1.default.existsSync(source) ? 'Source folder does not exist: ' + source :
                        !fs_1.default.existsSync(target) ? 'Target folder cannot be created: ' + target :
                            !fs_1.default.statSync(source).isDirectory() ? 'Source is not a folder: ' + source :
                                !fs_1.default.statSync(target).isDirectory() ? 'Target is not a folder: ' + target :
                                    missingFind ? 'Must specify search text with --find' :
                                        null;
            if (errorMessage)
                throw Error('[files-replace] ' + errorMessage);
            const extFiles = settings.fileExtensions.map(ext => glob_1.default.sync(source + '/**/*' + ext)).flat().sort();
            const inputFiles = settings.fileExtensions.length ? extFiles : glob_1.default.sync(source + '/**/*');
            const textFiles = inputFiles.filter(util.isTextFile).map(file => (0, slash_1.default)(file));
            const files = textFiles.map(file => ({ origin: file, dest: target + '/' + file.substring(source.length + 1) }));
            const engine = new liquidjs_1.Liquid();
            const pkg = settings.usePackageJson ? util.readPackageJson() : null;
            const processFile = (file) => {
                const value = settings.replacement ?? '';
                const text = fs_1.default.readFileSync(file.origin, 'utf-8');
                const text2 = settings.find ? text.replaceAll(settings.find, value) : text;
                const final = settings.usePackageJson ? engine.parseAndRenderSync(text2, { pkg }) : text2;
                fs_1.default.mkdirSync(path_1.default.dirname(file.dest), { recursive: true });
                fs_1.default.writeFileSync(file.dest, final);
            };
            files.map(processFile);
            const relativePaths = (file) => ({
                origin: file.origin.substring(source.length + 1),
                dest: file.dest.substring(target.length + 1),
            });
            return {
                source: source,
                target: target,
                count: files.length,
                duration: Date.now() - startTime,
                files: files.map(relativePaths),
            };
        },
    };
    exports.filesReplace = filesReplace;
});

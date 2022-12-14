//! replacer-util v0.3.5 ~~ https://github.com/center-key/replacer-util ~~ MIT License

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
    exports.replacer = void 0;
    const istextorbinary_1 = require("istextorbinary");
    const liquidjs_1 = require("liquidjs");
    const fs_1 = __importDefault(require("fs"));
    const glob_1 = __importDefault(require("glob"));
    const path_1 = __importDefault(require("path"));
    const slash_1 = __importDefault(require("slash"));
    const task = {
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
    const replacer = {
        transform(sourceFolder, targetFolder, options) {
            const defaults = {
                cd: null,
                concat: null,
                extensions: [],
                find: null,
                noSourceMap: false,
                regex: null,
                replacement: null,
                pkg: false,
            };
            const settings = { ...defaults, ...options };
            const startTime = Date.now();
            const startFolder = settings.cd ? task.normalizeFolder(settings.cd) + '/' : '';
            const source = task.normalizeFolder(startFolder + sourceFolder);
            const target = task.normalizeFolder(startFolder + targetFolder);
            const concatFile = settings.concat ? path_1.default.join(target, settings.concat) : null;
            const renameFile = settings.rename ? path_1.default.join(target, settings.rename) : null;
            const missingFind = !settings.find && !settings.regex && !!settings.replacement;
            if (targetFolder)
                fs_1.default.mkdirSync(target, { recursive: true });
            const errorMessage = !sourceFolder ? 'Must specify the source folder path.' :
                !targetFolder ? 'Must specify the target folder path.' :
                    !fs_1.default.existsSync(source) ? 'Source folder does not exist: ' + source :
                        !fs_1.default.existsSync(target) ? 'Target folder cannot be created: ' + target :
                            !fs_1.default.statSync(source).isDirectory() ? 'Source is not a folder: ' + source :
                                !fs_1.default.statSync(target).isDirectory() ? 'Target is not a folder: ' + target :
                                    missingFind ? 'Must specify search text with --find or --regex' :
                                        null;
            if (errorMessage)
                throw Error('[replacer-util] ' + errorMessage);
            const resultsFile = (file) => ({
                origin: file,
                dest: concatFile ?? renameFile ?? target + '/' + file.substring(source.length + 1),
            });
            const exts = settings.extensions.length ? settings.extensions : [''];
            const globFiles = () => exts.map(ext => glob_1.default.sync(source + '/**/*' + ext)).flat().sort();
            const filesRaw = settings.filename ? [source + '/' + settings.filename] : globFiles();
            const files = filesRaw.filter(task.isTextFile).map(file => (0, slash_1.default)(file)).map(resultsFile);
            const pkg = settings.pkg ? task.readPackageJson() : null;
            const engine = new liquidjs_1.Liquid({ globals: { pkg } });
            const versionFormatter = (numIds) => (str) => str.replace(/[^0-9]*/, '').split('.').slice(0, numIds).join('.');
            engine.registerFilter('version', versionFormatter(3));
            engine.registerFilter('minor-version', versionFormatter(2));
            engine.registerFilter('major-version', versionFormatter(1));
            const normalizeEol = /\r/g;
            const normalizeEof = /\s*$(?!\n)/;
            const sourceMapLine = /^\/.#\ssourceMappingURL=.*\n/gm;
            const header = settings.header ? settings.header + '\n' : '';
            const rep = settings.replacement ?? '';
            const getFileInfo = (origin) => {
                const parsedPath = path_1.default.parse(origin);
                const dir = (0, slash_1.default)(parsedPath.dir);
                const filePath = dir + '/' + (0, slash_1.default)(parsedPath.base);
                return { file: { ...parsedPath, dir: dir, path: filePath } };
            };
            const processFile = (file, index) => {
                const fileInfo = getFileInfo(file.origin);
                const render = (text) => engine.parseAndRenderSync(text, fileInfo);
                const append = settings.concat && index > 0;
                const altText = settings.content ? render(settings.content) : null;
                const content = render(header) + (altText ?? fs_1.default.readFileSync(file.origin, 'utf-8'));
                const newStr = settings.pkg ? render(rep) : rep;
                const out1 = settings.pkg ? render(content) : content;
                const out2 = out1.replace(normalizeEol, '').replace(normalizeEof, '\n');
                const out3 = settings.find ? out2.replaceAll(settings.find, newStr) : out2;
                const out4 = settings.regex ? out3.replace(settings.regex, newStr) : out3;
                const out5 = settings.noSourceMap ? out4.replace(sourceMapLine, '') : out4;
                const final = append && settings.header ? '\n' + out5 : out5;
                fs_1.default.mkdirSync(path_1.default.dirname(file.dest), { recursive: true });
                return append ? fs_1.default.appendFileSync(file.dest, final) : fs_1.default.writeFileSync(file.dest, final);
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
    exports.replacer = replacer;
});

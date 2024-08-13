//! replacer-util v1.3.2 ~~ https://github.com/center-key/replacer-util ~~ MIT License

import { globSync } from 'glob';
import { isBinary } from 'istextorbinary';
import { Liquid } from 'liquidjs';
import chalk from 'chalk';
import fs from 'fs';
import log from 'fancy-log';
import path from 'path';
import slash from 'slash';
const task = {
    normalizeFolder(folderPath) {
        return !folderPath ? '' : slash(path.normalize(folderPath)).replace(/\/$/, '');
    },
    isTextFile(filename) {
        return fs.statSync(filename).isFile() && !isBinary(filename);
    },
    readPackageJson() {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        const fixHiddenKeys = (pkgObj) => {
            const unhide = (key) => {
                const newKey = key.replace(/[@./]/g, '-');
                if (!pkgObj[newKey])
                    pkgObj[newKey] = pkgObj[key];
            };
            Object.keys(pkgObj).forEach(unhide);
        };
        if (pkg.dependencies)
            fixHiddenKeys(pkg.dependencies);
        if (pkg.devDependencies)
            fixHiddenKeys(pkg.devDependencies);
        return pkg;
    },
};
const replacer = {
    transform(sourceFolder, targetFolder, options) {
        const defaults = {
            cd: null,
            concat: null,
            exclude: null,
            extensions: [],
            find: null,
            noSourceMap: false,
            regex: null,
            replacement: null,
            templatingOn: true,
        };
        const settings = { ...defaults, ...options };
        const startTime = Date.now();
        const startFolder = settings.cd ? task.normalizeFolder(settings.cd) + '/' : '';
        const source = task.normalizeFolder(startFolder + sourceFolder);
        const target = task.normalizeFolder(startFolder + targetFolder);
        const concatFile = settings.concat ? path.join(target, settings.concat) : null;
        const missingFind = !settings.find && !settings.regex && !!settings.replacement;
        if (targetFolder)
            fs.mkdirSync(target, { recursive: true });
        const errorMessage = !sourceFolder ? 'Must specify the source folder path.' :
            !targetFolder ? 'Must specify the target folder path.' :
                !fs.existsSync(source) ? 'Source folder does not exist: ' + source :
                    !fs.existsSync(target) ? 'Target folder cannot be created: ' + target :
                        !fs.statSync(source).isDirectory() ? 'Source is not a folder: ' + source :
                            !fs.statSync(target).isDirectory() ? 'Target is not a folder: ' + target :
                                missingFind ? 'Must specify search text with --find or --regex' :
                                    null;
        if (errorMessage)
            throw new Error('[replacer-util] ' + errorMessage);
        const globFiles = () => exts.map(ext => globSync(source + '/**/*' + ext)).flat().sort();
        const keep = (file) => !settings.exclude || !file.includes(settings.exclude);
        const relativeFolders = (file) => file.substring(source.length, file.length - path.basename(file).length);
        const renameFile = (file) => settings.rename ? target + relativeFolders(file) + settings.rename : null;
        const getFileRoute = (file) => ({
            origin: file,
            dest: concatFile ?? renameFile(file) ?? target + '/' + file.substring(source.length + 1),
        });
        const exts = settings.extensions.length ? settings.extensions : [''];
        const filesRaw = settings.filename ? [source + '/' + settings.filename] : globFiles();
        const filtered = filesRaw.filter(task.isTextFile).filter(keep);
        const fileRoutes = filtered.map(file => slash(file)).map(getFileRoute);
        const pkg = task.readPackageJson();
        const normalizeEol = /\r/g;
        const normalizeEof = /\s*$(?!\n)/;
        const sourceMapLine = /^\/.#\ssourceMappingURL=.*\n/gm;
        const header = settings.header ? settings.header + '\n' : '';
        const rep = settings.replacement ?? '';
        const getFileInfo = (origin) => {
            const parsedPath = path.parse(origin);
            const dir = slash(parsedPath.dir);
            const filePath = dir + '/' + slash(parsedPath.base);
            const folder = path.basename(dir);
            const date = fs.statSync(origin).mtime;
            const dateFormat = { day: 'numeric', month: 'long', year: 'numeric' };
            const modified = date.toLocaleString([], dateFormat);
            const timestamp = date.toISOString();
            return { ...parsedPath, dir, folder, path: filePath, date, modified, timestamp };
        };
        const getWebRoot = (origin) => {
            const depth = origin.substring(source.length).split('/').length - 2;
            return depth === 0 ? '.' : '..' + '/..'.repeat(depth - 1);
        };
        const createEngine = (file) => {
            const globals = {
                package: pkg,
                file: getFileInfo(file.origin),
                webRoot: getWebRoot(file.origin),
            };
            const engine = new Liquid({ globals });
            const versionFormatter = (numIds) => (str) => str.replace(/[^0-9]*/, '').split('.').slice(0, numIds).join('.');
            engine.registerFilter('version', versionFormatter(3));
            engine.registerFilter('minor-version', versionFormatter(2));
            engine.registerFilter('major-version', versionFormatter(1));
            return engine;
        };
        const extractPageVars = (engine, file) => {
            const tags = engine.parseFileSync(file);
            const toPair = (tag) => [tag.key, tag.value.initial.postfix[0]?.content];
            const tagPairs = tags.filter(tag => tag.name === 'assign').map(toPair);
            return Object.fromEntries(tagPairs);
        };
        const processFile = (file, index) => {
            const engine = createEngine(file);
            const pageVars = settings.content ? extractPageVars(engine, file.origin) : {};
            const render = (text) => engine.parseAndRenderSync(text, pageVars);
            const append = settings.concat && index > 0;
            const altText = settings.content ? render(settings.content) : null;
            const text = altText ?? fs.readFileSync(file.origin, 'utf-8');
            const content = render(header) + text;
            const newStr = render(rep);
            const out1 = settings.templatingOn ? render(content) : content;
            const out2 = out1.replace(normalizeEol, '').replace(normalizeEof, '\n');
            const out3 = settings.find ? out2.replaceAll(settings.find, newStr) : out2;
            const out4 = settings.regex ? out3.replace(settings.regex, newStr) : out3;
            const out5 = settings.noSourceMap ? out4.replace(sourceMapLine, '') : out4;
            const out6 = out5.trimStart();
            const final = append && settings.header ? '\n' + out6 : out6;
            fs.mkdirSync(path.dirname(file.dest), { recursive: true });
            return append ? fs.appendFileSync(file.dest, final) : fs.writeFileSync(file.dest, final);
        };
        fileRoutes.map(processFile);
        const relativePaths = (file) => ({
            origin: file.origin.substring(source.length + 1),
            dest: file.dest.substring(target.length + 1),
        });
        return {
            source: source,
            target: target,
            count: fileRoutes.length,
            duration: Date.now() - startTime,
            files: fileRoutes.map(relativePaths),
        };
    },
    reporter(results, options) {
        const defaults = {
            summaryOnly: false,
        };
        const settings = { ...defaults, ...options };
        const name = chalk.gray('replacer');
        const source = chalk.blue.bold(results.source);
        const target = chalk.magenta(results.target);
        const arrow = { big: chalk.gray.bold(' ⟹  '), little: chalk.gray.bold('→') };
        const infoColor = results.count ? chalk.white : chalk.red.bold;
        const info = infoColor(`(files: ${results.count}, ${results.duration}ms)`);
        log(name, source, arrow.big, target, info);
        const logFile = (file) => log(name, chalk.white(file.origin), arrow.little, chalk.green(file.dest));
        if (!settings.summaryOnly)
            results.files.forEach(logFile);
        return results;
    },
};
export { replacer };

//! replacer-util v1.4.5 ~~ https://github.com/center-key/replacer-util ~~ MIT License

import { cliArgvUtil } from 'cli-argv-util';
import { EOL } from 'node:os';
import { globSync } from 'glob';
import { isBinary } from 'istextorbinary';
import { Liquid } from 'liquidjs';
import chalk from 'chalk';
import fs from 'fs';
import log from 'fancy-log';
import path from 'path';
import slash from 'slash';
const task = {
    cleanPath(folder) {
        const string = typeof folder === 'string' ? folder : '';
        const trailingSlash = /\/$/;
        return slash(path.normalize(string)).trim().replace(trailingSlash, '');
    },
    isTextFile(filename) {
        return fs.statSync(filename).isFile() && !isBinary(filename);
    },
    readPackageJson() {
        const pkgExists = fs.existsSync('package.json');
        const pkg = pkgExists ? JSON.parse(fs.readFileSync('package.json', 'utf-8')) : null;
        const fixHiddenKeys = (pkgObj) => {
            const unhide = (key) => {
                const newKey = key.replace(/[@./]/g, '-');
                if (!pkgObj[newKey])
                    pkgObj[newKey] = pkgObj[key];
            };
            Object.keys(pkgObj).forEach(unhide);
        };
        if (pkg?.dependencies)
            fixHiddenKeys(pkg.dependencies);
        if (pkg?.devDependencies)
            fixHiddenKeys(pkg.devDependencies);
        return pkg;
    },
};
const replacer = {
    assert(ok, message) {
        if (!ok)
            throw new Error(`[replacer-util] ${message}`);
    },
    cli() {
        const validFlags = ['cd', 'concat', 'content', 'exclude', 'ext', 'find', 'header',
            'no-liquid', 'no-source-map', 'note', 'quiet', 'regex', 'rename', 'replacement',
            'summary', 'title-sort'];
        const cli = cliArgvUtil.parse(validFlags);
        const source = cli.params[0];
        const target = cli.params[1];
        const pkg = task.readPackageJson();
        const escapers = [
            [/{{apos}}/g, "'"],
            [/{{bang}}/g, '!'],
            [/{{close-curly}}/g, '}'],
            [/{{equals}}/g, '='],
            [/{{gt}}/g, '>'],
            [/{{lt}}/g, '<'],
            [/{{open-curly}}/g, '{'],
            [/{{pipe}}/g, '|'],
            [/{{quote}}/g, '"'],
            [/{{semi}}/g, ';'],
            [/{{space}}/g, ' '],
        ];
        const badRegex = cli.flagOn.regex && !/^\/.*\/[a-z]*$/.test(cli.flagMap.regex);
        const error = cli.invalidFlag ? cli.invalidFlagMsg :
            !source ? 'Missing source folder.' :
                !target ? 'Missing target folder.' :
                    badRegex ? 'Regex must be enclosed in slashes.' :
                        cli.paramCount > 2 ? 'Extraneous parameter: ' + cli.params[2] :
                            null;
        replacer.assert(!error, error);
        const sourceFile = path.join(cli.flagMap.cd ?? '', source);
        const isFile = fs.existsSync(sourceFile) && fs.statSync(sourceFile).isFile();
        const sourceFolder = isFile ? path.dirname(source) : source;
        const regex = cli.flagMap.regex?.substring(1, cli.flagMap.regex.lastIndexOf('/'));
        const regexCodes = cli.flagMap.regex?.replace(/.*\//, '');
        const macros = pkg?.replacerConfig?.macros;
        const escapeChar = (param, escaper) => param.replace(escaper[0], escaper[1]);
        const macroSub = (param) => {
            const macroName = param.match(/^{{macro:(.*)}}$/)?.[1];
            const macroValue = macros?.[macroName];
            const noMacro = macroName && !macroValue;
            replacer.assert(!noMacro, `Macro "${macroName}" used but not defined in package.json`);
            return macroName ? macroValue : param;
        };
        const escape = (param) => !param ? null : escapers.reduce(escapeChar, macroSub(param));
        const options = {
            cd: cli.flagMap.cd ?? null,
            concat: cli.flagMap.concat ?? null,
            content: escape(cli.flagMap.content),
            exclude: cli.flagMap.exclude ?? null,
            extensions: cli.flagMap.ext?.split(',') ?? [],
            filename: isFile ? path.basename(source) : null,
            find: escape(cli.flagMap.find),
            header: escape(cli.flagMap.header),
            noSourceMap: cli.flagOn.noSourceMap,
            regex: cli.flagMap.regex ? new RegExp(escape(regex), regexCodes) : null,
            rename: cli.flagMap.rename ?? null,
            replacement: escape(cli.flagMap.replacement),
            templatingOn: !cli.flagOn.noLiquid,
            titleSort: cli.flagOn.titleSort,
        };
        const results = replacer.transform(sourceFolder, target, options);
        if (!cli.flagOn.quiet)
            replacer.reporter(results, { summaryOnly: cli.flagOn.summary });
    },
    transform(sourceFolder, targetFolder, options) {
        const defaults = {
            cd: null,
            concat: null,
            content: null,
            exclude: null,
            extensions: [],
            filename: null,
            find: null,
            header: null,
            noSourceMap: false,
            regex: null,
            rename: null,
            replacement: null,
            templatingOn: true,
            titleSort: false,
        };
        const settings = { ...defaults, ...options };
        const startTime = Date.now();
        const startFolder = settings.cd ? task.cleanPath(settings.cd) + '/' : '';
        const source = task.cleanPath(startFolder + sourceFolder);
        const target = task.cleanPath(startFolder + targetFolder);
        const concatFile = settings.concat ? path.join(target, settings.concat) : null;
        const missingFind = !settings.find && !settings.regex && !!settings.replacement;
        const invalidSort = settings.titleSort && !settings.concat;
        if (targetFolder)
            fs.mkdirSync(target, { recursive: true });
        const error = !sourceFolder ? 'Must specify the source folder path.' :
            !targetFolder ? 'Must specify the target folder path.' :
                !fs.existsSync(source) ? 'Source folder does not exist: ' + source :
                    !fs.existsSync(target) ? 'Target folder cannot be created: ' + target :
                        !fs.statSync(source).isDirectory() ? 'Source is not a folder: ' + source :
                            !fs.statSync(target).isDirectory() ? 'Target is not a folder: ' + target :
                                missingFind ? 'Must specify search text with --find or --regex' :
                                    invalidSort ? 'Use of --titleSort requires --concat' :
                                        null;
        replacer.assert(!error, error);
        const getNewFilename = (file) => {
            const baseNameLoc = () => file.length - path.basename(file).length;
            const relativePath = () => file.substring(source.length, baseNameLoc());
            const newFilename = () => target + relativePath() + settings.rename;
            return settings.rename ? newFilename() : null;
        };
        const outputFilename = (file) => target + '/' + file.substring(source.length + 1);
        const getFileRoute = (file) => ({
            origin: file,
            dest: concatFile ?? getNewFilename(file) ?? outputFilename(file),
        });
        const titleCase = () => {
            const psuedo = /\/index\.[a-z]*$/;
            const leadingArticle = /^(a|an|the)[- _]/;
            const toTitle = (filename) => path.basename(filename.replace(psuedo, '')).toLowerCase().replace(leadingArticle, '');
            return (a, b) => toTitle(a).localeCompare(toTitle(b));
        };
        const readPaths = (ext) => globSync(source + '/**/*' + ext).map(slash);
        const comparator = settings.titleSort ? titleCase() : undefined;
        const getFiles = () => exts.map(readPaths).flat().sort(comparator);
        const keep = (file) => !settings.exclude || !file.includes(settings.exclude);
        const exts = settings.extensions.length ? settings.extensions : [''];
        const filesRaw = settings.filename ? [source + '/' + settings.filename] : getFiles();
        const filtered = filesRaw.filter(task.isTextFile).filter(keep);
        const fileRoutes = filtered.map(file => slash(file)).map(getFileRoute);
        const pkg = task.readPackageJson();
        const sourceMapLine = /^\/.#\ssourceMappingURL=.*\r?\n/gm;
        const header = settings.header ? settings.header + EOL : '';
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
        const eofNewline = (text) => text.endsWith(EOL) ? text : text + EOL;
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
            const out2 = settings.find ? out1.replaceAll(settings.find, newStr) : out1;
            const out3 = settings.regex ? out2.replace(settings.regex, newStr) : out2;
            const out4 = settings.noSourceMap ? out3.replace(sourceMapLine, '') : out3;
            const out5 = eofNewline(out4.trimStart());
            const final = append && settings.header ? EOL + out5 : out5;
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

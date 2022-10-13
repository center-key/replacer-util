//! replacer-util v0.2.2 ~~ https://github.com/center-key/replacer-util ~~ MIT License

import { isBinary } from 'istextorbinary';
import { Liquid } from 'liquidjs';
import fs from 'fs';
import glob from 'glob';
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
        return JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    },
};
const replacer = {
    transform(sourceFolder, targetFolder, options) {
        const defaults = {
            cd: null,
            concat: null,
            extensions: [],
            find: null,
            regex: null,
            replacement: null,
            pkg: false,
        };
        const settings = { ...defaults, ...options };
        const startTime = Date.now();
        const startFolder = settings.cd ? task.normalizeFolder(settings.cd) + '/' : '';
        const source = task.normalizeFolder(startFolder + sourceFolder);
        const target = task.normalizeFolder(startFolder + targetFolder);
        const concatFile = settings.concat ? path.join(target, settings.concat) : null;
        const renameFile = settings.rename ? path.join(target, settings.rename) : null;
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
            throw Error('[replacer-util] ' + errorMessage);
        const resultsFile = (file) => ({
            origin: file,
            dest: concatFile ?? renameFile ?? target + '/' + file.substring(source.length + 1),
        });
        const exts = settings.extensions.length ? settings.extensions : [''];
        const globFiles = () => exts.map(ext => glob.sync(source + '/**/*' + ext)).flat().sort();
        const filesRaw = settings.filename ? [source + '/' + settings.filename] : globFiles();
        const files = filesRaw.filter(task.isTextFile).map(file => slash(file)).map(resultsFile);
        const engine = new Liquid();
        const versionFormatter = (numIds) => (str) => str.replace(/[^0-9]*/, '').split('.').slice(0, numIds).join('.');
        engine.registerFilter('version', versionFormatter(3));
        engine.registerFilter('minor-version', versionFormatter(2));
        engine.registerFilter('major-version', versionFormatter(1));
        const pkg = settings.pkg ? task.readPackageJson() : null;
        const normalizeEol = /\r/g;
        const normalizeEof = /\s*$(?!\n)/;
        const processFile = (file, index) => {
            const content = fs.readFileSync(file.origin, 'utf-8');
            const newStr = settings.replacement ?? '';
            const out1 = content.replace(normalizeEol, '').replace(normalizeEof, '\n');
            const out2 = settings.find ? out1.replaceAll(settings.find, newStr) : out1;
            const out3 = settings.regex ? out2.replace(settings.regex, newStr) : out2;
            const final = settings.pkg ? engine.parseAndRenderSync(out3, { pkg }) : out3;
            fs.mkdirSync(path.dirname(file.dest), { recursive: true });
            if (settings.concat && index > 0)
                fs.appendFileSync(file.dest, final);
            else
                fs.writeFileSync(file.dest, final);
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
export { replacer };

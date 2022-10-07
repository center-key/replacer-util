//! files-replace v0.0.3 ~~ https://github.com/center-key/files-replace ~~ MIT License

import { isBinary } from 'istextorbinary';
import { Liquid } from 'liquidjs';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import slash from 'slash';
const util = {
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
const filesReplace = {
    transform(sourceFolder, targetFolder, options) {
        const defaults = {
            cd: null,
            extensions: [],
            find: null,
            replacement: null,
            pkg: false,
        };
        const settings = { ...defaults, ...options };
        const startTime = Date.now();
        const startFolder = settings.cd ? util.normalizeFolder(settings.cd) + '/' : '';
        const source = util.normalizeFolder(startFolder + sourceFolder);
        const target = util.normalizeFolder(startFolder + targetFolder);
        const missingFind = !settings.find && !!settings.replacement;
        if (targetFolder)
            fs.mkdirSync(target, { recursive: true });
        const errorMessage = !sourceFolder ? 'Must specify the source folder path.' :
            !targetFolder ? 'Must specify the target folder path.' :
                !fs.existsSync(source) ? 'Source folder does not exist: ' + source :
                    !fs.existsSync(target) ? 'Target folder cannot be created: ' + target :
                        !fs.statSync(source).isDirectory() ? 'Source is not a folder: ' + source :
                            !fs.statSync(target).isDirectory() ? 'Target is not a folder: ' + target :
                                missingFind ? 'Must specify search text with --find' :
                                    null;
        if (errorMessage)
            throw Error('[files-replace] ' + errorMessage);
        const resultsFile = (file) => ({ origin: file, dest: target + '/' + file.substring(source.length + 1) });
        const exts = settings.extensions.length ? settings.extensions : [''];
        const globFiles = () => exts.map(ext => glob.sync(source + '/**/*' + ext)).flat().sort();
        const filesRaw = settings.filename ? [source + '/' + settings.filename] : globFiles();
        const files = filesRaw.filter(util.isTextFile).map(file => slash(file)).map(resultsFile);
        const engine = new Liquid();
        const versionFormatter = (numIds) => (str) => str.replace(/[^0-9]*/, '').split('.').slice(0, numIds).join('.');
        engine.registerFilter('version', versionFormatter(3));
        engine.registerFilter('version-minor', versionFormatter(2));
        engine.registerFilter('version-major', versionFormatter(1));
        const pkg = settings.pkg ? util.readPackageJson() : null;
        const processFile = (file) => {
            const newStr = settings.replacement ?? '';
            const text = fs.readFileSync(file.origin, 'utf-8');
            const updated = settings.find ? text.replaceAll(settings.find, newStr) : text;
            const final = settings.pkg ? engine.parseAndRenderSync(updated, { pkg }) : updated;
            fs.mkdirSync(path.dirname(file.dest), { recursive: true });
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
export { filesReplace };

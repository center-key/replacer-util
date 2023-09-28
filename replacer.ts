// replacer-util ~~ MIT License

// Imports
import { globSync } from 'glob';
import { isBinary } from 'istextorbinary';
import { Liquid } from 'liquidjs';
import chalk from 'chalk';
import fs    from 'fs';
import log   from 'fancy-log';
import path  from 'path';
import slash from 'slash';

// Types
export type Settings = {
   cd:          string | null,  //change working directory before starting search
   concat:      string | null,  //merge all files into one file in the target folder
   content:     string | null,  //string to be used instead of the input file contents
   exclude:     string | null,  //skip files containing the string in their path
   extensions:  string[],       //filter files by file extensions, example: ['.js', '.css']
   filename:    string | null,  //single file in the source folder to be processed
   find:        string | null,  //text to search for in the source input files
   header:      string | null,  //prepend a line of text to each file
   noSourceMap: boolean,        //remove all "sourceMappingURL" comments directives
   regex:       RegExp | null,  //pattern to search for in the source input files
   rename:      string | null,  //new output filename
   replacement: string | null,  //text to insert into the target output files
   };
export type Results = {
   source:   string,  //path of origination folder
   target:   string,  //path of destination folder
   count:    number,  //number of files copied
   duration: number,  //execution time in milliseconds
   files:    { origin: string, dest: string }[],  //list of processed files
   };
export type ResultsFile = Results['files'][0];
export type ReporterSettings = {
   summaryOnly: boolean,  //only print out the single line summary message
   };

const task = {
   normalizeFolder(folderPath: string): string {
      return !folderPath ? '' : slash(path.normalize(folderPath)).replace(/\/$/, '');
      },
   isTextFile(filename: string): boolean {
      return fs.statSync(filename).isFile() && !isBinary(filename);
      },
   readPackageJson() {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      const fixHiddenKeys = (pkgObj: { [key: string]: string }) => {
         const unhide = (key: string) => {
            const newKey = key.replace(/[@./]/g, '-');
            if (!pkgObj[newKey])
               pkgObj[newKey] = pkgObj[key]!;
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

   transform(sourceFolder: string, targetFolder: string, options?: Partial<Settings>): Results {
      const defaults = {
         cd:          null,
         concat:      null,
         exclude:     null,
         extensions:  [],
         find:        null,
         noSourceMap: false,
         regex:       null,
         replacement: null,
         };
      const settings =    { ...defaults, ...options };
      const startTime =   Date.now();
      const startFolder = settings.cd ? task.normalizeFolder(settings.cd) + '/' : '';
      const source =      task.normalizeFolder(startFolder + sourceFolder);
      const target =      task.normalizeFolder(startFolder + targetFolder);
      const concatFile =  settings.concat ? path.join(target, settings.concat) : null;
      const missingFind = !settings.find && !settings.regex && !!settings.replacement;
      if (targetFolder)
         fs.mkdirSync(target, { recursive: true });
      const errorMessage =
         !sourceFolder ?                      'Must specify the source folder path.' :
         !targetFolder ?                      'Must specify the target folder path.' :
         !fs.existsSync(source) ?             'Source folder does not exist: ' + source :
         !fs.existsSync(target) ?             'Target folder cannot be created: ' + target :
         !fs.statSync(source).isDirectory() ? 'Source is not a folder: ' + source :
         !fs.statSync(target).isDirectory() ? 'Target is not a folder: ' + target :
         missingFind ?                        'Must specify search text with --find or --regex' :
         null;
      if (errorMessage)
         throw Error('[replacer-util] ' + errorMessage);
      const globFiles = () =>
         exts.map(ext => globSync(source + '/**/*' + ext)).flat().sort();
      const keep = (file: string) =>
         !settings.exclude || !file.includes(settings.exclude);
      const relativeFolders = (file: string) =>
         file.substring(source.length, file.length - path.basename(file).length);
      const renameFile = (file: string) =>
         settings.rename ? target + relativeFolders(file) + settings.rename : null;
      const getFileRoute = (file: string) => ({
         origin: file,
         dest:   concatFile ?? renameFile(file) ?? target + '/' + file.substring(source.length + 1),
         });
      const exts =       settings.extensions.length ? settings.extensions : [''];
      const filesRaw =   settings.filename ? [source + '/' + settings.filename] : globFiles();
      const filtered =   filesRaw.filter(task.isTextFile).filter(keep);
      const fileRoutes = filtered.map(file => slash(file)).map(getFileRoute);
      const pkg =        task.readPackageJson();
      const engine =     new Liquid({ globals: { package: pkg, pkg: pkg } });  //pkg global is deprecated
      const versionFormatter = (numIds: number) =>
         (str: string): string => str.replace(/[^0-9]*/, '').split('.').slice(0, numIds).join('.');
      engine.registerFilter('version',       versionFormatter(3));
      engine.registerFilter('minor-version', versionFormatter(2));
      engine.registerFilter('major-version', versionFormatter(1));
      const normalizeEol =  /\r/g;
      const normalizeEof =  /\s*$(?!\n)/;
      const sourceMapLine = /^\/.#\ssourceMappingURL=.*\n/gm;
      const header =        settings.header ? settings.header + '\n' : '';
      const rep =           settings.replacement ?? '';
      const getFileInfo = (origin: string) => {
         const parsedPath = path.parse(origin);
         const dir =        slash(parsedPath.dir);
         const filePath =   dir + '/' + slash(parsedPath.base);
         return { file: { ...parsedPath, dir: dir, path: filePath } };
         };
      const processFile = (file: ResultsFile, index: number) => {
         const fileInfo = getFileInfo(file.origin);
         const render =   (text: string) => engine.parseAndRenderSync(text, fileInfo);
         const append =   settings.concat && index > 0;
         const altText =  settings.content ? render(settings.content) : null;
         const content =  render(header) + (altText ?? fs.readFileSync(file.origin, 'utf-8'));
         const newStr =   render(rep);
         const out1 =     render(content);
         const out2 =     out1.replace(normalizeEol, '').replace(normalizeEof, '\n');
         const out3 =     settings.find ? out2.replaceAll(settings.find, newStr) : out2;
         const out4 =     settings.regex ? out3.replace(settings.regex, newStr) : out3;
         const out5 =     settings.noSourceMap ? out4.replace(sourceMapLine, '') : out4;
         const out6 =     out5.trimStart();
         const final =    append && settings.header ? '\n' + out6 : out6;
         fs.mkdirSync(path.dirname(file.dest), { recursive: true });
         return append ? fs.appendFileSync(file.dest, final) : fs.writeFileSync(file.dest, final);
         };
      fileRoutes.map(processFile);
      const relativePaths = (file: ResultsFile) => ({
         origin: file.origin.substring(source.length + 1),
         dest:   file.dest.substring(target.length + 1),
         });
      return {
         source:   source,
         target:   target,
         count:    fileRoutes.length,
         duration: Date.now() - startTime,
         files:    fileRoutes.map(relativePaths),
         };
      },

   reporter(results: Results, options?: Partial<ReporterSettings>): Results {
      const defaults = {
         summaryOnly: false,
         };
      const settings =  { ...defaults, ...options };
      const name =      chalk.gray('replacer');
      const source =    chalk.blue.bold(results.source);
      const target =    chalk.magenta(results.target);
      const arrow =     { big: chalk.gray.bold(' ⟹  '), little: chalk.gray.bold('→') };
      const infoColor = results.count ? chalk.white : chalk.red.bold;
      const info =      infoColor(`(files: ${results.count}, ${results.duration}ms)`);
      log(name, source, arrow.big, target, info);
      const logFile = (file: ResultsFile) =>
         log(name, chalk.white(file.origin), arrow.little, chalk.green(file.dest));
      if (!settings.summaryOnly)
         results.files.forEach(logFile);
      return results;
      },

   };

export { replacer };

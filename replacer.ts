// replacer-util ~~ MIT License

import { isBinary } from 'istextorbinary';
import { Liquid } from 'liquidjs';
import fs    from 'fs';
import glob  from 'glob';
import path  from 'path';
import slash from 'slash';

export type Settings = {
   cd:          string | null,  //change working directory before starting search
   concat:      string | null,  //merge all files into one file in the target folder
   extensions:  string[],       //filter files by file extensions, example: ['.js', '.css']
   filename:    string | null,  //single file in the source folder to be processed
   find:        string | null,  //text to search for in the source input files
   header:      string | null,  //predend a line of text to each file
   regex:       RegExp | null,  //pattern to search for in the source input files
   rename:      string | null,  //new output filename if there's only one source file.
   replacement: string | null,  //text to insert into the target output files
   pkg:         boolean,        //load package.json and make it available as "pkg"
   };
export type Options = Partial<Settings>;
export type Results = {
   source:   string,  //path of origination folder
   target:   string,  //path of destination folder
   count:    number,  //number of files copied
   duration: number,  //execution time in milliseconds
   files:    { origin: string, dest: string }[],
   };
export type ResultsFile = Results['files'][0];

const task = {
   normalizeFolder(folderPath: string): string {
      return !folderPath ? '' : slash(path.normalize(folderPath)).replace(/\/$/, '');
      },
   isTextFile(filename: string): boolean {
      return fs.statSync(filename).isFile() && !isBinary(filename);
      },
   readPackageJson() {
      return JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      },
   };

const replacer = {
   transform(sourceFolder: string, targetFolder: string, options?: Options): Results {
      const defaults = {
         cd:          null,
         concat:      null,
         extensions:  [],
         find:        null,
         regex:       null,
         replacement: null,
         pkg:         false,
         };
      const settings = { ...defaults, ...options };
      const startTime = Date.now();
      const startFolder = settings.cd ? task.normalizeFolder(settings.cd) + '/' : '';
      const source =      task.normalizeFolder(startFolder + sourceFolder);
      const target =      task.normalizeFolder(startFolder + targetFolder);
      const concatFile =  settings.concat ? path.join(target, settings.concat) : null;
      const renameFile =  settings.rename ? path.join(target, settings.rename) : null;
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
      const resultsFile = (file: string) =>({
         origin: file,
         dest:   concatFile ?? renameFile ?? target + '/' + file.substring(source.length + 1),
         });
      const exts =      settings.extensions.length ? settings.extensions : [''];
      const globFiles = () => exts.map(ext => glob.sync(source + '/**/*' + ext)).flat().sort();
      const filesRaw =  settings.filename ? [source + '/' + settings.filename] : globFiles();
      const files =     filesRaw.filter(task.isTextFile).map(file => slash(file)).map(resultsFile);
      const pkg = settings.pkg ? task.readPackageJson() : null;
      const engine = new Liquid({ globals: { pkg } });
      const versionFormatter = (numIds: number) =>
         (str: string): string => str.replace(/[^0-9]*/, '').split('.').slice(0, numIds).join('.');
      engine.registerFilter('version',       versionFormatter(3));
      engine.registerFilter('minor-version', versionFormatter(2));
      engine.registerFilter('major-version', versionFormatter(1));
      const normalizeEol = /\r/g;
      const normalizeEof = /\s*$(?!\n)/;
      const header =       settings.header ? settings.header + '\n' : '';
      const newStr =       settings.replacement ?? '';
      const processFile = (file: ResultsFile, index: number) => {
         const fileInfo = { file: path.parse(file.origin) };
         const append =   settings.concat && index > 0;
         const content =  header + fs.readFileSync(file.origin, 'utf-8');
         const out1 =     settings.pkg ? engine.parseAndRenderSync(content, fileInfo) : content;
         const out2 =     out1.replace(normalizeEol, '').replace(normalizeEof, '\n');
         const out3 =     settings.find ? out2.replaceAll(settings.find, newStr) : out2;
         const out4 =     settings.regex ? out3.replace(settings.regex, newStr) : out3;
         const final =    append && settings.header ? '\n' + out4 : out4;
         fs.mkdirSync(path.dirname(file.dest), { recursive: true });
         if (append)
            fs.appendFileSync(file.dest, final);
         else
            fs.writeFileSync(file.dest, final);
         };
      files.map(processFile);
      const relativePaths = (file: ResultsFile) => ({
         origin: file.origin.substring(source.length + 1),
         dest:   file.dest.substring(target.length + 1),
         });
      return {
         source:   source,
         target:   target,
         count:    files.length,
         duration: Date.now() - startTime,
         files:    files.map(relativePaths),
         };
      },
   };

export { replacer };

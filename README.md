# files-replace
<img src=https://centerkey.com/graphics/center-key-logo.svg align=right width=200 alt=logo>

_Find and replace strings, regex patterns, or template outputs in text files (CLI tool designed for use in npm scripts)_

[![License:MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/center-key/files-replace/blob/main/LICENSE.txt)
[![npm](https://img.shields.io/npm/v/files-replace.svg)](https://www.npmjs.com/package/files-replace)
[![Vulnerabilities](https://snyk.io/test/github/center-key/files-replace/badge.svg)](https://snyk.io/test/github/center-key/files-replace)
[![Build](https://github.com/center-key/files-replace/workflows/build/badge.svg)](https://github.com/center-key/files-replace/actions/workflows/run-spec-on-push.yaml)

**files-replace** searches for text to substitute with replacement text or values from your project's **package.json** file, such the project version number.  The command's console output includes a timestamp and formatting helpful in build systems.

<img src=https://raw.githubusercontent.com/center-key/files-replace/main/screenshot.png
width=800 alt=screenshot>

## A) Setup
Install package for node:
```shell
$ npm install --save-dev files-replace
```

## B) Usage
### 1. npm scripts
Run `files-replace` from the `"scripts"` section of your **package.json** file.

The **first** parameter is the *source* folder or file.
The **second** parameter is the *target* folder.

Example **package.json** scripts:
```json
   "scripts": {
      "build-web": "files-replace src/web --ext=.html dist/website --pkg",
      "poetry": "files-replace poems dystopian-poems --find=humans --replacement=robots"
   },
```

### 2. Global
You can install **files-replace** globally and then run it anywhere directly from the terminal.

Example terminal commands:
```shell
$ npm install --global files-replace
$ files-replace src/web ext=.html docs/api-manual
```

### 3. CLI Flags
Command-line flags:
| Flag            | Description                                           | Value      |
| --------------- | ----------------------------------------------------- | ---------- |
| `--cd`          | Change working directory before starting search.      | **string** |
| `--concat`      | Merge all files into one file in the target folder.   | **string** |
| `--find`        | Text to search for in the source input files.         | **string** |
| `--ext`         | Filter files by file extension, such as `.js`.<br>Use a comma to specify multiple extensions. | **string** |
| `--pkg`         | Load **package.json** and make it available as `pkg`. | N/A        |
| `--quiet`       | Suppress informational messages.                      | N/A        |
| `--regex`       | Pattern to search for in the source input files.      | **string** |
| `--replacement` | Text to insert into the target output files.          | **string** |
| `--summary`     | Only print out the single line summary message.       | N/A        |

Examples:
   - `files-replace src build --pkg`           &nbsp; Recursively copy all the files in the src folder to the build folder using the data in **package.json** to update the template outputs.
   - `files-replace src --ext=.js build --pkg --concat=bundle.js` &nbsp; Merge all JS files into **build/bundle.js**.
   - `files-replace src build --pkg --summary` &nbsp; Displays the summary but not the individual files copied.
   - `files-replace src build --regex=/^--/gm replacement=;;;` &nbsp; Replace double dashes at the start of a line with 3 semicolons.
   - `files-replace --cd=spec/fixtures source target --pkg --find=insect --replacement=A.I.` &nbsp; Transforms [mock1.html](spec/fixtures/source/mock1.html) into [mock1.html](spec/fixtures/target/mock1.html).

## C) Application Code
Even though **files-replace** is primarily intended for build scripts, the package can easily be used programmatically in ESM and TypeScript projects.

Example:
``` typescript
import { filesReplace } from 'files-replace';
const options = { extensions: ['.html', '.js'], pkg: true };
const results = filesReplace.transform('src/web', 'docs/api-manual', options);
console.log('Number of files copied:', results.count);
```

See the **TypeScript Declarations** at the top of [files-replace.ts](files-replace.ts) for documentation.

<br>

---
**CLI Build Tools**
   - 🎋 [add-dist-header](https://github.com/center-key/add-dist-header):&nbsp; _Prepend a one-line banner comment (with license notice) to distribution files_
   - 📄 [copy-file-util](https://github.com/center-key/copy-file-util):&nbsp; _Copy or rename a file_
   - 📂 [copy-folder-cli](https://github.com/center-key/copy-folder-cli):&nbsp; _Recursively copy the files in a folder_
   - 🔍 [files-replace](https://github.com/center-key/files-replace):&nbsp; _Find and replace strings or template outputs in text files_
   - 🔢 [rev-web-assets](https://github.com/center-key/rev-web-assets):&nbsp; _Revision web asset filenames with cache busting content hash fingerprints_
   - 🚦 [w3c-html-validator](https://github.com/center-key/w3c-html-validator):&nbsp; _Check the markup validity of HTML files using the W3C validator_

Feel free to submit questions at:<br>
[github.com/center-key/files-replace/issues](https://github.com/center-key/files-replace/issues)

[MIT License](LICENSE.txt)

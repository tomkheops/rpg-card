const mv = require('mv');
const fs = require('fs');
const fse = require('fs-extra');
const http = require('http');
const path = require('path');
const walk = require('walk');
const unzip = require('unzip');
const child_process = require('child_process');
const ncp = require('ncp');

const gameIconsUrl = "http://game-icons.net/archives/png/zip/ffffff/000000/game-icons.net.png.zip";
const tempFilePath = "./temp.zip";
const tempDir = "./temp";
const imgDir = "./generator/img";
const customIconDir = "./resources/custom-icons";
const cssPath = "./generator/css/icons.css";
//const processIconsCmd = "mogrify -background white -alpha shape *.png";
const processIconsCmd = `mogrify -alpha copy -channel-fx "red=100%, blue=100%, green=100%" *.png`


// ----------------------------------------------------------------------------
// Download
// ----------------------------------------------------------------------------
function downloadFile(url, dest) {
    console.log("Downloading...");
    return new Promise((resolve, reject) => {
        http.get(url, response => {
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('close', resolve);
            file.on('error', reject);
        })
        .on('error', reject);
    });
}

// ----------------------------------------------------------------------------
// Unzip
// ----------------------------------------------------------------------------
function unzipAll(src, dest) {
    console.log("Unzipping...");
    return new Promise((resolve, reject) => {
        fs.createReadStream(tempFilePath)
        .pipe(unzip.Parse())
        .on('entry', entry => {
            const fileName = entry.path;
            const baseName = path.basename(fileName);
            const type = entry.type;
            if (type === "File") {
                entry.pipe(fs.createWriteStream(path.join(dest, baseName)));
            }
            else {
                entry.autodrain();
            }
        })
        .on('close', resolve)
        .on('error', reject);
    });
}

// ----------------------------------------------------------------------------
// Process icons
// ----------------------------------------------------------------------------
function processAll(path) {
    console.log("Processing (this will take a while)...");
    return new Promise((resolve, reject) => {
        child_process.exec(processIconsCmd, {cwd: path}, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}

// ----------------------------------------------------------------------------
// Generate CSS
// ----------------------------------------------------------------------------
function generateCSS(src, dest) {
    console.log("Generating CSS...");
    return new Promise((resolve, reject) => {
        fs.readdir(src, (err, files) => {
            if (err) {
                reject(err);
            }
            else {
                const content = files
                    .map(name => `.icon-${name.replace(".png", "")} { background-image: url(../img/${name});}\n`)
                    .join("");
                fs.writeFile(dest, content, err => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }
        });
    });
}

// ----------------------------------------------------------------------------
// Copy
// ----------------------------------------------------------------------------
function copyAll(src, dest) {
    console.log("Copying...");
    return new Promise((resolve, reject) => {
        fse.copy(src, dest, err => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

fse.emptyDir(tempDir)
.then(() => downloadFile(gameIconsUrl, tempFilePath))
.then(() => unzipAll(tempFilePath, tempDir))
.then(() => copyAll(tempDir, imgDir))
.then(() => copyAll(customIconDir, imgDir))
.then(() => processAll(imgDir))
.then(() => generateCSS(imgDir, cssPath))
.then(() => console.log("Done."))
.catch(err => cosole.log("Error", err));
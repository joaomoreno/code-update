#!/usr/bin/env node

const fs = require('fs');
const cp = require('child_process');
const request = require('request');
const progress = require('request-progress');
const ProgressBar = require('progress');
const tmp = require('tmp');

const rawProduct = fs.readFileSync('/usr/share/code-insiders/resources/app/product.json', 'utf8');
const { quality, commit } = JSON.parse(rawProduct);
const updateUrl = `https://vscode-update.azurewebsites.net/api/update/linux-deb-x64/${quality}/${commit}`;

request(updateUrl, { json: true }, (err, res, body) => {
  if (err) {
    console.error(err);
    return process.exit(1);
  }

  if (res.statusCode !== 200) {
    console.log(`Update not available: ${res.statusCode}`);
    return process.exit(0);
  }

  const { url, name, version } = body;
  console.log(`Downloading ${name}: ${version}...`);

  const tmpFile = tmp.fileSync();
  let bar;

  progress(request(url))
    .on('response', res => {
      bar = new ProgressBar('[:bar] :rate/kbps :percent :etas', {
        total: parseInt(res.headers['content-length']) / 1000
      });
    })
    .on('data', data => bar.tick(data.length / 1000))
    .pipe(fs.createWriteStream(tmpFile.name))
    .on('close', () => {
      cp.execSync(`sudo dpkg -i ${tmpFile.name}`, { stdio: 'inherit' });
      tmpFile.removeCallback();
    });
});
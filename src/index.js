'use strict';

import Promise from 'bluebird';
import stream from 'stream';
import fs from 'fs';
import targz from 'tar.gz';
import find from 'lodash/collection/find';

export default class InMemoryTargz {
  constructor() {
    this.fileParsingPromise = Promise.resolve();
  }

  static create(pathToInitialTargz) {
    const inMemoryTargz = new InMemoryTargz();

    if (pathToInitialTargz) {
      inMemoryTargz.loadTargz(pathToInitialTargz);
    }
    return inMemoryTargz;
  }

  loadTargz(pathToTargzOrStream) {
    this.fileParsingPromise = new Promise((resolve, reject) => {
      // Streams
      const targzReadStream = pathToTargzOrStream instanceof stream.Readable ? pathToTargzOrStream : fs.createReadStream(pathToTargzOrStream);
      const parseStream = targz().createParseStream();

      const tarFiles = [];

      // For each file
      parseStream.on('entry', function(entry) {
        if (entry.type === 'File') {
          const bufferChuncks = [];
          entry.on('data', (chunck) => {
            bufferChuncks.push(chunck);
          });
          entry.on('end', () => {
            entry.buffer = Buffer.concat(bufferChuncks);
            tarFiles.push(entry);
          });
        }
      });

      targzReadStream.pipe(parseStream);

      parseStream.on('error', reject);
      parseStream.on('end', () => resolve(tarFiles));
    });

    return this.fileParsingPromise;
  }

  getFilesList() {
    return this.fileParsingPromise.map((tarFile) => tarFile.path);
  }

  getFile(fileName) {
    return this.fileParsingPromise
      .then(function filesHandler(tarFiles) {
        const foundEntry = find(tarFiles, {path: fileName});

        if (foundEntry) {
          return foundEntry.buffer;
        }

        // If no entry found, throw an error
        const error = new Error('File "' + fileName + '" not found');
        error.code = 'ENOENT';
        throw error;
      });
  }
}

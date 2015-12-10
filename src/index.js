'use strict';

import Promise from 'bluebird';
import stream from 'stream';
import fs from 'fs';
import path from 'path';
import targz from 'tar.gz';
import find from 'lodash/collection/find';

export default class InMemoryTargz {
  constructor() {
    this.fileParsingPromise = Promise.resolve();
  }

  /**
   * Factory
   * @param [pathOrStreamOfInitialTargz] optional initial file
   * @returns {InMemoryTargz}
   */
  static create(pathOrStreamOfInitialTargz) {
    const inMemoryTargz = new InMemoryTargz();

    if (pathOrStreamOfInitialTargz) {
      inMemoryTargz.loadTargz(pathOrStreamOfInitialTargz);
    }
    return inMemoryTargz;
  }

  /**
   * Loads a new file in memory, all future request for files will be paused while the buffer is not ready
   * @param pathToTargzOrStream path or stream to load
   * @returns {Promise} A promise of all the files in the tar.gz
   */
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
            // Normalize entry path (removes potential "./" at the start of path)
            entry.path = path.normalize(entry.path);
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

  /**
   * Return the list of files loaded in the buffer
   */
  getFilesList() {
    return this.fileParsingPromise.map((tarFile) => tarFile.path);
  }

  /**
   * Return the buffer of the file, if it exists. If a tar.gz is being loaded, will wait for it
   * @param fileName the full name of the file, including all parents folder in the tar.gz
   * @returns {Promise} A promise resolving with a buffer of the file content, and rejecting with 'ENOENT' error if no file.
   */
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

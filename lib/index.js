'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (pathToInitialTargz) {
  var inMemoryTargz = new InMemoryTargz();

  if (pathToInitialTargz) {
    return inMemoryTargz.loadTargz(pathToInitialTargz).thenReturn(inMemoryTargz);
  }
  return _bluebird2.default.resolve(inMemoryTargz);
};

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _tar = require('tar.gz');

var _tar2 = _interopRequireDefault(_tar);

var _find = require('lodash/collection/find');

var _find2 = _interopRequireDefault(_find);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var InMemoryTargz = (function () {
  function InMemoryTargz() {
    _classCallCheck(this, InMemoryTargz);

    this.fileParsingPromise = _bluebird2.default.resolve();
  }

  _createClass(InMemoryTargz, [{
    key: 'loadTargz',
    value: function loadTargz(pathToTargz) {
      this.fileParsingPromise = new _bluebird2.default(function (resolve, reject) {
        // Streams
        var targzReadStream = _fs2.default.createReadStream(pathToTargz);
        var parseStream = (0, _tar2.default)().createParseStream();

        var tarFiles = [];

        // For each file
        parseStream.on('entry', function (entry) {
          if (entry.type === 'File') {
            (function () {
              var bufferChuncks = [];
              entry.on('data', function (chunck) {
                bufferChuncks.push(chunck);
              });
              entry.on('end', function () {
                entry.buffer = Buffer.concat(bufferChuncks);
                tarFiles.push(entry);
              });
            })();
          }
        });

        targzReadStream.pipe(parseStream);

        parseStream.on('error', reject);
        parseStream.on('end', function () {
          return resolve(tarFiles);
        });
      });

      return this.fileParsingPromise;
    }
  }, {
    key: 'getFilesList',
    value: function getFilesList() {
      return this.fileParsingPromise.map(function (tarFile) {
        return tarFile.path;
      });
    }
  }, {
    key: 'getFile',
    value: function getFile(fileName) {
      return this.fileParsingPromise.then(function filesHandler(tarFiles) {
        var foundEntry = (0, _find2.default)(tarFiles, { path: fileName });

        if (foundEntry) {
          return foundEntry.buffer;
        }

        // If no entry found, throw an error
        var error = new Error('File "' + fileName + '" not found');
        error.code = 'ENOENT';
        throw error;
      });
    }
  }]);

  return InMemoryTargz;
})();
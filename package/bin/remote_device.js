// Generated by CoffeeScript 1.4.0
(function() {
  "use strict";
  var RemoteDevice, exports,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  var exports = window;

  /*
   * Represents a device running CIRC and handles communication to/from that
   * device.
  */


  RemoteDevice = (function(_super) {

    __extends(RemoteDevice, _super);

    /*
       * Begin at this port and increment by one until an open port is found.
    */


    RemoteDevice.BASE_PORT = 1329;

    RemoteDevice.MAX_CONNECTION_ATTEMPTS = 30;

    RemoteDevice.FINDING_PORT = -1;

    RemoteDevice.NO_PORT = -2;

    function RemoteDevice(addr, port) {
      this._listenOnValidPort = __bind(this._listenOnValidPort, this);
      RemoteDevice.__super__.constructor.apply(this, arguments);
      this._receivedMessages = '';
      this.id = addr;
      if (typeof addr === 'string') {
        this._initFromAddress(addr, port);
      } else if (addr) {
        this._initFromSocketId(addr);
      } else {
        this.port = RemoteDevice.FINDING_PORT;
      }
    }

    RemoteDevice.prototype.equals = function(otherDevice) {
      return this.id === (otherDevice != null ? otherDevice.id : void 0);
    };

    RemoteDevice.prototype.usesConnection = function(connectionInfo) {
      return connectionInfo.addr === this.addr && connectionInfo.port === this.port;
    };

    RemoteDevice.prototype.getState = function() {
      if (!this.addr) {
        return 'no_addr';
      }
      switch (this.port) {
        case RemoteDevice.FINDING_PORT:
          return 'finding_port';
        case RemoteDevice.NO_PORT:
          return 'no_port';
        default:
          return 'found_port';
      }
    };

    RemoteDevice.prototype._initFromAddress = function(addr, port) {
      this.addr = addr;
      this.port = port;
    };

    RemoteDevice.prototype._initFromSocketId = function(_socketId) {
      this._socketId = _socketId;
      return this._listenForData();
    };

    RemoteDevice.getOwnDevice = function(callback) {
      var device,
        _this = this;
      device = new RemoteDevice;
      if (!device.hasGetNetworkListSupport()) {
        callback(device);
        return;
      }
      if (!api.listenSupported()) {
        device.port = RemoteDevice.NO_PORT;
      }
      return device.findPossibleAddrs(function() {
        return callback(device);
      });
    };

    RemoteDevice.prototype.findPossibleAddrs = function(callback) {
      var _this = this;
      return chrome.socket.getNetworkList(function(networkInfoList) {
        var networkInfo;
        _this.possibleAddrs = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = networkInfoList.length; _i < _len; _i++) {
            networkInfo = networkInfoList[_i];
            _results.push(networkInfo.address);
          }
          return _results;
        })();
        _this.addr = _this._getValidAddr(_this.possibleAddrs);
        return callback();
      });
    };

    RemoteDevice.prototype._getValidAddr = function(addrs) {
      var addr, shortest, _i, _len;
      if (!addrs || addrs.length === 0) {
        return void 0;
      }
      /*
           * TODO currently we return the first IPv4 address. Will this always work?
      */

      shortest = addrs[0];
      for (_i = 0, _len = addrs.length; _i < _len; _i++) {
        addr = addrs[_i];
        if (addr.length < shortest.length) {
          shortest = addr;
        }
      }
      return shortest;
    };

    RemoteDevice.prototype.hasGetNetworkListSupport = function() {
      if (api.getNetworkListSupported()) {
        return true;
      }
      this._log('w', 'chrome.socket.getNetworkList is not supported!');
      this.possibleAddrs = [];
      this.port = RemoteDevice.NO_PORT;
      return false;
    };

    /*
       * Call chrome.socket.getNetworkList in an attempt to find a valid address.
    */


    RemoteDevice.prototype.searchForAddress = function(callback, timeout) {
      var _this = this;
      if (timeout == null) {
        timeout = 500;
      }
      if (!this.hasGetNetworkListSupport()) {
        return;
      }
      if (timeout > 60000) {
        timeout = 60000;
      }
      return setTimeout((function() {
        return _this.findPossibleAddrs(function() {
          if (_this.addr) {
            return callback();
          } else {
            return _this.searchForAddress(callback, timeout *= 1.2);
          }
        });
      }), timeout);
    };

    /*
       * Called when the device is your own device. Listens for connecting client
       * devices.
    */


    RemoteDevice.prototype.listenForNewDevices = function(callback) {
      var _ref,
        _this = this;
      return (_ref = chrome.socket) != null ? _ref.create('tcp', {}, function(socketInfo) {
        _this._socketId = socketInfo.socketId;
        registerSocketConnection(socketInfo.socketId);
        if (api.listenSupported()) {
          return _this._listenOnValidPort(callback);
        }
      }) : void 0;
    };

    /*
       * Attempt to listen on the default port, then increment the port by a random
       * amount if the attempt fails and try again.
    */


    RemoteDevice.prototype._listenOnValidPort = function(callback, port) {
      var _this = this;
      if (!(port >= 0)) {
        port = RemoteDevice.BASE_PORT;
      }
      return chrome.socket.listen(this._socketId, '0.0.0.0', port, function(result) {
        return _this._onListen(callback, port, result);
      });
    };

    RemoteDevice.prototype._onListen = function(callback, port, result) {
      if (result < 0) {
        return this._onFailedToListen(callback, port, result);
      } else {
        this.port = port;
        this.emit('found_port', this);
        if (api.acceptSupported()) {
          return this._acceptNewConnection(callback);
        }
      }
    };

    RemoteDevice.prototype._onFailedToListen = function(callback, port, result) {
      if (port - RemoteDevice.BASE_PORT > RemoteDevice.MAX_CONNECTION_ATTEMPTS) {
        this._log('w', "Couldn't listen to 0.0.0.0 on any attempted ports",
          chrome.runtime.lastError.message + " (error " +  (-result) + ")");
        this.port = RemoteDevice.NO_PORT;
        return this.emit('no_port');
      } else {
        return this._listenOnValidPort(callback, port + Math.floor(Math.random() * 100));
      }
    };

    RemoteDevice.prototype._acceptNewConnection = function(callback) {
      var _this = this;
      this._log('listening for new connections on port', this.port);
      return chrome.socket.accept(this._socketId, function(acceptInfo) {
        var device;
        if (!acceptInfo.socketId) {
          return;
        }
        _this._log('Connected to a client device', _this._socketId);
        registerSocketConnection(_this._socketId);
        device = new RemoteDevice(acceptInfo.socketId);
        device.getAddr(function() {
          return callback(device);
        });
        return _this._acceptNewConnection(callback);
      });
    };

    /*
       * Called when acting as a server. Finds the client ip address.
    */


    RemoteDevice.prototype.getAddr = function(callback) {
      var _ref,
        _this = this;
      return (_ref = chrome.socket) != null ? _ref.getInfo(this._socketId, function(socketInfo) {
        _this.addr = socketInfo.peerAddress;
        return callback();
      }) : void 0;
    };

    RemoteDevice.prototype.send = function(type, args) {
      var _this = this;
      if (args) {
        // Convert Uint8Arrays to regular JS arrays for stringify.
        // TODO(flackr): Preferably this would be done earlier so that send
        // doesn't need to know what's being sent.
        for (var i = 0; i < args.length; i++) {
          if (args[i] instanceof Uint8Array)
            args[i] = Array.prototype.slice.call(args[i]);
        }
      }
      var msg = JSON.stringify({
        type: type,
        args: args
      });
      msg = msg.length + '$' + msg;
      return irc.util.toSocketData(msg, function(data) {
        var _ref;
        return (_ref = chrome.socket) != null ? _ref.write(_this._socketId, data, function(writeInfo) {
          if (writeInfo.resultCode < 0 || writeInfo.bytesWritten !== data.byteLength) {
            _this._log('w', 'closing b/c failed to send:', type, args,
              chrome.runtime.lastError.message + " (error " + (-writeInfo.resultCode) + ")");
            return _this.close();
          } else {
            return _this._log('sent', type, args);
          }
        }) : void 0;
      });
    };

    /*
       * Called when the device represents a remote server. Creates a connection
       * to that remote server.
    */


    RemoteDevice.prototype.connect = function(callback) {
      var _ref,
        _this = this;
      this.close();
      return (_ref = chrome.socket) != null ? _ref.create('tcp', {}, function(socketInfo) {
        var _ref1;
        _this._socketId = socketInfo.socketId;
        if (!_this._socketId) {
          callback(false);
        }
        return (_ref1 = chrome.socket) != null ? _ref1.connect(_this._socketId, _this.addr, _this.port, function(result) {
          return _this._onConnect(result, callback);
        }) : void 0;
      }) : void 0;
    };

    RemoteDevice.prototype._onConnect = function(result, callback) {
      if (result < 0) {
        this._log('w', "Couldn't connect to server", this.addr, 'on port', this.port, '-',
          chrome.runtime.lastError.message + " (error " +  (-result) + ")");
        return callback(false);
      } else {
        this._listenForData();
        return callback(true);
      }
    };

    RemoteDevice.prototype.close = function() {
      var _ref, _ref1;
      if (this._socketId) {
        registerSocketConnection(this._socketId, true);
        chrome.socket.disconnect(this._socketId);
        chrome.socket.destroy(this._socketId);
        this._socketId = undefined;
        return this.emit('closed', this);
      }
    };

    RemoteDevice.prototype._listenForData = function() {
      var _ref,
        _this = this;
      return (_ref = chrome.socket) != null ? _ref.read(this._socketId, function(readInfo) {
        if (readInfo.resultCode <= 0) {
          _this._log('w', 'bad read - closing socket: ',
            chrome.runtime.lastError.message + " (error " +  (-readInfo.resultCode) + ")");
          _this.emit('closed', _this);
          return _this.close();
        } else if (readInfo.data.byteLength) {
          irc.util.fromSocketData(readInfo.data, function(partialMessage) {
            var completeMessages, data, json, _i, _len, _results;
            _this._receivedMessages += partialMessage;
            completeMessages = _this._parseReceivedMessages();
            _results = [];
            for (_i = 0, _len = completeMessages.length; _i < _len; _i++) {
              data = completeMessages[_i];
              _this._log.apply(_this, ['received', data.type].concat(__slice.call(data.args)));
              _results.push(_this.emit.apply(_this, [data.type, _this].concat(__slice.call(data.args))));
            }
            return _results;
          });
          return _this._listenForData();
        } else {
          return _this._log('w', 'onRead - got no data?!');
        }
      }) : void 0;
    };

    RemoteDevice.prototype._parseReceivedMessages = function(result) {
      var length, message, prefixEnd;
      if (result == null) {
        result = [];
      }
      if (!this._receivedMessages) {
        return result;
      }
      var isDigit = function(c) {
        return c >= '0' && c <= '9';
      };
      if (this._receivedMessages.length &&
          !isDigit(this._receivedMessages[0])) {
        this._log.apply(this, ['received message doesn\'t begin with digit: ', this._receivedMessages]);
      }
      prefixEnd = this._receivedMessages.indexOf('$');
      if (!(prefixEnd >= 0)) {
        return result;
      }
      length = parseInt(this._receivedMessages.slice(0, +(prefixEnd - 1) + 1 || 9e9));
      if (!(this._receivedMessages.length > prefixEnd + length)) {
        return result;
      }
      message = this._receivedMessages.slice(prefixEnd + 1, +(prefixEnd + length) + 1 || 9e9);
      try {
        var json = JSON.parse(message);
        result.push(json);
        if (JSON.stringify(json).length != length) {
          this._log('e', 'json length mismatch');
        }
      } catch (e) {
        this._log('e', 'failed to parse json: ' + message);
      }
      if (this._receivedMessages.length > prefixEnd + length + 1 &&
          !isDigit(this._receivedMessages[prefixEnd + length + 1])) {
        this._log('e', 'message after split doesn\'t begin with digit: ' + this._receivedMessages);
      }
      this._receivedMessages = this._receivedMessages.slice(prefixEnd + length + 1);
      return this._parseReceivedMessages(result);
    };

    RemoteDevice.prototype.toString = function() {
      if (this.addr) {
        return "" + this.addr + " on port " + this.port;
      } else {
        return "" + this.socketId;
      }
    };

    return RemoteDevice;

  })(EventEmitter);

  exports.RemoteDevice = RemoteDevice;

}).call(this);

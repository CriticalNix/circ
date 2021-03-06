// Generated by CoffeeScript 1.4.0
(function() {
  "use strict";
  var Event, exports,
    __slice = [].slice;

  var exports = window;

  /*
   * A generic event often used in conjuction with emit().
  */


  Event = (function() {

    function Event() {
      var args, name, type;
      type = arguments[0], name = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      this.type = type;
      this.name = name;
      this.args = args;
      /*
           * Info on which window the event took place in.
      */

      this.context = {};
      /*
           * Effects how the event is displayed.
      */

      this.style = [];
      /*
           * Acts as an id for the event.
      */

      this.hook = this.type + ' ' + this.name;
    }

    Event.prototype.setContext = function(server, channel) {
      return this.context = {
        server: server,
        channel: channel
      };
    };

    /*
       * Adds a custom style for the event that will effect how it's contents are
       * displayed.
       * @param {Array.<string>} style
    */


    Event.prototype.addStyle = function(style) {
      if (!Array.isArray(style)) {
        style = [style];
      }
      return this.style = this.style.concat(style);
    };

    /*
       * Creates an Event from an Event-like object. Used for deserialization.
    */


    Event.wrap = function(obj) {
      var event;
      if (obj instanceof Event) {
        return obj;
      }
      event = (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args);
        return Object(result) === result ? result : child;
      })(Event, [obj.type, obj.name].concat(__slice.call(obj.args)), function(){});
      event.setContext(obj.context.server, obj.context.channel);
      return event;
    };

    return Event;

  })();

  exports.Event = Event;

}).call(this);

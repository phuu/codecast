(function () {

  angular
  .module('io', [])
  .factory('io', function () {
    if (!window.io) throw new Error("Socket.io not found.");
    return window.io;
  });

}());
(function () {

  var start = angular.module('start', ['ngResource']);

  start.factory('Room', [
    '$resource',
  function ($resource) {
    return $resource('/api/room/:id');
  }]);

  start.controller('StartCtrl', [
    '$scope',
    'Room',
    '$location',
  function ($scope, Room, $location) {
    var room = new Room();
    room.$save(function (room) {
      $location.path('/c/' + room.id).replace();
    });
  }]);

}());
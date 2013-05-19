(function () {

  var room = angular.module('room', ['io']);

  room.controller('RoomCtrl', [
    '$scope', 'io', '$routeParams',
  function ($scope, io, $routeParams) {
    $scope.room = $routeParams.room;
    var socket = io.connect('/code');
    socket.emit('join', $routeParams.room);
    socket.on('code:change', function (newCode) {
      $scope.$apply(function () {
        $scope.code = newCode;
      });
    });
  }]);

}());
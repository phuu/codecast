(function () {

  var room = angular.module('room', ['io']);

  room.controller('RoomCtrl', [
    '$scope', 'io', '$routeParams',
  function ($scope, io, $routeParams) {
    $scope.code = '';
    $scope.mode = 'markdown';
    $scope.room = $routeParams.room;
    var socket = io.connect('/code');
    socket.emit('join', $routeParams.room);
    socket.on('code:change', function (data) {
      $scope.$apply(function () {
        $scope.code = data.code;
        $scope.mode = data.mode;
      });
    });
    socket.on('stat:change', function (stats) {
      $scope.$apply(function () {
        $scope.stats = stats;
      });
    });
  }]);

}());
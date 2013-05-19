(function () {

  var code = angular.module('code', ['io']);

  code.controller('CodeCtrl', [
    '$scope', 'io', '$routeParams',
  function ($scope, io, $routeParams) {
    $scope.room = $routeParams.room;
    var socket = io.connect('/code');
    socket.emit('join', $routeParams.room);
    $scope.change = function () {
      socket.emit('code:change', $scope.code);
    };
  }]);

}());
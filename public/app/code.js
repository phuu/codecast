(function () {

  var code = angular.module('code', ['io']);

  code.controller('CodeCtrl', [
    '$scope', 'io', '$routeParams',
  function ($scope, io, $routeParams) {
    $scope.code = '';
    $scope.mode = 'markdown';

    var socket = io.connect('/code');
    socket.emit('join', $routeParams.room);
    $scope.change = function (value) {
      socket.emit('code:change', {
        code: $scope.code,
        mode: $scope.mode
      });
    };
  }]);

}());
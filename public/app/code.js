(function () {

  var code = angular.module('code', ['io']);

  code.controller('CodeCtrl', [
    '$scope', 'io', '$routeParams',
  function ($scope, io, $routeParams) {
    $scope.code = '';
    $scope.mode = 'markdown';
    $scope.room = $routeParams.room;
    var socket = io.connect('/code');
    socket.emit('join', $routeParams.room);
    $scope.change = function (value) {
      socket.emit('code:change', {
        code: $scope.code,
        mode: $scope.mode
      });
    };
    socket.on('stat:change', function (stats) {
      $scope.$apply(function () {
        $scope.stats = stats;
      });
    });
  }]);

}());
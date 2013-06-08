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

    // Listen for code persisted from a previous session
    socket.on('code:change', function (data) {
      $scope.$apply(function () {
        $scope.code = data.code || $scope.code;
        $scope.mode = data.mode || $scope.mode;
      });
    });
  }]);

}());
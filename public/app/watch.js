(function () {

  var watch = angular.module('watch', ['io']);

  watch.controller('WatchCtrl', [
    '$scope', 'io', '$routeParams',
  function ($scope, io, $routeParams) {
    $scope.code = 'Waiting for code...';
    $scope.mode = 'markdown';
    // Connect and get some real-time code yum
    var socket = io.connect('/code');
    socket.emit('join', $routeParams.room);
    socket.on('code:change', function (data) {
      $scope.$apply(function () {
        if ($scope.code !== data.code) {
          $scope.code = data.code || $scope.code;
        }
        if ($scope.mode !== data.mode) {
          $scope.mode = data.mode || $scope.mode;
        }
      });
    });
  }]);

}());
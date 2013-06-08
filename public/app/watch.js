(function () {

  var watch = angular.module('watch', ['io']);

  watch.controller('WatchCtrl', [
    '$scope', 'io', '$routeParams',
  function ($scope, io, $routeParams) {
    $scope.code = '';
    $scope.mode = 'markdown';
    // Connect and get some real-time code yum
    var socket = io.connect('/code');
    socket.emit('join', $routeParams.room);
    socket.on('code:change', function (data) {
      $scope.$apply(function () {
        $scope.code = data.code;
        $scope.mode = data.mode;
      });
    });
  }]);

}());
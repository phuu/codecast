(function () {

  var app = angular.module('codecast', [
    'ngResource', 'code', 'watch', 'chat', 'ace', 'start'
  ]);

  /**
   * Configure
   */
  app.config([
    '$routeProvider',
    '$locationProvider',
  function ($routeP, $locationP) {
    // Use nice URLs, no nasty hashbangs
    $locationP.html5Mode(true);

    // Routing
    $routeP
      .when('/start', {
        controller: 'StartCtrl',
        auth: true,
        template: 'Loading...'
      })
      .when('/w/:room', {
        controller: 'WatchCtrl',
        room: true,
        templateUrl: '/template/watch.html'
      })
      .when('/c/:room', {
        controller: 'CodeCtrl',
        auth: true,
        room: true,
        templateUrl: '/template/code.html'
      })
      .otherwise({
        controller: 'LandingCtrl',
        templateUrl: '/template/landing.html'
      });
  }]);

  /**
   * User info
   */
  app.factory('User', [
    '$resource',
  function ($resource) {
    return $resource('/api/user');
  }]);

  /**
   * Room info
   */
  app.factory('Room', [
    '$resource',
  function ($resource) {
    return $resource('/api/room/:id');
  }]);

  /**
   * Authentication Controller
   */
  app.controller('AuthCtrl', [
    '$scope',
    'User',
    'Room',
    'io',
    '$location',
    '$routeParams',
  function ($scope, User, Room, io, $location, $routeParams) {
    $scope.$on('$routeChangeSuccess', function (event, current) {
      // Get the current user's information, and kick them out if required
      $scope.user = User.get(function (user) {
        if (current.auth && !$scope.user.access_token) {
          $location.path('/').replace();
        }
      });

      if ($routeParams.room) {
        $scope.room = Room.get({ id: $routeParams.room }, function (data) {
          if (current.room && data.id !== $routeParams.room) {
            $location.path('/').replace();
          }
        });

        var socket = io.connect('/room');
        socket.emit('join', $routeParams.room);
        socket.on('room:change', function (room) {
          $scope.$apply(function () {
            $scope.room = room;
          });
        });
      }
    });
  }]);

  /**
   * Landing Controller
   */
  app.controller('LandingCtrl', [
    '$scope',
    '$location',
  function ($scope, $location) {
    $scope.watch = function (code) {
      $location.path('/w/' + code);
    };
  }]);

}());
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
    '$rootScope',
    'User',
    'Room',
    'io',
    '$location',
    '$routeParams',
  function ($scope, $rootScope, User, Room, io, $location, $routeParams) {
    $scope.$on('$routeChangeSuccess', function (event, current) {

      // This allows authorise room to be called twice, by in whichever order,
      // and always act when the last if done
      var authoriseRoom = function () {
        authoriseRoom = function () {
          if (current.room && current.auth &&
              ''+$scope.user.profile.id !== $scope.room.owner) {
            $location.path('/start').replace();
          }
        };
      };

      // Get the current user's information, and kick them out if required
      $scope.user = User.get(function (user) {
        $rootScope.$broadcast('user:change', user);
        if (current.auth && !$scope.user.access_token) {
          $location.path('/').replace();
        }
        authoriseRoom();
      });

      // If we don't need to do anything with the room, don't bother
      if (!current.room) return;

      // Grab the room, then authorise it if needs be
      $scope.room = Room.get({ id: $routeParams.room }, function (data) {
        if (current.room && data.id !== $routeParams.room) {
          $location.path('/').replace();
        }
        authoriseRoom();
      });

      // Connect to the room and wait for updates
      var socket = io.connect('/room');
      socket.emit('join', $routeParams.room);
      socket.on('room:change', function (room) {
        $scope.$broadcast('room:change', room);
        $scope.$apply(function () {
          $scope.room = room;
        });
      });

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
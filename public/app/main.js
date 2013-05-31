(function () {

  var app = angular.module('codecast', [
    'ngResource', 'code', 'room', 'chat', 'ace', 'start'
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
        controller: 'RoomCtrl',
        templateUrl: '/template/room.html'
      })
      .when('/c/:room', {
        controller: 'CodeCtrl',
        auth: true,
        templateUrl: '/template/code.html'
      })
      .otherwise({
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
   * Authentication Controller
   */
  app.controller('AuthCtrl', [
    '$scope',
    'User',
    '$location',
    '$route',
  function ($scope, User, $location, $route) {
    $scope.$on('$routeChangeSuccess', function (event, current) {
      $scope.user = User.get(function (user) {
        if (current.auth && !$scope.user.access_token) {
          $location.path('/').replace();
        }
      });
    });
  }]);

}());
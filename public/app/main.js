(function () {

  var app = angular.module('codecast', [
    'ngResource', 'code', 'room', 'chat', 'ace'
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
      .when('/room/:room', {
        controller: 'RoomCtrl',
        templateUrl: '/template/room.html'
      })
      .when('/code/:room', {
        controller: 'CodeCtrl',
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
  }])

  /**
   * Authentication Controller
   */
  app.controller('AuthCtrl', [
    '$scope',
    'User',
    '$location',
  function ($scope, User, $location) {
    $scope.user = User.get(function (user) {
      if (!$scope.user.access_token) {
        $location.path('/').replace();
      }
    });
  }]);

}());
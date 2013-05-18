(function () {

  var app = angular.module('codecast', ['ngResource']);

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
  function ($scope, User) {
    $scope.user = User.get();
  }]);

}());
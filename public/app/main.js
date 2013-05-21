(function () {

  var app = angular.module('codecast', [
    'ngResource', 'code', 'room', 'chat', 'ace', 'uid'
  ]);

  /**
   * Configure
   */
  app.config([
    '$routeProvider',
    '$locationProvider',
    'uidProvider',
  function ($routeP, $locationP, uidProvider) {
    // Grab the uid generator. Not sure why this is neccesary.
    // TODO investigate
    var uid = uidProvider.$get();

    // Use nice URLs, no nasty hashbangs
    $locationP.html5Mode(true);

    // Routing
    $routeP
      .when('/start', {
        redirectTo: function (params, path, search) {
          return '/code/' + uid.generate();
        }
      })
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
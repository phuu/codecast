(function () {

  var chate = angular.module('chat', ['io']);

  chate.controller('ChatCtrl', [
    '$scope', 'io', '$routeParams', '$window',
  function ($scope, io, $routeParams, $window) {

    $scope.chat = {
      messages: [],
      newMessage: function (msg) {
        if ($scope.user.profile &&
            msg.author === $scope.user.profile.username) {
          msg.me = true;
        }
        $scope.chat.messages.push(msg);
      }
    };

    $scope.getShareUrl = function () {
      return $window.location.origin + '/w/' + $routeParams.room;
    };

    var socket = io.connect('/chat');
    socket.emit('join', $routeParams.room);

    // Listen for new chat messages
    socket.on('chat:msg', function (data) {
      $scope.$apply(function () {
        $scope.chat.newMessage(data);
      });
    });

    // Listen for all previous chat messages
    socket.on('chat:msgs', function (messages) {
      $scope.$apply(function () {
        messages.forEach($scope.chat.newMessage);
      });
    });

    // Send a chat message
    $scope.send = function () {
      if (!$scope.user.profile) return;
      if (!$scope.message.trim()) return;
      var msg = {
        body: $scope.message,
        author: $scope.user.profile.username
      };
      socket.emit('chat:msg', msg);
      $scope.chat.newMessage(msg);
      $scope.message = '';
    };
  }]);

}());
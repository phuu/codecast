(function () {

  var chate = angular.module('chat', ['io']);

  chate.controller('ChatCtrl', [
    '$scope', 'io', '$routeParams',
  function ($scope, io, $routeParams) {

    $scope.chat = {
      messages: [],
      newMessage: function (data) {
        $scope.chat.messages.push(data);
      }
    };

    $scope.room = $routeParams.room;

    var socket = io.connect('/chat');
    socket.emit('join', $routeParams.room);



    socket.on('chat:msg', function (data) {
      console.log.apply(console, [].slice.call(arguments));
      $scope.$apply(function () {
        $scope.chat.newMessage(data);
      });
    });

    $scope.send = function () {
      var msg = {
        body: $scope.message,
        author: $scope.user.profile.username
      };
      $scope.chat.newMessage(msg);
      socket.emit('chat:msg', msg);
    };
  }]);

}());
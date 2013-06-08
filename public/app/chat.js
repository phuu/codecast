(function () {

  var chate = angular.module('chat', ['io']);

  chate.controller('ChatCtrl', [
    '$scope', 'io', '$routeParams', '$window',
  function ($scope, io, $routeParams, $window) {

    $scope.chat = {
      messages: [],
      newMessage: function (data) {
        $scope.chat.messages.push(data);
      }
    };

    // $scope.room = $routeParams.room;

    // $scope.getShareUrl = function () {
    //   return $window.location.origin + '/w/' + $scope.room;
    // };

    // var socket = io.connect('/chat');
    // socket.emit('join', $routeParams.room);

    // socket.on('chat:msg', function (data) {
    //   console.log.apply(console, [].slice.call(arguments));
    //   $scope.$apply(function () {
    //     $scope.chat.newMessage(data);
    //   });
    // });

    // $scope.send = function () {
    //   var msg = {
    //     body: $scope.message,
    //     author: $scope.user.profile.username
    //   };
    //   socket.emit('chat:msg', msg);
    //   msg.me = true;
    //   $scope.chat.newMessage(msg);
    //   $scope.message = '';
    // };
  }]);

}());
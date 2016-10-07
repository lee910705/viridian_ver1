(function (angular) {
  "use strict";

  var app = angular.module('myApp.chat', ['ngRoute', 'firebase.utils', 'firebase']);

  app.controller('ChatCtrl', ['$scope', 'messageList', function($scope, messageList) {
      d3.select('svg').remove();
      $scope.messages = messageList;
      $scope.addMessage = function (newMessage) {
          console.log("called");
          if (newMessage) {
              $scope.messages.$add({ text: newMessage });
        }
      };
    }]);

  app.factory('messageList', ['fbutil', '$firebaseArray', function(fbutil, $firebaseArray) {
      d3.select('svg').remove();

      var ref = fbutil.ref('messages');
    return $firebaseArray(ref);
  }]);

  app.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/chat', {
      templateUrl: 'chat/chat.html',
      controller: 'ChatCtrl'
    });
  }]);

})(angular);
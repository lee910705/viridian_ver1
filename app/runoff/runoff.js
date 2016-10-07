(function (angular) {
    "use strict";

    var app = angular.module('myApp.runoff', ['ngRoute', 'firebase.utils', 'firebase']);

    app.controller('RunOffCtrl', ['$scope', 'runoffList', function ($scope, runoffList) {
        d3.select("svg").remove();

    }]);

    app.factory('runoffList', ['fbutil', '$firebaseArray', function (fbutil, $firebaseArray) {
        var ref = fbutil.ref('runoffs').limitToLast(10);
        return $firebaseArray(ref);
    }]);

    app.config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/runoff', {
            templateUrl: 'runoff/runoff.html',
            controller: 'RunOffCtrl'
        });
    }]);

})(angular);
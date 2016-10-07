(function (angular) {
    "use strict";

    var app = angular.module('myApp.status', ['ngRoute', 'firebase.utils', 'firebase']);

    app.controller('StatusCtrl', ['$scope', 'runoffList', function ($scope, runoffList) {
        d3.select("svg").remove();

        $scope.runoffs = runoffList;
        $scope.addrunoff = function (newDATE, newINPT, newPREF, newPH, newEC) {

            if (newDATE) {
                $scope.runoffs.$add({DATE: newDATE, INPT: newINPT, PREF: newPREF, PH: newPH, EC: newEC});
            }
        };
    }]);

    app.factory('runoffList', ['fbutil', '$firebaseArray', function (fbutil, $firebaseArray) {
        var ref = fbutil.ref('statusEntry');
        return $firebaseArray(ref);
    }]);

    app.config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/runoff', {
            templateUrl: 'runoff/runoff.html',
            controller: 'RunOffCtrl'
        });
    }]);

})(angular);
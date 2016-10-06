(function (angular) {
    "use strict";

    var app = angular.module('myApp.calendarEntry', ['ngRoute', 'firebase.utils', 'firebase']);



    app.controller('CalendarEntryCtrl', ['$scope', '$filter', 'calendarEntryList', function($scope, $filter, calendarEntryList) {
        d3.select("svg").remove();
        $scope.currentPhase = "ROOT";
        $scope.tasks = [];
        $scope.program = {
            startDate: "",
            ROOT: [],
            VEG: [],
            FLOWER: [],
            TRIM: []
        }
        $scope.orig = $scope.program;

        $scope.changePhase = function (changePhase) {
            $scope.currentPhase = changePhase;
            $scope.showTask($scope.currentPhase);
        }

        $scope.addTask = function (currentPhase, newDay, newHours, newTask) {
            var tmpTask = {"day": parseInt(newDay), "hours": parseInt(newHours), "task": newTask};
            $scope.program[currentPhase].push(tmpTask);
        }

        $scope.showTask = function (currentPhase) {
            $scope.tasks = $scope.program[currentPhase];
        }

        $scope.addStartDate = function (date) {
            var dateConverted = $filter('date')(date, "dd/MM/yyyy");
            $scope.program["startDate"] = dateConverted;
        }

        $scope.calendarEntries = calendarEntryList;
        $scope.addProgram = function () {
            var ref = new Firebase("https://viridian-49902.firebaseio.com");
            var cEntries = ref.child("calendarEntries");
            var data = angular.copy($scope.program);
            cEntries.push(data);
            $scope.program = {
                startDate: "",
                ROOT: [],
                VEG: [],
                FLOWER: [],
                TRIM: []
            }
            $scope.currentPhase = "ROOT";
            $scope.tasks = [];
      };

    }]);

  app.factory('calendarEntryList', ['fbutil', '$firebaseArray', function(fbutil, $firebaseArray) {
      var ref = fbutil.ref('calendarEntries');
    return $firebaseArray(ref);
  }]);

  app.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/calendarEntry', {
      templateUrl: 'calendarEntry/calendarEntry.html',
      controller: 'CalendarEntryCtrl'
    });
  }]);

})(angular);

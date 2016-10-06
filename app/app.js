'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp', [
    'myApp.config',
    'myApp.dashboard',
    'myApp.runoff',
    'myApp.calendarEntry'
])
  
  .config(['$routeProvider', function ($routeProvider) {
    $routeProvider.otherwise({
      redirectTo: '/dashboard'
    });
  }])
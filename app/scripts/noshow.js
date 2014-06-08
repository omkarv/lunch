'use strict';

angular.module('Lunch.noshow', [])

.config(function($stateProvider){
  $stateProvider
  .state('app.noshow', {
      url: '/noshow',
      views: {
        'menuContent' :{
          templateUrl: 'templates/noshow.html',
          controller: 'NoShowCtrl'
        }
      }
    })
})

.controller('NoShowCtrl', function($scope, $state, $interval) {
  var updateTime = function() {
    var time = new Date();
    var hourOfDay = time.getHours();
    if(hourOfDay < 8){
      $scope.hoursLeft = 8 - hourOfDay;
    } else if (hourOfDay >= 15)   {
      $scope.hoursLeft = 8 + 24 - hourOfDay;
    } else {
      $state.go('app.browse');
    }
    if($scope.hoursLeft === 1){
      $scope.hours = 'hour';
    } else {
      $scope.hours ='hours';
    }
  };

  updateTime();

  $interval(function(){
    updateTime();
  }, 60000);
});

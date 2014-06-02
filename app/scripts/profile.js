'use strict';
angular.module('Lunch.profile', ['openfb', 'Lunch.factory.Geo', 'Lunch.factory.storedUserData', 'Lunch.factory.requests'])  
.config(function($stateProvider) {
  $stateProvider
  .state('app.profile', {
    url: '/profile',
    views: {
      'menuContent' :{
        templateUrl: 'templates/profile.html',
        controller: 'ProfileCtrl'
      }
    }
  })
})
.controller('ProfileCtrl', function($rootScope, $scope, $ionicSlideBoxDelegate, storedUserData, OpenFB, Geo, localStore, requests) {
    $scope.userData = storedUserData;

    $scope.getLikes = function() {
        OpenFB.get('/me/likes') // deal with the case where a user unlikes something, the remove it
        .success(function(fbLikeObj,status, headers, config){
            // need to keep track of old ids
            var idTrack = {};
            angular.forEach(fbLikeObj.data, function(value, key){
              //if a new like / id 
              if(!$scope.userData.likes[value.id] && value.name){
                 //inform the database 
                 // add the new id locally
                $scope.userData.likes[value.id] = value.name;
                //  param = { userId: "231231" ,likes": [{ id:'4q21341',name:'fafdkj'},{}
              }
              //track id
              idTrack[value.id] = true;
            });
            //check ids fetched from fb to local ids.  if like stored locally no longer
            // avaiable from fb, inform the db and (then) delete locally
            for(var like in $scope.userData.likes) {
              if(!idTrack[like]){
                console.log('delete this like since it is no longer in fb likes');
                delete $scope.userData.likes[like]; // since the like no longer exists
                  //inform database using like.id and user.id and like.name ($scope.userData.likes[likeId])
              }
            }
            $rootScope.$emit('userDataChanged', $scope.userData);
        });
    };

    $scope.getPicture = function() {
        OpenFB.get('/me/picture?redirect=0&height=125&type=normal&width=100')//'/me/picture')
        .success(function(data, status, headers, config){
          if(data !== $scope.userData.photo_url){
            var image = "<div class='userimage'><img src='" + data.data.url + "'/></div>";
            angular.element(document.querySelector('#userimage')).html(image);
            $scope.userData.photo_url = data.data.url;
            //tell the database the image associated with the user has changed 
            $rootScope.$emit('userDataChanged', $scope.userData);
          }
        });
    };

    $scope.getDetails = function() {
        OpenFB.get('/me')
        .success(function(data,status, headers, config){
          $scope.userData.first_name = data.first_name;
          $scope.userData.last_name = data.last_name;
          $scope.userData.id = data.id;
          $scope.userData.updated_time = data.updated_time;
          $rootScope.$emit('userDataChanged', $scope.userData);
        });
    };

    $scope.tagClick = function(e){
      var clickedText = e.toElement.innerText;
      var pressed = $scope.userData.tags[clickedText];
      if(pressed){
        //toggle
        $scope.userData.tags[clickedText] = false;
      } else {
        $scope.userData.tags[clickedText] = true;
      }   
      $rootScope.$emit('userDataChanged', $scope.userData);
    };

    //when the look for a lunch buddy is clicked this function is executed
    //this will post the user details (photo, id, name)
    //post the user likes
    //post the user tags
    //NOTE: this function assumes the photo url, likes and tags are successfully fetched from the server 
    $scope.postUser = function(){
      requests.postBasicDetails({
        'id' : $scope.userData.id,
        'first_name': $scope.userData.first_name,
        'last_name': $scope.userData.last_name,
        'profileImage': $scope.userData.photo_url
      });
      //for all likes
      angular.forEach($scope.userData.likes , function(key, likeName){
        requests.postLike({
          'userId' : $scope.userData.id,
          'id': key,
          'name': likeName
        });
      });

      requests.postLocation({
        'userId': $scope.userData.id,
        'lat': $scope.userData.geolocation.latitude,
        'lng': $scope.userData.geolocation.longitude
      })


      
    };

    $rootScope.$on('geolocation', function(event, geoposition){
      $scope.userData.geolocation = geoposition.coords;
      $rootScope.$emit('userDataChanged', $scope.userData);
      //send geoloc to db
    });

    $scope.$on('$stateChangeSuccess', function(e, state) { // this triggers every time we go to the profile page, may need something else
        //these only refresh whenever there is no data in the connection and when there is an 
        //internet connection
        $scope.getDetails();
        $scope.getLikes();
        $scope.getPicture();
        Geo.getCurrentPosition();
        $rootScope.$emit('userDataChanged', $scope.userData);
    });
    //on scope change 
});

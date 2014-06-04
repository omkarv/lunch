'use strict';
angular.module('Lunch.profile', ['openfb', 'Lunch.factory.Geo', 'Lunch.factory.storedUserData', 'Lunch.factory.requests', 'matchData'])  
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
  });
})

.controller('ProfileCtrl', function($rootScope, $scope, $ionicSlideBoxDelegate, storedUserData, OpenFB, Geo, localStore, requests, matchData) {
  // Store data in scope
  $scope.userData = storedUserData;

  $scope.getLikes = function() {
    OpenFB.get('/me/likes') 
     .success(function(fbLikeObj){
        // need to keep track of old ids
        var idTrack = {};
        angular.forEach(fbLikeObj.data, function(value){
          //if a new like / id 
          if(!$scope.userData.likes[value.id] && value.name){
            //inform the database if a new id
            //add the new id and like data locally
            $scope.userData.likes[value.id] = value.name;
            $scope.postLikes(value);
          }
          //track id
          idTrack[value.id] = true;
        });
        //check ids fetched from fb to local ids.  if like stored locally no longer
        //avaiable from fb, inform the db and (then) delete locally
        for(var like in $scope.userData.likes) {
          if(!idTrack[like]){
            console.info('Deleteing like: ' + like + '; no longer in facebook');
            requests.deleteLike(like.id, {'userId': $scope.userData.id});
            delete $scope.userData.likes[like]; // since the like no longer exists
            //inform database using like.id and user.id and like.name ($scope.userData.likes[likeId])
          }
        }
      $rootScope.$emit('userDataChanged', $scope.userData);
    });
  };

    $scope.postLikes = function(likes) {
      angular.forEach(likes, function(likeName, key){
        requests.postLike({
          'userId' : $scope.userData.id,
          'id': key,
          'name': likeName
        });
      });
    };

    $scope.postTags = function() {
      angular.forEach($scope.userData.tags, function(value, key){
        if(value){ // only posts if tag is selected
          requests.postTag({
            'userId' : $scope.userData.id,
            'id': key,
            'name': key
          });
        }
      });
      //get matches since we have the user id from facebook
      $scope.getMatches();
    };

    $scope.getPicture = function() {
        OpenFB.get('/me/picture?redirect=0&height=133&type=normal&width=100')//'/me/picture')
        .success(function(data){
          if(data !== $scope.userData.photo_url){
            var image = "<div class='userimage'><img src='" + data.data.url + "'/></div>";
            angular.element(document.querySelector('#userimage')).html(image);
            $scope.userData.photo_url = data.data.url;
            //tell the database the image associated with the user has changed 
            $scope.postUser();
            $rootScope.$emit('userDataChanged', $scope.userData);
          }
        });
    };

    $scope.getDetails = function() {
        OpenFB.get('/me')
        .success(function(data){
          $scope.userData.first_name = data.first_name;
          $scope.userData.last_name = data.last_name;
          $scope.userData.id = data.id;
          $scope.userData.updated_time = data.updated_time;
          //update the database with user information from fb
          $scope.postUser();
          //store updates to data locally
          $rootScope.$emit('userDataChanged', $scope.userData);
        })
        .error(function(data){
          //if we have data for the user, and fb api is not available 
          // still post user data and tags
          if($scope.userData.id){
            $scope.postUser();
            $scope.postTags();
          }
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

    $scope.postUser = function(){ 
      requests.postBasicDetails({
        'id' : $scope.userData.id,
        'firstname': $scope.userData.first_name,
        'lastname': $scope.userData.last_name,
        'profileImage': $scope.userData.photo_url
      });
      $scope.postTags();
    };

    $scope.postLocation = function(pos) {
      $scope.userData.geolocation = pos.coords;
      OpenFB.checkLogin().then(function(id) {
        requests.postLocation({
          'userId': id,
          'lat': pos.coords.latitude,
          'lng': pos.coords.longitude
        }).then(function(res) {
          console.info('You are in ' + angular.fromJson(res).data.city);
          $scope.userData.location = angular.fromJson(res).data.city;
          $rootScope.$emit('userDataChanged', $scope.userData);
        });
      });
    };

    $scope.getMatches = function() {
      requests.getMatches({
        'userId': $scope.userData.id
      });
    };

    // Get phone-based user data
    $scope.$on('geolocation', function(event, geoposition){
      $scope.userData.geolocation = geoposition.coords;
      $rootScope.$emit('userDataChanged', $scope.userData);
      //send geoloc to db
      $scope.postLocation();
    });

    $rootScope.$on('userLocation', function(e, city){
      console.log('user location');
      console.log(city);
      $scope.userData.location = city; 
      $rootScope.$emit('userDataChanged', $scope.userData);
    });

      Geo.getCurrentPosition()
        .then(function(pos) { $scope.postLocation(pos); })
        .catch(function(err) { console.error(err); });
    });
});

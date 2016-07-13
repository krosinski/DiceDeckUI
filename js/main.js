
/**
 * Main AngularJS Web Application
 */

var app = angular.module('diceDeckApp', [
  'ui.slider', 'ngRoute', 'ngWebsocket'
]);
var ws = null;

/**
 * Configure the Routes
 */
app.config(['$routeProvider', function ($routeProvider) {
  $routeProvider
    .when("/", {templateUrl: "partials/home.html", controller: "PageCtrl"})
    .when("/login", {templateUrl: "partials/login.html", controller: "PageCtrl"})
    // else 404
    //.otherwise("/404", {templateUrl: "partials/404.html", controller: "PageCtrl"});
}]);

app.controller("RootCtrl", function($rootScope){
  console.log("Starting root controller");

  $rootScope.chatLog = [];
  $rootScope.players = {johny: "red"};
  $rootScope.playerData = {
    username: undefined,
    loggedIn: false,
    color: null
  };

  $rootScope.sendMessage = function(code, data) {
    ws.$emit(code, data);
  };

  $rootScope.addToChat = function(event, data) {
    var msg = {};
    //TODO: extract function
    var date = new Date(data.time);
    var hours = date.getHours();
    var minutes = "0" + date.getMinutes();
    var seconds = "0" + date.getSeconds();
    var formattedTime = hours + ':' + minutes.substr(minutes.length-2) + ':' + seconds.substr(seconds.length-2)

    if (event == 'chat') {
      msg.activity = "(" + formattedTime + ") " + data.author;
      msg.text =  data.message;
      msg.style = "color: " + data.color;
      msg.class = "chat-msg";
    }
    else if (event == 'roll') {
      msg.activity = "(" + formattedTime + ") " + data.author + "->" + data.count + "k" + data.dim;
      msg.text =  "";
      var total = 0;
      for (var idx in data.rolls) {
        msg.text += data.rolls[idx];
        total += data.rolls[idx];
        if (idx < data.rolls.length - 1) {
          msg.text += ", "
        }
      }
      if (data.rolls.length > 1) {
        msg.text = msg.text + " ( " + total + " )";
      }
      msg.style = "color: " + data.color + ";";
      msg.class = "roll-msg";
    }
    console.log("Adding message to chat " + msg);
    $rootScope.chatLog.unshift(msg);
  };
});

app.controller('MenuCtrl', function ($scope, $rootScope) {


});

app.controller('BoardCtrl', function ($scope, $rootScope /*, $location, $http */) {
  console.log("Board Controller reporting for duty.");

  $scope.currentMessage = null;
  $scope.diceMul = 1;

  $scope.sendChat = function() {
    if ($scope.currentMessage == null || typeof $scope.currentMessage == undefined || $scope.currentMessage.length <= 0) {
      return;
    }

    $rootScope.sendMessage("chat", {"message": $scope.currentMessage});
    $scope.currentMessage = null;
  }

  $scope.rollDice = function(dim, count) {
    $rootScope.sendMessage("roll", {dim: dim, count: $scope.diceMul});
  }

});

app.controller("LoginCtrl", function($scope, $rootScope){
  console.log("Starting login controller");
  $scope.loginForm = {
    name: ""
  };

  $scope.loginUser = function() {
    $rootScope.sendMessage("login", {username: $scope.loginForm.name});
  };

});


app.controller('PageCtrl', function (/* $scope, $location, $http */) {
  console.log("Page Controller reporting for duty.");

  // Activates the Carousel
  $('.carousel').carousel({
    interval: 5000
  });

  // Activates Tooltips for Social Links
  $('.tooltip-social').tooltip({
    selector: "a[data-toggle=tooltip]"
  })
});

app.run(function ($websocket, $rootScope, $interval) {
  var timer;
  ws = $websocket.$new(app_config.ws_app_hostname)
      .$on('$open', function () {
        console.log('ws open!');

        timer = $interval(function () {
          ws.$emit('ping', 'PING!')
        }, 5000);

        if ($rootScope.playerData.username != undefined) {

            $rootScope.sendMessage("login", {username: $rootScope.playerData.username});
        }

      })
      .$on('pong', function (data) {
        console.log("ws pong");
        console.log(data);
      })
      .$on('auth', function (data) {
        $rootScope.playerData.username = data.username;
        $rootScope.playerData.color = data.color;
        $rootScope.playerData.loggedIn = true;
        $rootScope.$apply();
      })
      .$on('chat', function (data) {
        console.log("Chat msg received " + data);
        $rootScope.addToChat('chat', data);
        $rootScope.$apply();

      })
      .$on('roll', function (data) {
        console.log("Roll received " + data)
        $rootScope.addToChat('roll', data);
        $rootScope.$apply();
      })
      .$on('history', function(data) {
          console.log("History inc " + data);

          for (var idx in data.messages) {
            $rootScope.addToChat(data.messages[idx].data.event, data.messages[idx].data);
          }
          for (var idx in data.players) {
            if (data.players[idx].username != null ){
              console.log("Loggedin:" + data.players[idx].username);
              $rootScope.players[data.players[idx].username] = {username: data.players[idx].username, color: data.players[idx].color};
            }

          }
          $rootScope.$apply();

      })
      .$on('logged_in', function(data) {
         console.log("Loggedin:" + data.username);
         $rootScope.players[data.username] = {username: data.username, color: data.color};
         $rootScope.$apply();
      })
      .$on('logged_out', function (data) {
         console.log("Loggedout:" + data.username);
         delete $rootScope.players[data.username];
         $rootScope.$apply();
      })
      .$on('$close', function () {
        console.log('ws close');
        $interval.cancel(timer);
      });

});

app.directive('ngEnter', function () {
  return function (scope, element, attrs) {
    element.bind("keydown keypress", function (event) {
      if(event.which === 13) {
        scope.$apply(function (){
          scope.$eval(attrs.ngEnter);
        });

        event.preventDefault();
      }
    });
  };
});

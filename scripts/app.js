// App JS

$(document).ready(function() {

  // First some display stuff to change the views
  $("#newResultButton").click(function() {
      $("#rankingView").hide("slow");
      $("#newResultView").show("slow");
  });

  $(".newPlayerButton").click(function() {
      $("#rankingView").hide("slow");
      $("#newResultView").hide("slow");
      $("#newPlayerView").show("slow");
  });

  $(".cancelButton").click(function() {
      $("#newResultView").hide("slow");
      $("#newPlayerView").hide("slow");
      $("#rankingView").show("slow");
  });

  // But what day is it?!
  var date = new Date();

  today = (date.toDateString());

  var config = {
    apiKey: "AIzaSyBXaqqLD07K97SknzNrgkr1LVtVMD5zyss",
    authDomain: "arpadio-3b99d.firebaseapp.com",
    databaseURL: "https://arpadio-3b99d.firebaseio.com",
    storageBucket: "arpadio-3b99d.appspot.com",
    messagingSenderId: "782130103264"
  };
  firebase.initializeApp(config);

  // The Firebase DB JSON blob
  const dbRef = firebase.database().ref();

  dbRef.on('value', function(snapshot) {

    var data = snapshot.val();

    // Dump everything!
    $("#rankingTable tbody").empty();
    $("#totalGames").empty();
    $("#resultsHistory tbody").empty();
    $('.playerOption').remove();

    function updateRatingTable() {

      // Convert to object to array so we can sort by ranking
      var rankedPlayers = [];
      for (var player in data.players) {
       rankedPlayers.push({
         id:player,
         name:data.players[player].name,
         nationality: data.players[player].nationality,
         won: data.players[player].won,
         lost: data.players[player].lost,
         rating:data.players[player].rating,
       });
      }
      rankedPlayers.sort(function(x,y){return y.rating - x.rating});
      var rank = 1;
      $.each(rankedPlayers, function(i, player) {
        $("#rankingTable tbody").append("<tr><td>" + rank + "</td><td>" + player.name + "</td><td>" + player.nationality + "</td><td>" + player.won + "</td><td>" + player.lost + "</td><td>" + player.rating + "</td></tr>");
        rank += 1;
      });
    }
    updateRatingTable();

    function updateResultSelects() {
      $.each(data.players, function(i, player){
        $(".resultSelect").append("<option class=\"playerOption\" value=" + i + ">" + player.name + "</option>");
      });
    }
    updateResultSelects();

    function updateResultsList() {
      $("#totalGames").append("Total games played: <strong>" + data.results.length + "<strong>" );
      var results = data.results;
      results.reverse();
      $.each(results, function(i, result) {
        $("#resultsHistory tbody").append("<tr><td>" + result.date + "</td><td>&mdash;</td><td>" + result.winner + " beat " + result.loser + "</td></tr>");
      });
    }
    updateResultsList();

    $("#submitResult").click(function() {

      // Find out who beat who
      var p1 = $( "#playerOne option:selected" ).text();
      var p2 = $( "#playerTwo option:selected" ).text();

      // Initialise some variables because scope
      var p1ID;
      var p2ID;
      var p1r;
      var p2r;
      var p1r1;
      var p2r1;
      var p1played;
      var p1won;
      var p2played;
      var p2lost;

      // Calculate new Elo ratings (step 1 according to Bektas)
      // We also increment played, won, lost
      $.each(data.players, function(i, player){
        if (p1 == player.name) {
          p1ID = i;
          p1played = player.played + 1;
          p1won = player.won + 1;
          p1r = player.rating;
          p1r1 = Math.pow(10, (p1r/400));
        }
        return p1r1;
      });
      $.each(data.players, function(i, player){
        if (p2 == player.name) {
          p2ID = i;
          p2played = player.played + 1;
          p2lost = player.lost + 1;
          p2r = player.rating;
          p2r1 = Math.pow(10, (p2r/400));
        }
        return p2r1;
      });

      // Find expectations (step 2 according to Bektas)
      var e1 = p1r1 / (p1r1 + p2r1);
      var e2 = p2r1 / (p1r1 + p2r1);

      // Set result (player 1 is always the winner in this app)
      var s1 = 1;
      var s2 = 0;

      // Introduce the constant
      // We use 10 because the Fédération Internationale des Échecs does for pros like this
      var k = 10

      // Calculate new rankings
      var p1n = p1r + k * (s1 - e1);
      var p2n = p2r + k * (s2 - e2);

      // Tidy up after ourselves
      p1n = Math.round(p1n);
      p2n = Math.round(p2n);

      // Sanity check
      console.log(p1 +"'s new rating is " + p1n + " and " + p2 + "'s new rating is " + p2n);

      // Write the new player ratings data to the Firebase DB
      var updates = {};

      // Winner new data
      updates['/players/' + p1ID + '/rating'] = p1n;
      updates['/players/' + p1ID + '/played'] = p1played;
      updates['/players/' + p1ID + '/won'] = p1won;

      // Loser new data
      updates['/players/' + p2ID + '/rating'] = p2n;
      updates['/players/' + p2ID + '/played'] = p2played;
      updates['/players/' + p2ID + '/lost'] = p2lost;

      // Record of the game consigned to history
      var consignment = {
        "date" : today,
        "loser" : p2,
        "winner" : p1
      };
      var gameNumber = data.results.length;

      firebase.database().ref('/results/' + gameNumber).set(consignment);
      firebase.database().ref().update(updates);

      // Prevents undiagnosed empty scores
      location.reload(true);

    });

  });

  $("#addPlayer").click(function() {

    $(".helpText").remove();

    var npName = $.trim($('#npName').val());
    var npNationality = $.trim($('#npNationality').val());

    // Some basic form validation
    if ((npName == '') && (npNationality == '')) {
      $('#npName').before("<p class=\"helpText\">Please enter the new player's <strong>name<strong></p>");
      $('#npNationality').before("<p class=\"helpText\">Please enter the new player's <strong>nationality<strong></p>");
    } else if (npName == '') {
      $('#npName').before("<p class=\"helpText\">Please enter the new player's <strong>name<strong></p>");
    } else if (npNationality == '') {
      $('#npNationality').before("<p class=\"helpText\">Please enter the new player's <strong>nationality<strong></p>");
    } else {
      firebase.database().ref('/players/').push({
        name: npName,
        nationality: npNationality,
        played: 0,
        won: 0,
        lost: 0,
        rating: 1000
      });
      // Prevents undiagnosed empty rating for new results
      location.reload(true);
    }

  });

  $("#resetButton").click(function() {
    $.getJSON('./data/reset.json', function (resetData) {
      console.log(resetData);
      firebase.database().ref().set(resetData);
      location.reload(true);
    });
  });

});

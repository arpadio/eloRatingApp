// App JS

// First some display stuff to change the views
$("#newResultButton").click(function() {
    $("#rankingView").hide("slow");
    $("#newResultView").show("slow");
});

$("#cancelButton").click(function() {
    $("#rankingView").show("slow");
    $("#newResultView").hide("slow");
});

// But what day is it?!
var date = new Date();

// All the data stuff
$(document).ready(function() {

  $.getJSON('./data/players.json', function (data) {

    var players = (Object.keys(data).length);

    function fillTable() {

      // First turn object into array
      var rankedPlayers = [];
      for (var key in data) {
        rankedPlayers.push({
          key:key,
          rating:data[key].rating,
          name:data[key].name,
          nationality:data[key].nationality
        });
      }

      // Now sort it by rating:
      rankedPlayers.sort(function(x,y){return y.rating - x.rating});

      // Now fill the table
      var rank = 1;
      for (var i=0;i<rankedPlayers.length;i++) {
        var player = data[rankedPlayers[i].key];
        $("#rankingTable").append("<tr><td>" + rank + "</td><td>" + player.name + "</td><td>" + player.nationality + "</td><td>" + player.rating + "</td></tr>");
        rank += 1;
      }
    }

    fillTable();

    // Add the players to the new result selects
    $.each(data, function(i, player){
      $("#playerOne").append("<option value=" + i + ">" + player.name + "</option>");
      $("#playerTwo").append("<option value=" + i + ">" + player.name + "</option>");
    });

    // The calculation that update's everyone's ratings
    $("#submitResult").click(function() {

      // Find out who beat who
      var p1 = $( "#playerOne option:selected" ).text();
      var p2 = $( "#playerTwo option:selected" ).text();

      // Commit it to history
      $("#emptyState").hide();
      $("#resultsHistory").append("<li>" + date.toDateString() + " &nbsp;&mdash;&nbsp; <strong>" + p1 + " beat " + p2 + "</strong></option>");

      // Initialise some variables because scope
      var p1r;
      var p2r;
      var p1r1;
      var p2r1;

      // Calculate new Elo ratings (step 1 according to Bektas)
      $.each(data, function(i, player){
        if (p1 == player.name) {
          p1r = player.rating;
          p1r1 = Math.pow(10, (p1r/400));
        }
        return p1r1;
      });
      $.each(data, function(i, player){
        if (p2 == player.name) {
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
      // We use 40 because the Fédération Internationale des Échecs does for newbies
      var k = 40

      // Calculate new rankings
      var p1n = p1r + k * (s1 - e1);
      var p2n = p2r + k * (s2 - e2);

      // Tidy up after ourselves
      p1n = Math.round(p1n);
      p2n = Math.round(p2n);

      // Sanity check
      console.log(p1 +"'s new rating is " + p1n + " and " + p2 + "'s new rating is " + p2n);

      // Update each player's rating
      $.each(data, function(i, player){
        if (p1 == player.name) {
          player.rating = p1n;
        }
        if (p2 == player.name) {
          player.rating = p2n;
        }
      });

      // Dump the old ranking
      $("#rankingTable").empty();

      // Reset the player selects
      $('select').prop('selectedIndex', 0);

      // Pump in the new ranking
      fillTable();

      // Swap the view back to the table
      $("#rankingView").show("slow");
      $("#newResultView").hide("slow");
    });

  });
});

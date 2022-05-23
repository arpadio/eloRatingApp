// App JS
document.addEventListener("DOMContentLoaded", () => {

  const date = new Date();
  const today = date.toDateString();

  const config = {
    apiKey: "AIzaSyBXaqqLD07K97SknzNrgkr1LVtVMD5zyss",
    authDomain: "arpadio-3b99d.firebaseapp.com",
    databaseURL: "https://arpadio-3b99d.firebaseio.com",
    storageBucket: "arpadio-3b99d.appspot.com",
    messagingSenderId: "782130103264"
  };

  // Load firebasejs before app.js
  firebase.initializeApp(config);

  // The Firebase DB JSON blob
  const dbRef = firebase.database().ref();

  // Commonly handled elements
  const rankingTable = document.querySelector('#rankingView table tbody');
  const resultsList = document.querySelector('#resultsList');
  const playerOptions = document.querySelectorAll('.playerOption');

  // When the Firebase DB changes...
  dbRef.on('value', function(snapshot) {

    const data = snapshot.val();

    // Clear all data to allow live updates
    rankingTable.innerHTML = '';
    resultsList.innerHTML = '';
    playerOptions.forEach((option, i) => {
      option.remove();
    });


    // Push players to array to allow sorting
    let rankedPlayers = [];
    for (let player in data.players) {
     rankedPlayers.push({
       id: player,
       name: data.players[player].name,
       nationality: data.players[player].nationality,
       won: data.players[player].won,
       lost: data.players[player].lost,
       rating: data.players[player].rating,
     });
    }

    // Sort by rank
    rankedPlayers.sort((x,y) => {
      return y.rating - x.rating}
    );

    // Add data to UI
    const updateRatingTable = () => {

      rankedPlayers.forEach((player, index) => {

        const rank = index + 1;
        const rowContent = `
          <td> ${rank}</td>
          <td> ${player.name}</td>
          <td> ${player.nationality}</td>
          <td> ${player.won}</td>
          <td> ${player.lost}</td>
          <td> ${player.rating}</td>`;

        let newRow = rankingTable.insertRow(rankingTable.rows.length);
        newRow.innerHTML = rowContent;

      })
    }

    updateRatingTable();

    const updateResultsList = () => {

      let gamesCount = document.getElementById('totalGames');
      gamesCount.innerHTML = `${data.results.length} games played`;

      const results = data.results.reverse();
      results.forEach((result, index) => {
        let newResult = document.createElement('div');
        newResult.classList.add('flexbox');

        newResult.innerHTML = `
          <div class="flex-child result-date">
            <p class="alt-text no-margin">${result.date}</p>
          </div>
          <div class="flex-child result-result">
            <p>${result.winner} beat ${result.loser}</p>
          </div>`;

        resultsList.appendChild(newResult);
      });
    }

    updateResultsList();

    const updateResultSelects = () => {

      const selects = document.querySelectorAll(".resultSelect");

      rankedPlayers.forEach((player, index) => {
        let newOptionW = document.createElement('option');
        newOptionW.classList.add('playerOption');
        newOptionW.setAttribute('value', index);
        newOptionW.innerHTML = player.name;
        let newOptionL = newOptionW.cloneNode(true);
        selects[0].appendChild(newOptionW);
        selects[1].appendChild(newOptionL);
      });

    }

    updateResultSelects();

    // Submitting new results

    const sumbitResult = document.getElementById('submitResult');
    submitResult.addEventListener('click', (event) => {

      const winner = document.querySelector("#playerOne option:checked");
      const loser = document.querySelector("#playerTwo option:checked");
      let p1 = winner.textContent;
      let p2 = loser.textContent;

      // Basic validation
      if (p1 === '' && p2 === '') {
        winnerError.classList.add('form-error-active');
        loserError.innerHTML = 'Please select the loser';
        loserError.classList.add('form-error-active');
        return false
      } else if (p1 === '')  {
        winnerError.classList.add('form-error-active');
        return false
      }
      if (p2 === '') {
        loserError.innerHTML = 'Please select the loser'
        loserError.classList.add('form-error-active');
        return false
      }
      if (p1 === p2) {
        loserError.innerHTML = 'The players must be different';
        loserError.classList.add('form-error-active');
        return false
      }

      // If validation passes...
      // Initialise all variables used in ranking algorithm
      let p1ID;
      let p2ID;
      let p1r;
      let p2r;
      let p1r1;
      let p2r1;
      let p1played;
      let p1won;
      let p2played;
      let p2lost;

      // Calculate new Elo ratings (step 1 according to Bektas)
      // We also increment played, won, lost
      for (let player in data.players){
        playerObject = (data.players[player]);
        if (p1 == playerObject.name) {
          p1ID = player;
          console.log(p1ID);
          p1played = playerObject.played + 1;
          p1won = playerObject.won + 1;
          p1r = playerObject.rating;
          p1r1 = Math.pow(10, (p1r/400));
        } else if (p2 == playerObject.name) {
          p2ID = player;
          console.log(p2ID);
          p2played = playerObject.played + 1;
          p2lost = playerObject.lost + 1;
          p2r = playerObject.rating;
          p2r1 = Math.pow(10, (p2r/400));
        }
      };

      // Find expectations (step 2 according to Bektas)
      let e1 = p1r1 / (p1r1 + p2r1);
      let e2 = p2r1 / (p1r1 + p2r1);

      // Set result (player 1 is always the winner in this app)
      let s1 = 1;
      let s2 = 0;

      // The K factor
      // Fédération Internationale des Échecs uses 10 for anyone over 2400.
      // Elo originally recommended 16 for grandmasters and 32 for amateurs
      let k = 16

      // Calculate new rankings
      let p1n = p1r + k * (s1 - e1);
      let p2n = p2r + k * (s2 - e2);

      // Tidy up after ourselves
      p1n = Math.round(p1n);
      p2n = Math.round(p2n);

      // Sanity check
      console.log(`${p1}'s new rating is ${p1n} and ${p2}'s new rating is ${p2n}`);

      // Write the new player ratings data to the Firebase DB
      let updates = {};

      // Winner new data
      updates['/players/' + p1ID + '/rating'] = p1n;
      updates['/players/' + p1ID + '/played'] = p1played;
      updates['/players/' + p1ID + '/won'] = p1won;

      // Loser new data
      updates['/players/' + p2ID + '/rating'] = p2n;
      updates['/players/' + p2ID + '/played'] = p2played;
      updates['/players/' + p2ID + '/lost'] = p2lost;

      // Record of the game consigned to history
      let consignment = {
        "date" : today,
        "loser" : p2,
        "winner" : p1
      };
      let gameNumber = data.results.length;

      firebase.database().ref('/results/' + gameNumber).set(consignment);
      firebase.database().ref().update(updates);

      // Prevents undiagnosed empty scores
      location.reload(true);
    });

  }); // End on 'value'

  // Adding new players
  const addPlayer = document.getElementById('addPlayer');
  addPlayer.addEventListener('click', (event) => {

    let npFirst = document.getElementById('npFirst').value;
    npFirst = npFirst.trim();
    let npLast = document.getElementById('npLast').value;
    npLast = npLast.trim();
    let npName = `${npFirst} ${npLast}`;

    let npNationality = document.getElementById('npNationality').value;
    npNationality = npNationality.trim();

    // Some basic form validation
    if (npFirst == '') {
      document.getElementById('firstError').classList.add('form-error-active');
    }
    if (npLast == '') {
      document.getElementById('lastError').classList.add('form-error-active');
    }
    if (npNationality == '') {
      document.getElementById('nationalityError').classList.add('form-error-active');
    }
    if (npFirst == '' || npLast == '' || npNationality == '') {
      return false;
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

  // Control the views
  const rankingView = document.getElementById('rankingView');
  const newResultView = document.getElementById('newResultView');
  const newPlayerView = document.getElementById('newPlayerView');

  const newResultButton = document.getElementById('newResultButton');
  const newPlayerButton = document.querySelectorAll('.newPlayerButton');
  const cancelButton = document.querySelectorAll('.cancel-btn');

  newResultButton.addEventListener('click', () => {
    rankingView.style.display = "none";
    newPlayerView.style.display = "none";
    newResultView.style.display = "block";
  })

  newPlayerButton.forEach((button, index) => {
    button.addEventListener('click', () => {
      rankingView.style.display = "none";
      newResultView.style.display = "none";
      newPlayerView.style.display = "block";
    })
  });

  cancelButton.forEach((button, index) => {
    button.addEventListener('click', () => {
      newResultView.style.display = "none";
      newPlayerView.style.display = "none";
      rankingView.style.display = "block";
    })
  });

  // Remove form validation when errors are fixed
  const npFirstField = document.querySelector('#npFirst');
  const npLastField = document.querySelector('#npLast');
  const npNationality = document.querySelector('#npNationality');
  const winnerSelect = document.querySelector('#playerOne');
  const loserSelect = document.querySelector('#playerTwo');

  const removeFieldErrors = (errorID) => {
    if (event.target.value != '') {
      document.getElementById(errorID).classList.remove('form-error-active');
    }
  }

  npFirstField.addEventListener('blur', (event) => {
    removeFieldErrors('firstError');
  });

  npLastField.addEventListener('blur', (event) => {
    removeFieldErrors('lastError');
  });

  npNationality.addEventListener('blur', (event) => {
    removeFieldErrors('nationalityError');
  });

  const removeSelectErrors = (errorID) => {
    if (event.target.value != 'none') {
      document.getElementById(errorID).classList.remove('form-error-active');
    }
  }

  winnerSelect.addEventListener('change', (event) => {
    removeSelectErrors('winnerError');
  });

  loserSelect.addEventListener('change', (event) => {
    removeSelectErrors('winnerError');
  });


  // Reset all data if required
  const resetButton = document.getElementById('resetButton');
  resetButton.addEventListener('click', (event) => {
    fetch('./assets/reset.json')
    .then(response => {
      return response.json();
    })
    .then(resetData => {
      firebase.database().ref().set(resetData);
      location.reload(true);
    })
  });

});

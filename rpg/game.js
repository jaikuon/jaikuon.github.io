let totalTraps = 0;
const FINAL_SHOWDOWN_ROUND = 20;
let players = [];
let roundCounter = 1;
let gameInProgress = false;
let deathLog = [];

class Item {
    constructor(name, effects) {
        this.name = name;
        this.effects = effects;
    }

    applyEffects(player) {
        for (let stat in this.effects) {
            if (player.stats.hasOwnProperty(stat)) {
                player.stats[stat] += this.effects[stat];
                logMessage(`${player.name}'s ${stat} changed by ${this.effects[stat]}. Current ${stat}: ${player.stats[stat]}`);
            }
        }
    }
}

class Player {
    constructor(name) {
        this.name = name;
        this.stats = { 'HP': 5, 'STR': 5, 'DEF': 5, 'STA': 5, 'INT': 5, 'CHA': 5 };
        this.inventory = [];
        this.alliances = new Set();
    }

    formAlliance(otherPlayer) {
        this.alliances.add(otherPlayer.name);
        otherPlayer.alliances.add(this.name);
    }

    breakAlliance(otherPlayer) {
        this.alliances.delete(otherPlayer.name);
        otherPlayer.alliances.delete(this.name);
        logMessage(`${this.name} and ${otherPlayer.name} have broken their alliance.`);
    }

    breakAllAlliances() {
        this.alliances.forEach(allyName => {
            const ally = players.find(p => p.name === allyName);
            if (ally) {
                this.breakAlliance(ally);
            }
        });
    }

    addItem(item) {
        this.inventory.push(item);
    }

    useItem(itemName) {
        for (let i = 0; i < this.inventory.length; i++) {
            if (this.inventory[i].name === itemName) {
                this.inventory[i].applyEffects(this);
                this.inventory.splice(i, 1);
                logMessage(`${itemName} used. Effects applied.`);
                return;
            }
        }
        logMessage(`No item named ${itemName} found in inventory.`);
    }

    listInventory() {
        if (this.inventory.length === 0) {
            return "Inventory is empty.";
        } else {
            return this.inventory.map(item => item.name).join(', ');
        }
    }

    listAlliances() {
        if (this.alliances.size === 0) {
            return "No alliances.";
        } else {
            return Array.from(this.alliances).join(', ');
        }
    }
}

function logMessage(message) {
    const logDiv = document.getElementById('game-log');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    logDiv.appendChild(messageElement);
}

function clearGameLog(roundNumber) {
    const logDiv = document.getElementById('game-log');
    logDiv.innerHTML = ''; // Clears all content in the game log
    const roundMessage = document.createElement('div');
    roundMessage.textContent = `Round ${roundNumber}`;
    roundMessage.style.fontWeight = 'bold';
    logDiv.appendChild(roundMessage);
}

function randomizeStats(player, totalPoints = 20) {
    const statKeys = Object.keys(player.stats);
    while (totalPoints > 0) {
        const availableStats = statKeys.filter(stat => player.stats[stat] < 25);
        if (availableStats.length === 0) break;
        const statToIncrease = availableStats[Math.floor(Math.random() * availableStats.length)];
        const maxPossibleIncrease = Math.min(totalPoints, 25 - player.stats[statToIncrease]);
        const increaseAmount = Math.floor(Math.random() * maxPossibleIncrease) + 1;
        player.stats[statToIncrease] += increaseAmount;
        totalPoints -= increaseAmount;
    }
}

function createPlayer(name) {
    const newPlayer = new Player(name);
    randomizeStats(newPlayer);
    return newPlayer;
}

function calculateEventProbabilities(player, totalTraps, totalPlayers, roundCounter) {
    const baseProbabilities = {
        'neutral': 0.6,
        'item': 0.1 + player.stats['INT'] * 0.025,
        'combat': 0.15 + 0.01 * roundCounter,
        'trap setup': 0.05,
        'trap fall': Math.max(0, totalTraps * 0.05 - player.stats['INT'] * 0.025),
        'sponsorship': 0.1 + player.stats['CHA'] * 0.025,
        'alliance': 0.1 + player.stats['CHA'] * 0.025,
        'alliance break': 0.1 + (player.alliances.size / totalPlayers) * 0.05
    };

    // Adjust probabilities for the final showdown or when 5 or fewer players are left
    if (roundCounter >= FINAL_SHOWDOWN_ROUND || totalPlayers <= 5) {
        baseProbabilities['neutral'] = 0.4;
        baseProbabilities['item'] = 0.1;
        baseProbabilities['combat'] = 0.4;
        baseProbabilities['trap setup'] = 0.05;
        baseProbabilities['trap fall'] = 0.05;
        baseProbabilities['sponsorship'] = 0;
        baseProbabilities['alliance'] = 0;
        baseProbabilities['alliance break'] = 0.4;

        const additionalCombatChance = Math.min(0.05 * (roundCounter - FINAL_SHOWDOWN_ROUND), 0.3);
        baseProbabilities['combat'] += additionalCombatChance;
        baseProbabilities['neutral'] -= additionalCombatChance;
    }

    const total = Object.values(baseProbabilities).reduce((a, b) => a + b, 0);
    for (let event in baseProbabilities) {
        baseProbabilities[event] /= total;
    }

    return baseProbabilities;
}

function executeEvent(player, players, basicItemsByStat, roundCounter) {
    if (player.stats.HP <= 0) return;

    const events = ['neutral', 'item', 'combat', 'trap setup', 'trap fall', 'sponsorship', 'alliance', 'alliance break'];
    const probabilities = Object.values(calculateEventProbabilities(player, totalTraps, players.length, roundCounter));
    const chosenEvent = weightedRandomChoice(events, probabilities);

    const eligibleOpponents = players.filter(p => p !== player && !player.alliances.has(p.name));
    const potentialAllies = players.filter(p => p !== player && !player.alliances.has(p.name));

    if (chosenEvent === 'combat' && eligibleOpponents.length === 0) {
        logMessage(`${player.name} has no eligible opponents for combat.`);
        return;
    }
    
    if (chosenEvent === 'alliance' && (roundCounter >= FINAL_SHOWDOWN_ROUND || potentialAllies.length === 0)) {
        logMessage(`${player.name} cannot form new alliances.`);
        return;
    }

    logMessage(`\n${player.name}'s turn - Chosen Event: ${chosenEvent}`);

    switch (chosenEvent) {
        case 'neutral':
            logMessage(`${player.name} has a peaceful moment.`);
            break;
        case 'item':
            handleItemEvent(player, basicItemsByStat);
            break;
        case 'combat':
            handleCombatEvent(player, eligibleOpponents, players);
            break;
        case 'trap setup':
            totalTraps++;
            logMessage(`${player.name} sets up a trap. Total traps on the ground: ${totalTraps}`);
            break;
        case 'trap fall':
            player.stats.HP -= 4;
            logMessage(`${player.name} falls into a trap and loses 4 HP. Current HP: ${player.stats.HP}`);
            if (player.stats.HP <= 0) {
                handlePlayerDeath(player, players, 'a trap');
            }
            break;
        case 'sponsorship':
            handleSponsorshipEvent(player, basicItemsByStat);
            break;
        case 'alliance':
            handleAllianceEvent(player, potentialAllies);
            break;
        case 'alliance break':
            handleRandomAllianceBreak(player);
            break;
    }
}

function handleRandomAllianceBreak(player) {
    if (player.alliances.size > 0) {
        const randomAllyName = Array.from(player.alliances)[Math.floor(Math.random() * player.alliances.size)];
        const randomAlly = players.find(p => p.name === randomAllyName);
        if (randomAlly) {
            player.breakAlliance(randomAlly);
        }
    }
}

function weightedRandomChoice(items, weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let randomValue = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
        if (randomValue < weights[i]) {
            return items[i];
        }
        randomValue -= weights[i];
    }
}

function handleItemEvent(player, basicItemsByStat) {
    const statTypes = ['HP', 'DEF', 'STR', 'STA', 'INT', 'CHA'];
    const statProbabilities = [0.20, 0.15, 0.15, 0.25, 0.15, 0.10];
    const chosenStat = weightedRandomChoice(statTypes, statProbabilities);

    const itemsForStat = basicItemsByStat[chosenStat];
    const itemNames = Object.keys(itemsForStat);
    const itemChances = itemNames.map(name => itemsForStat[name]);
    const chosenItemName = weightedRandomChoice(itemNames, itemChances);

    const effectValue = itemsForStat[chosenItemName];
    const foundItem = new Item(chosenItemName, { [chosenStat]: effectValue });

    player.addItem(foundItem);
    player.useItem(chosenItemName);
    logMessage(`${player.name} finds and uses a ${chosenItemName}.`);
}

function handleCombatEvent(player, eligibleOpponents, players) {
    const opponent = eligibleOpponents[Math.floor(Math.random() * eligibleOpponents.length)];
    logMessage(`${player.name} engages in combat with ${opponent.name}.`);

    const attackStrength = player.stats['STR'];
    const defenseReduction = opponent.stats['DEF'] * 0.10;
    const effectiveDefense = defenseReduction <= attackStrength ? defenseReduction : defenseReduction * 0.75;
    const damage = Math.max(1, attackStrength - Math.floor(attackStrength * effectiveDefense));

    opponent.stats['HP'] -= damage;
    logMessage(`${opponent.name}'s HP changed by -${damage}. Current HP: ${opponent.stats['HP']}`);

    if (opponent.stats['HP'] <= 0) {
        handlePlayerDeath(opponent, players, player.name);
    }
}

function handlePlayerDeath(player, players, killer) {
    logMessage(`${player.name}'s HP reached zero. ${player.name} is dead.`);
    deathLog.push({ name: player.name, round: roundCounter, killer: killer });
    players.splice(players.indexOf(player), 1);
    players.forEach(p => p.alliances.delete(player.name));
}

function handleSponsorshipEvent(player, basicItemsByStat) {
    const lowestStat = Object.keys(player.stats).reduce((a, b) => player.stats[a] < player.stats[b] ? a : b);
    const itemsForStat = basicItemsByStat[lowestStat];
    const itemNames = Object.keys(itemsForStat);
    const chosenItemName = itemNames[Math.floor(Math.random() * itemNames.length)];

    const effectValue = itemsForStat[chosenItemName];
    const sponsoredItem = new Item(chosenItemName, { [lowestStat]: effectValue });

    player.addItem(sponsoredItem);
    player.useItem(chosenItemName);
    logMessage(`${player.name} receives sponsorship and gets a ${chosenItemName} to boost their ${lowestStat}.`);
}

function handleAllianceEvent(player, potentialAllies) {
    const newAlly = potentialAllies[Math.floor(Math.random() * potentialAllies.length)];
    player.formAlliance(newAlly);
    logMessage(`${player.name} and ${newAlly.name} have formed an alliance.`);
}

function displayPlayersStats(players) {
    const playerStatsContainer = document.getElementById('player-stats-container');
    playerStatsContainer.innerHTML = ''; // Clear previous stats
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.classList.add('player-stats');
        let statsHtml = `<strong>${player.name}</strong><br>`;
        for (const [stat, value] of Object.entries(player.stats)) {
            statsHtml += `${stat}: ${value}<br>`;
        }
        statsHtml += `<strong>Inventory:</strong> ${player.listInventory()}<br>`;
        statsHtml += `<strong>Alliances:</strong> ${player.listAlliances()}<br>`;
        playerDiv.innerHTML = statsHtml;
        playerStatsContainer.appendChild(playerDiv);
    });
}

function executeSingleRound(players, basicItemsByStat, roundCounter) {
    clearGameLog(roundCounter); // Clear previous round's logs and print round number
    players.forEach(player => {
        executeEvent(player, players, basicItemsByStat, roundCounter);
    });

    // Auto-break alliances and start final showdown if conditions are met
    if (players.length <= 5 || roundCounter >= FINAL_SHOWDOWN_ROUND) {
        logMessage("\n--- Final Showdown! ---");
        players.forEach(player => player.breakAllAlliances());
    }

    players = players.filter(player => player.stats['HP'] > 0); // Update players to reflect only those alive
    displayPlayersStats(players);
    logMessage("\n--- End of Round ---");

    if (players.length <= 1) {
        logMessage("\n--- Game Over ---");
        if (players.length > 0) {
            logMessage(`The winner is ${players[0].name}!`);
        } else {
            logMessage("No players remaining.");
        }
        gameInProgress = false;
        displayDeathLog();
        document.getElementById('controls').style.display = 'none'; // Hide play round button
    }
}

function displayDeathLog() {
    logMessage("\n--- Death Log ---");
    deathLog.forEach(entry => {
        logMessage(`${entry.name} died in Round ${entry.round}, killed by ${entry.killer}.`);
    });
}

function startGame() {
    const numPlayers = parseInt(document.getElementById('num-players').value, 10);
    if (isNaN(numPlayers) || numPlayers <= 0) {
        logMessage("Number of players must be greater than 0.");
        return;
    }

    players = [];
    deathLog = []; // Reset death log at the start of the game
    for (let i = 0; i < numPlayers; i++) {
        let playerName = prompt("Enter player's name:");
        if (playerName) {
            players.push(createPlayer(playerName));
        }
    }

    logMessage("\n--- Initial Player Stats ---");
    displayPlayersStats(players);

    gameInProgress = true;
    document.getElementById('controls').style.display = 'block'; // Show play round and reset buttons
    document.getElementById('start-section').style.display = 'none'; // Hide start game controls
    roundCounter = 1;
}

function playRound() {
    if (!gameInProgress) {
        logMessage("No game is currently in progress.");
        return;
    }

    if (players.length > 1) {
        executeSingleRound(players, createBasicItems(), roundCounter);
        roundCounter++;
    }
}

function resetGame() {
    gameInProgress = false;
    players = [];
    roundCounter = 1;
    totalTraps = 0;
    deathLog = [];
    document.getElementById('game-log').innerHTML = '';
    document.getElementById('player-stats-container').innerHTML = '';
    document.getElementById('controls').style.display = 'none'; // Hide play round and reset buttons
    document.getElementById('start-section').style.display = 'block'; // Show start game controls
    logMessage("Game reset. Enter the number of players to start a new game.");
}

function createBasicItems() {
    return {
        'HP': { 'Bandaid': 3.0 },
        'DEF': { 'Armor': 3.0 },
        'STR': { 'Knife': 1.0 },
        'STA': { 'Burger': 3.0 },
        'INT': { 'Book': 2.0 },
        'CHA': { 'Makeup': 2.0 }
    };
}

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
dotenv.config();
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const TIMEOUT = 1300;
let matchesData = {};
let playerData = {};
let totalRequests = 0;

function apiCall(url){
    totalRequests++;
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
           const data = await fetch(url).catch(err => reject(err));
           resolve(data);
           console.log('request...');
        }, TIMEOUT);
    });
}

async function getRankData(tier){
    const fetchResponse = await apiCall(`https://euw1.api.riotgames.com/lol/league-exp/v4/entries/RANKED_SOLO_5x5/${tier}/I?page=1&api_key=${process.env.RIOT_KEY}`);
    const jsonData = await fetchResponse.json();
    let totalGamesPlayed = 0;
    jsonData.forEach(e => {
        totalGamesPlayed += (e.losses + e.wins);
    });
    totalGamesPlayed /= jsonData.length;
    return totalGamesPlayed;
}

async function loadPlayers(){
    addRanksToObject(playerData);
    for(let i = 0; i < TIERS.length; i++){
        const response = await apiCall(`https://euw1.api.riotgames.com/lol/league-exp/v4/entries/RANKED_SOLO_5x5/${TIERS[i]}/I?page=1&api_key=${process.env.RIOT_KEY}`);
        const players = await response.json();
        for(let j = 0; j < players.length; j++){
            const accountID = players[j].summonerId;
            const accInfoResponse = await apiCall(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/${accountID}?api_key=${process.env.RIOT_KEY}`);
            const accountInfo = await accInfoResponse.json();
            playerData[TIERS[i].toLowerCase()].push(accountInfo);
        }
    }
}

async function getNumGamesPerRank(){
    let data = [];
    for(let i = 0; i < TIERS.length; i++){
        const rankData = await getRankData(TIERS[i]);
        data.push(rankData);
    }
    return data;
}

async function getAccountLevelPerRank(){
    const data = [];
    for(let i = 0; i < TIERS.length; i++){
        let averageLevel = 0;
        for(let j = 0; j < playerData[TIERS[i].toLowerCase()].length; j++){
            const accountLevel = playerData[TIERS[i].toLowerCase()][j].summonerLevel;
            averageLevel += accountLevel;
        }
        averageLevel /= playerData[TIERS[i].toLowerCase()].length;
        data.push(averageLevel);
    }
    return data;
}

async function fetchDataForMatches(){
    addRanksToObject(matchesData);
    for(let i = 0; i < TIERS.length; i++){ // Loop through tiers
        for(let j = 0; j < playerData[TIERS[i].toLowerCase()].length; j++){
            const player = playerData[TIERS[i].toLowerCase()][j];
            const matchesResponse = await apiCall(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${player.puuid}/ids?start=0&count=1&api_key=${process.env.RIOT_KEY}`);
            const matches = await matchesResponse.json();
            const matchID = matches[0];
            const matchResponse = await apiCall(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchID}?api_key=${process.env.RIOT_KEY}`);
            const match = await matchResponse.json();
            const gameMode = getMatchType(match);
            const duration = match.info.gameDuration;
            const teamData = getTeamData(match);
            matchesData[TIERS[i].toLowerCase()].push({
                gameMode,
                duration,
                'red': teamData['red'],
                'blue': teamData['blue'],
            });
        }
    }
}

async function main(){
    const database = {};

    await loadPlayers();
    await fetchDataForMatches();

    database.numGamesPerRank = await getNumGamesPerRank();
    database.accountLevelsPerRank = await getAccountLevelPerRank();
    database.gameModeDistribution = calcGameModeDistribution();
    database.averageStatsPerRank = calcStatsPerRank();
    database.matchWinrateStats = getAllDatapointWinrates();

    fs.writeFileSync('../database.json', JSON.stringify(database));
    console.log('num requests: ' + totalRequests);
}

function calcStatsPerRank(){
    const statsPerRank = [];
    
    for(let i = 0; i < TIERS.length; i++){
        const data = calcTierData(TIERS[i]);
        statsPerRank.push(data);
    }

    // Format the array properly
    const stats = [];

    for(let i = 0; i < statsPerRank.length; i++){
        for(let j = 0; j < statsPerRank[0].length; j++){
            if(!stats[j]){
                stats.push([statsPerRank[i][j]]);
            }else{
                stats[j].push(statsPerRank[i][j]);
            }
        }
    }

    // Normalizing the data
    stats.forEach(stat => {
        const highestNum = Math.max(...stat);
        for(let i = 0; i < stat.length; i++){
            stat[i] /= highestNum;
        }
    });

    return stats;
}

function getAllDatapointWinrates(){
    const winratesList = [];
    const datapoints = ['firstBlood', 'dragons', 'barons'];
    datapoints.forEach(dp => {
        winratesList.push(calcDatapointWinrate(dp));
    });
    return winratesList;
}

function calcDatapointWinrate(datapoint){
    const winrates = [];
    for(let i = 0; i < TIERS.length; i++){
        const tier = TIERS[i].toLowerCase();
        const matches = matchesData[tier.toLowerCase()];

        if(matches.length){
            let wins = 0;
            matches.forEach(match => {
                if(match.gameMode == 'Ranked Solo/Duo'){
                    if(match['red'][datapoint] > match['blue'][datapoint]){
                        if(match['red'].win){
                            wins++;
                        }
                    }else{
                        if(match['blue'][datapoint].win){
                            wins++;
                        }
                    }
                }
            });
            const winrate = wins / matches.length;
            winrates.push(winrate);
        }else{
            winrates.push(0);
        }
    }
    return winrates;
}

function calcTierData(tier){
    const matchArray = matchesData[tier.toLowerCase()];
    let duration = 0;
    let barons = 0;
    let dragons = 0;
    let gold = 0;
    let kills = 0;
    let visionScore = 0;
    let wardsPlaced = 0;
    let wardsKilled = 0;
    let towers = 0;

    let numRankedGames = 0;
    matchArray.forEach(match => {
        if(match.gameMode != 'Ranked Solo/Duo') return;
        numRankedGames++;
        duration += match.duration;
        ['red', 'blue'].forEach(t => {
            barons += match[t].barons;
            dragons += match[t].dragons;
            gold += match[t].gold;
            kills += match[t].kills;
            visionScore += match[t].visionScore;
            wardsPlaced += match[t].wardsPlaced;
            wardsKilled += match[t].wardsKilled;
            towers += match[t].towers;
        });
    });

    if(numRankedGames > 0){
        duration /= numRankedGames;
        barons /= numRankedGames;
        dragons /= numRankedGames;
        gold /= numRankedGames;
        kills /= numRankedGames;
        visionScore /= numRankedGames;
        wardsPlaced /= numRankedGames;
        wardsKilled /= numRankedGames;
        towers /= numRankedGames;
    }

    return [ duration, barons, dragons, gold, kills, visionScore, wardsPlaced, wardsKilled, towers ];
}

function addRanksToObject(obj){
    TIERS.forEach(tier => {
        obj[tier.toLowerCase()] = [];
    });
}

function calcGameModeDistribution(){
    const distribution = {};
    TIERS.forEach(tier => {
        distribution[tier.toLowerCase()] = [];
        const matches = matchesData[tier.toLowerCase()];
        const obj = getMatchDataFromArray(matches);
        for(const e in obj){
            distribution[tier.toLowerCase()].push(obj[e]);
        }
    });
    return distribution;
}

function getMatchDataFromArray(matches){
    let soloDuo = 0;
    let draft = 0;
    let blind = 0;
    let aram = 0;
    let flex = 0;
    let other = 0;
    matches.forEach(match => {
        switch(match.gameMode){
            case "Normal Draft Pick":
                draft++;
            break;
            case "Ranked Solo/Duo":
                soloDuo++;
            break;
            case "Normal Blind Pick":
                blind++;
            break;
            case "ARAM":
                aram++;
            break;
            case "Ranked Flex":
                flex++;
            break;
            case "Other":
                other++;
            break;
        }
    });
    return {
        soloDuo,
        draft,
        blind,
        aram,
        flex,
        other
    };
}

function teamIDtoName(id){
    if(id == 100) return 'red';
    return 'blue';
}

function getTeamData(match){
    const teams = {};

    // Getting team data from array of teams themselves
    for(let i = 0; i < match.info.teams.length; i++){
        const teamName = teamIDtoName(match.info.teams[i].teamId);
        teams[teamName] = {
            barons: match.info.teams[i].objectives.baron.kills,
            dragons: match.info.teams[i].objectives.dragon.kills,
            kills: match.info.teams[i].objectives.champion.kills,
            firstBlood: match.info.teams[i].objectives.champion.first,
            towers: match.info.teams[i].objectives.tower.kills,
            firstTower: match.info.teams[i].objectives.tower.first,
            win: match.info.teams[i].win,
            gold: 0,
            wardsPlaced: 0,
            wardsKilled: 0,
            visionScore: 0
        };
    }

    // Getting additional data from list of players and inserting the data into the corresponding team
    match.info.participants.forEach(p => {
        const playerTeamID = teamIDtoName(p.teamId);
        teams[playerTeamID].gold += p.goldEarned;
        teams[playerTeamID].wardsPlaced += p.wardsPlaced;
        teams[playerTeamID].wardsKilled += p.wardsKilled;
        teams[playerTeamID].visionScore += p.visionScore;
    });

    return teams;
}

function getMatchType(match){
    switch(match.info.queueId){
        case 400: // Draft Pick
            return "Normal Draft Pick";
        break;
        case 420: // Ranked Soloduo
            return "Ranked Solo/Duo";
        break;
        case 430: // Blind Pick
            return "Normal Blind Pick";
        break;
        case 450: // ARAM
            return "ARAM";
        break;
        case 440: // Ranked Flex
            return "Ranked Flex";
        break;
    }
    return "Other";
}

main();

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
dotenv.config();
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const TIMEOUT = 100;
let matchesData = {};
let playerData = {};

function apiCall(url){
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
        for(let j = 0; j < 1; j++){
            const accountID = players[j].summonerId;
            const accInfoResponse = await apiCall(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/${accountID}?api_key=${process.env.RIOT_KEY}`);
            const accountInfo = await accInfoResponse.json();
            playerData[TIERS[i].toLowerCase()].push(accountInfo);
        }
    }
    playerData.numPlayers = 1;
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
        for(let j = 0; j < playerData.numPlayers; j++){
            const accountLevel = playerData[TIERS[i].toLowerCase()][j].summonerLevel;
            averageLevel += accountLevel;
        }
        averageLevel /= playerData.numPlayers;
        data.push(averageLevel);
    }
    return data;
}

async function fetchDataForMatches(){
    addRanksToObject(matchesData);
    for(let i = 0; i < TIERS.length; i++){ // Loop through tiers
        for(let j = 0; j < playerData.numPlayers; j++){
            const player = playerData[TIERS[i].toLowerCase()][j];
            const matchesResponse = await apiCall(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${player.puuid}/ids?start=0&count=1&api_key=${process.env.RIOT_KEY}`).catch(err => console.log('failed to fetch data'));
            const matches = await matchesResponse.json();
            const matchID = matches[0];
            const matchResponse = await apiCall(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchID}?api_key=${process.env.RIOT_KEY}`);
            const match = await matchResponse.json();
            const gameMode = getMatchType(match);
            const duration = match.info.gameDuration;
            const { barons, dragons, gold, kills, teamWithFirstBlood, winningTeam } = getDataAboutGame(match);
            matchesData[TIERS[i].toLowerCase()].push({
                gameMode,
                duration,
                barons,
                dragons,
                gold,
                kills,
                teamWithFirstBlood,
                winningTeam
            });
        }
    }
}

async function main(){
    const string = fs.readFileSync('../database.json');
    const database = JSON.parse(string);

    await loadPlayers();
    await fetchDataForMatches();

    if(!database.numGamesPerRank){
        database.numGamesPerRank = await getNumGamesPerRank().catch(err => {
            console.log('failed to fetch number of games per rank');
            console.log(err);
        });
    }
    if(!database.accountLevelsPerRank){
        database.accountLevelsPerRank = await getAccountLevelPerRank().catch(err => {
            console.log('failed to fetch account levels per rank');
            console.error(err);
        });
    }
    if(!database.gameModeDistribution){
        database.gameModeDistribution = calcGameModeDistribution();
    }
    if(!database.averageStatsPerRank){
        database.averageStatsPerRank = calcAverageStatsPerRank();
    }

    fs.writeFileSync('../database.json', JSON.stringify(database));
}

function calcAverageStatsPerRank(){
    const statsPerRank = {};
    TIERS.forEach(tier => {
        statsPerRank[tier] = calcAverageDataInTier(tier);
    });
    return statsPerRank;
}

function calcAverageDataInTier(tier){
    const matchArray = matchesData[tier.toLowerCase()];
    const averageObject = {
        duration: 0,
        barons: 0,
        dragons: 0,
        gold: 0,
        kills: 0,
    };
    matchArray.forEach(match => {
        averageObject.duration += match.duration;
        averageObject.barons += match.barons;
        averageObject.dragons += match.dragons;
        averageObject.gold += match.gold;
        averageObject.kills += match.kills;
    });
    averageObject.duration /= matchArray.length;
    averageObject.barons /= matchArray.length;
    averageObject.dragons /= matchArray.length;
    averageObject.gold /= matchArray.length;
    averageObject.kills /= matchArray.length;
    return averageObject;
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

function getDataAboutGame(match){
    let barons = 0;
    let dragons = 0;
    let gold = 0;
    let kills = 0;
    let teamWithFirstBlood = 0;
    let winningTeam = 0;

    match.info.participants.forEach(p => {
        if(p.firstBloodKill){
            teamWithFirstBlood = p.teamId;
        }
        if(p.win){
            winningTeam = p.teamId;
        }
        kills += p.kills;
        gold += p.goldEarned;
        dragons += p.dragonKills;
        barons = p.baronKills;
    });
    return {
        barons, dragons, gold, kills, teamWithFirstBlood, winningTeam
    };
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
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
dotenv.config();
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const TIMEOUT = 100;
let matchesData = {};
matchesData.iron = [];
matchesData.bronze = [];
matchesData.silver = [];
matchesData.gold = [];
matchesData.platinum = [];
matchesData.diamond = [];
matchesData.master = [];
matchesData.grandmaster = [];
matchesData.challenger = [];

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
        const response = await apiCall(`https://euw1.api.riotgames.com/lol/league-exp/v4/entries/RANKED_SOLO_5x5/${TIERS[i]}/I?page=1&api_key=${process.env.RIOT_KEY}`);
        const json = await response.json();
        let averageLevel = 0;
        for(let i = 0; i < 20; i++){
            const player = json[i];
            const accountID = player.summonerId;
            const accInfoResponse = await apiCall(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/${accountID}?api_key=${process.env.RIOT_KEY}`);
            const jsonAccountInfo = await accInfoResponse.json();
            const accountLevel = jsonAccountInfo.summonerLevel;
            averageLevel += accountLevel;
        }
        averageLevel /= 20;
        data.push(averageLevel);
    }
    return data;
}

async function main(){
    const string = fs.readFileSync('../database.json');
    const database = JSON.parse(string);

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
    
    fs.writeFileSync('../database.json', JSON.stringify(database));

    // Fetch data for matches
    for(let i = 0; i < TIERS.length; i++){ // Loop through tiers
        const response = await apiCall(`https://euw1.api.riotgames.com/lol/league-exp/v4/entries/RANKED_SOLO_5x5/${TIERS[i]}/I?page=1&api_key=${process.env.RIOT_KEY}`).catch(err => console.log('failed to fetch data'));
        const players = await response.json();
        console.log(players.length);
        for(let j = 0; j < 1; j++){
            const playerDetailsResponse = await apiCall(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${players[j].summonerName}?api_key=${process.env.RIOT_KEY}`);
            const playerDetails = await playerDetailsResponse.json();
            const matchesResponse = await apiCall(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${playerDetails.puuid}/ids?start=0&count=1&api_key=${process.env.RIOT_KEY}`).catch(err => console.log('failed to fetch data'));
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

    if(!database.gameDistribution){
        // Create array for each tier
        database.gameDistribution = {};
        TIERS.forEach(tier => {
            database.gameDistribution[tier.toLowerCase()] = [];
            const matches = matchesData[tier.toLowerCase()];
            const obj = getMatchDataFromArray(matches);
            for(const e in obj){
                database.gameDistribution[tier.toLowerCase()].push(obj[e]);
            }
        });
    }
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
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
dotenv.config();
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const TIMEOUT = 1500;

function apiCall(url){
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
           const data = await fetch(url).catch(err => reject(err));
           resolve(data);
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
        for(let i = 0; i < json.length; i++){
            const player = json[i];
            const accountID = player.summonerId;
            const accInfoResponse = await apiCall(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/${accountID}?api_key=${process.env.RIOT_KEY}`);
            const jsonAccountInfo = await accInfoResponse.json();
            const accountLevel = jsonAccountInfo.summonerLevel;
            averageLevel += accountLevel;
        }
        averageLevel /= json.length;
        data.push(averageLevel);
    }
    return data;
}

async function main(){
    // Fetch all data
    // const numGamesPerRank = await getNumGamesPerRank();
    const numGamesPerRank = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    // const accountLevelsPerRank = await getAccountLevelPerRank();
    const accountLevelsPerRank = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    
    // Construct databse json object
    const database = {
        numGamesPerRank,
        accountLevelsPerRank
    };

    // Save databse to file
    fs.writeFileSync('../database.json', JSON.stringify(database));
}

main();
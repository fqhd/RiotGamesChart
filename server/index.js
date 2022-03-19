import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const TIMEOUT = 100;

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

async function getPlayerData(){
    let totalPlayerData = [];
    for(let i = 0; i < TIERS.length; i++){
        const rankData = await getRankData(TIERS[i]).catch(err => {
            console.error(err);
            console.log('index: ' + i);
            console.log(TIERS.length);
        });
        totalPlayerData.push(rankData);
    }
    return totalPlayerData;
}


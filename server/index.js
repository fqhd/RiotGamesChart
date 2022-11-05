import fetch from "node-fetch";
import fs from 'fs';

const API_KEYS = [
];

let currentKeyIndex = 0;
let currentKey = API_KEYS[0];
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const TIME_BETWEEN_REQUESTS = 1300 / API_KEYS.length;
const NUM_PLAYERS_PER_RANK = 1;
const MATCHES_PER_PLAYER = 10;

function apiCall(url) {
	url += currentKey;
	console.log(url);
	return new Promise((resolve, reject) => {
		setTimeout(async () => {
			const data = await fetch(url);
			resolve(data);
		}, TIME_BETWEEN_REQUESTS);
	});
}

async function getMatchFromMatchID(matchID) {
	const response = await apiCall(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchID}?api_key=`);
	const json = await response.json();
	return json;
}

async function getMatchesFromMatchIDs(matchIDs) {
	const matches = [];
	for(const matchID of matchIDs){
		matches.push(await getMatchFromMatchID(matchID));
	}
	return matches;
}

async function getPlayerMatches(summonerName) {
	console.log('checking player: ' + summonerName);
	try{
		const response = await apiCall(`https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}?api_key=`);
		const player = await response.json();
		const puuid = player.puuid;
		const resp = await apiCall(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${MATCHES_PER_PLAYER}&api_key=`);
		const matchIDs = await resp.json();
		const matches = await getMatchesFromMatchIDs(matchIDs);
		return matches;
	}catch(error){
		console.log('Error, summoner not found: ' + summonerName);
	}
}

async function main() {
	const database = {
		IRON: [],
		BRONZE: [],
		SILVER: [],
		GOLD: [],
		PLATINUM: [],
		DIAMOND: [],
		MASTER: [],
		GRANDMASTER: [],
		CHALLENGER: []
	};

	for(let i = 0; i < TIERS.length; i++){
		let response;
		if(i == 8) { // Challenger
			response = await apiCall(`https://euw1.api.riotgames.com/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5?api_key=`);
		}else if(i == 7) { // Grandmaster
			response = await apiCall(`https://euw1.api.riotgames.com/lol/league/v4/grandmasterleagues/by-queue/RANKED_SOLO_5x5?api_key=`);
		}else if(i == 6) { // Master
			response = await apiCall(`https://euw1.api.riotgames.com/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5?api_key=`);
		}else{
			response = await apiCall(`https://euw1.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/${TIERS[i]}/III?page=1&api_key=`);
		}
		let players = await response.json();
		if(i == 8 || i == 7 || i == 6){
			players = players.entries;
		}
		console.log(`${TIERS[i]}: ${players.length} players`);
		for (let j = 0; j < NUM_PLAYERS_PER_RANK; j++) {
			currentKeyIndex++;
			const matches = await getPlayerMatches(players[i].summonerName);
			for(const match of matches){
				database[TIERS[i]].push(match);
			}
			currentKey = API_KEYS[currentKeyIndex % API_KEYS.length];
		}
	}
	fs.writeFileSync('database.json', JSON.stringify(database));
}

main();
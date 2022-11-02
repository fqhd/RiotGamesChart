import fetch from "node-fetch";

const API_KEYS = [
];

let currentKeyIndex = 0;
let currentKey = API_KEYS[0];
const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];

const TIME_BETWEEN_REQUESTS = 1300 / API_KEYS.length;

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

function isOneOfTargetGame(kills, deaths, assists, cs){
	if(kills == 9 && deaths == 5 && assists == 6 && cs == 290){
		return true;
	}
	if(kills == 5 && deaths == 5 && assists == 10 && cs == 245){
		return true;
	}
	return false;
}

async function checkMatch(matchId){
	const response = await apiCall(`https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=`);
	const json = await response.json();
	const dayInSeconds = 32 * 60 * 60;
	const timeSinceGame = (Date.now() / 1000) - (json.info.gameCreation / 1000);
	let isMatch;
	let keepLooking;

	// Set keep looking
	keepLooking = true;
	if(timeSinceGame > dayInSeconds){
		keepLooking = false;
	}

	// Set isMatch
	isMatch = false;
	const participants = json.info.participants;
	for(const participant of participants){
		const kills = participant.kills;
		const deaths = participant.deaths;
		const assists = participant.assists;
		const cs = participant.neutralMinionsKilled + participant.totalMinionsKilled;
		if(isOneOfTargetGame(kills, deaths, assists, cs)){
			console.log('gotteem!!');
			isMatch = true;
			keepLooking = false;
		}
	}

	return {
		isMatch,
		keepLooking
	};
}

async function checkPlayer(summonerName) {
	console.log('checking player: ' + summonerName)
	try{
		const response = await apiCall(`https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}?api_key=`);
		const player = await response.json();
		const puuid = player.puuid;
		const resp = await apiCall(`https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=40&api_key=`);
		const matches = await resp.json();
	
		for (const match of matches) {
			const matchResponse = await checkMatch(match);
			if(matchResponse.isMatch){
				console.log(match);
				return true;
			}
			if(!matchResponse.keepLooking){
				break;
			}
		}
		return false;
	}catch(error){
		console.log('Error, summoner not found: ' + summonerName);
	}
	return false;
}

async function main() {
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
		for (let j = 0; j < players.length; j++) {
			const isPlayerSus = await checkPlayer(player.summonerName);
			if(isPlayerSus){
				console.log('Found sus player: ');
				console.log(player);
				process.exit();
			}
			currentKeyIndex++;
			currentKey = API_KEYS[currentKeyIndex % API_KEYS.length];
		}
	}
}

main();
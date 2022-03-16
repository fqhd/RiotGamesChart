const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const QUEUE = 'RANKED_SOLO_5x5';
let API_KEY;
const TIMEOUT = 100; // Time between api calls
const statusElement = document.getElementById('status');

function chartData(data){
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: TIERS,
            datasets: [{
                label: 'Average Games Played Per Rank',
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 1)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                ],
                borderWidth: 1
            }]
        }
    });
    document.body.appendChild(canvas);
}

document.getElementById('searchButton').onclick = async function(){
    statusElement.textContent = 'fetching data...';
    API_KEY = document.getElementById('keyInputBox').value;
    const data = await getPlayerData();
    chartData(data);
    statusElement.textContent = 'done';
}

function rankToNum(tier, lp){
    return Math.min(TIERS.indexOf(tier), 5) * 400 + lp;
}

async function getRankData(tier){
    const fetchResponse = await apiCall(`https://euw1.api.riotgames.com/lol/league-exp/v4/entries/RANKED_SOLO_5x5/${tier}/I?page=1&api_key=${API_KEY}`);
    const jsonData = await fetchResponse.json();
    let totalGamesPlayed = 0;
    jsonData.forEach(e => {
        totalGamesPlayed += (e.losses + e.wins);
    });
    totalGamesPlayed /= jsonData.length;
    return totalGamesPlayed;
}

function apiCall(url){
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
           const data = await fetch(url).catch(err => reject(err));
           resolve(data);
        }, TIMEOUT);
    });
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

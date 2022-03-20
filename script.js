const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const charts = document.getElementById('charts');

main();

async function main(){
    const response = await fetch('database.json');
    const database = await response.json();

    // Charts
    chartGamesPerRank(database.numGamesPerRank);
    chartAccountLevelPerRank(database.accountLevelsPerRank);
}

function chartGamesPerRank(data){
    const canvas = document.createElement('canvas');
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
    charts.appendChild(canvas);
}

function chartAccountLevelPerRank(data){
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: TIERS,
            datasets: [{
                label: 'Average Account Level Per Rank',
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
    charts.appendChild(canvas);
}

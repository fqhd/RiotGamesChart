const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];

main();

async function main(){
    const response = await fetch('database.json');
    const database = await response.json();

    // Charts
    chartData(database.playerData);
}

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

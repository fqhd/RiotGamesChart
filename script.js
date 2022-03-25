const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const c1 = document.getElementById('c1');
const c2 = document.getElementById('c2');
const c3 = document.getElementById('c3');
let currentColumn = 0;

main();

async function main(){
    const response = await fetch('database.json');
    const database = await response.json();

    // Charts
    chartLine(database.numGamesPerRank, 'Average Games Played Per Rank', 'Average Rank', document.getElementById('col-1'));
    chartLine(database.accountLevelsPerRank, 'Average Account Level Per Rank', 'Average Level', document.getElementById('col-2'));
    for(const tier in database.gameModeDistribution){
        chartDonut(database.gameModeDistribution[tier], tier.toUpperCase());
    }
    chartMultipleLines(database.averageStatsPerRank, 'Match Data', document.getElementById('ingame-stats'));
}

function appendToHTML(element){
    const index = currentColumn % 3;
    if(index == 0){
        c1.appendChild(element);
    }else if(index == 1){
        c2.appendChild(element);
    }else{
        c3.appendChild(element);
    }
    currentColumn++;
}

function chartLine(data, title, label, e){
    const canvas = document.createElement('canvas');
    canvas.style.marginTop = '75px';
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: TIERS,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 1)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                ],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size:  18
                    }
                },
            }
        }
    });
    e.appendChild(canvas);
}

function chartMultipleLines(datasets, title, element){
    const canvas = document.createElement('canvas');
    canvas.style.marginTop = '70px';
    const ctx = canvas.getContext('2d');
    const chartDatasets = [];
    const colors = [
        '#543324',
        '#a0603c',
        '#526468',
        '#a86c2d',
        '#0bc45c',
        '#131085',
        '#ea2af9',
        '#fb2527',
        '#face6b',
    ];
    const datasetLabels = [ 'Game Length', 'Barons', 'Dragons', 'Gold', 'Kills', 'Vision Score', 'Wards Placed', 'Wards Killed', 'Towers Destroyed' ];
    for(let i = 0; i < datasets.length; i++){
        chartDatasets.push({
            data: datasets[i],
            label: datasetLabels[i],
            fill: false,
            backgroundColor: colors[i],
            borderColor: colors[i],
            pointBackgroundColor: colors[i],
            pointBorderColor: colors[i],
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: colors[i],
        });
    }
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: TIERS,
            datasets: chartDatasets
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size:  18
                    }
                },
            }
        }
    });
    element.appendChild(canvas);
}

function chartDonut(data, title){
    const canvas = document.createElement('canvas');
    canvas.style.marginTop = '70px';
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ranked Solo/Duo', 'Normal Draft', 'Normal Blind', 'ARAM', 'Ranked Flex', 'Other'],
            datasets: [{
                data: data,
                backgroundColor: [
                    '#D7263D',
                    '#02182B',
                    '#0197F6',
                    '#448FA3',
                    '#68C5DB',
                    '#CEECF3',
                ],
                borderColor: [
                    '#D7263D',
                    '#02182B',
                    '#0197F6',
                    '#448FA3',
                    '#68C5DB',
                    '#CEECF3',
                ],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size:  18
                    }
                },
            }
        }
    });
    appendToHTML(canvas);
}

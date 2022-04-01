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
    chartLine(database.numGamesPerRank, 'Average Games Played Per Rank', 'Average Games', document.getElementById('col-1'));
    chartLine(database.accountLevelsPerRank, 'Average Account Level Per Rank', 'Average Level', document.getElementById('col-2'));
    for(const tier in database.gameModeDistribution){
        chartDonut(database.gameModeDistribution[tier], tier.toUpperCase());
    }
    chartMatchData(database);
    chartDatapointWinrates(database);
}

function chartMatchData(database){
    const labels = [ 'Game Length', 'Barons', 'Dragons', 'Gold', 'Kills', 'Vision Score', 'Wards Placed', 'Wards Killed', 'Towers Destroyed' ];
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
	const flippedData = flipArray(database.averageStatsPerRank); // I flip the array because the data in the array goes ranks per stat but I want stats per rank
	for(let i = 0; i < TIERS.length; i++){
		chartArea(flippedData[i], labels, TIERS[i], colors[i]);
	}
}

function chartArea(dataset, labels, title, color){
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
    canvas.style.marginTop = '75px';
	new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Normalized Dataset',
                data: dataset,
                backgroundColor: color + '4F',
				borderColor: color,
				pointBackgroundColor: color,
				pointBorderColor: '#fff',
				pointHoverBackgroundColor: '#fff',
				pointHoverBorderColor: color,
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
				legend: {
					display: false,
				}
            },
			scales: {
				'r': {
					backgroundColor: '#FFF',
					min: 0,
					max: 1,
				}
			}
        }
    });
	appendToHTML(canvas);
}

function chartDatapointWinrates(database){
    const labels = ['First Blood', 'More Dragons', 'More Barons'];
    const colors = [
		'#4DC0C0',
		'#36A2E0',
		'#9966FF',
    ];
    chartMultipleLines(database.matchWinrateStats, 'Team Winrate Per Datapoint', labels, colors, document.getElementById('ingame-stats'));
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
			fill: true,
                label: label,
                data: data,
				pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
				backgroundColor: 'rgba(54, 162, 235, 0.5)',
				borderColor: 'rgba(54, 162, 235, 1)',
				pointBackgroundColor: 'rgba(54, 162, 235, 1)',
				pointBorderColor: 'rgba(54, 162, 235, 1)',
				pointHoverBackgroundColor: 'rgba(54, 162, 235, 1)',
				pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
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
				legend: {
					display: false
				}
            }
        }
    });
    e.appendChild(canvas);
}

function flipArray(arr){
	const result = [];
	for(let i = 0; i < arr.length; i++){
		for(let j = 0; j < arr[i].length; j++){
			if(!result[j]){
				result[j] = [arr[i][j]];
			}else{
				result[j].push(arr[i][j]);
			}
		}
	}
	return result;
}

function chartMultipleLines(datasets, title, datasetLabels, colors, element){
    const canvas = document.createElement('canvas');
    canvas.style.marginTop = '70px';
    const ctx = canvas.getContext('2d');
    const chartDatasets = [];
    for(let i = 0; i < datasets.length; i++){
        chartDatasets.push({
            data: datasets[i],
            label: datasetLabels[i],
            fill: true,
            backgroundColor: colors[i] + '2F',
            borderColor: colors[i],
            pointBackgroundColor: colors[i],
            pointBorderColor: colors[i],
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: colors[i],
			borderWidth: 2
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

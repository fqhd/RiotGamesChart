# RiotGamesChart
A static website which gathers information about players from the riot games API and plots every player and their rank on a chart using the chart.js library. This is meant to see how the ranks of players changes as games played increase.

## Package Dependencies
- node-fetch
- dotenv
## Install Instructions
### Windows/Mac/Linux
```
npm install node-fetch dotenv
```

## update note
[using the same data fetching script ](https://github.com/fqhd/RiotGamesChart/blob/master/server/index.js) (edited)

**issue:** 
-  too long fetching time

**on request:**

- **will receive the old database.json instantly on request**
- **Will do API call for APX: 3hr to update database.json after GET request**
- **due to fetching time possible bugs in fetching & updating data is not tested**

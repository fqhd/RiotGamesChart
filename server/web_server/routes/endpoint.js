
//import requried modules
import express from 'express';
const router = express.Router();

//import fetcher function
import {fetcher} from '../database/fetcher.js';


//create route for endpoint
router.get('/api', (req , res) => {
    fetcher().then(data => {
        console.log(data)
        res.write(JSON.stringify(data));;
    });
});

export {router as apiRoutes};

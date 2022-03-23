import dotenv from 'dotenv';
import express from 'express';
const app = express();
const port = process.env.PORT || 8000;

//import routes
import {apiRoutes} from './routes/endpoint.js';

//website_use_routes
app.use('/', apiRoutes);

app.listen(port, () => {
  console.log(`server listening on
     port ${port}!`)
});

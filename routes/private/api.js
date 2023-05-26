const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect("/");
  }
  console.log("hi",sessionToken);
  const user = await db
    .select("*")
    .from("se_project.sessions")
    .where("token", sessionToken)
    .innerJoin(
      "se_project.users",
      "se_project.sessions.userid",
      "se_project.users.id"
    )
    .innerJoin(
      "se_project.roles",
      "se_project.users.roleid",
      "se_project.roles.id"
    )
   .first();

  console.log("user =>", user);
  user.isNormal = user.roleid === roles.user;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;
  console.log("user =>", user)
  return user;
};

//Helper method for checkPrice endpoint api
//gets price based on shortest distance from originStation to destinationStation
const getPrice = async function(startStation = 1, endStation = 2){
  const numStations = await db
  .count("*")
  .from("se_project.stations");
  
  var visited = [];
  var queue = [];
  queue.push({station: parseInt(startStation), distance: 0});

  let curr = queue.shift();
  for(let i = 0; curr != undefined; i++){
    visited[visited.length] = curr;

    const neighbours = await db
    .select("tostationid")
    .from("se_project.routes")
    .where("fromstationid", curr.station);

    for (let j = 0; j < neighbours.length; j++) {
      var flag = false;
      const station = neighbours[j].tostationid;

      for (let k = 0; k < visited.length; k++){ 
        const visitedStation = visited[k];
        if(parseInt(station) == parseInt(visitedStation.station)){
          flag = true;
        }
      }

      if(flag){
        continue;
      }
      queue.push({station: station, distance: curr.distance+1});
    }
    curr = queue.shift();
  }

  const distance = 0;
  for (let i = 0; i < visited.length; i++) {
    if(parseInt(endStation) == visited[i].station){
      distance = visited[i].distance;
      break;
    }
  }

  const zones = await db
  .select("*")
  .from("se_project.zones")
  .orderBy("price");

  const length = zones.length;
  if(length == 0){
    return -1;
  }

  for(let i = 0; i < length; i++){
    try{
      if(distance < parseInt(zones[i].zonetype)){
        return zones[i].price;
      }
    }catch(e){
      return zones[length - 1].price;
    }
  }
}

module.exports = function (app) {
  // example
  app.get("/users", async function (req, res) {
    try {
       const user = await getUser(req);
      const users = await db.select('*').from("se_project.users")
        
      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
   
  });
 
  //checkPrice endpoint
  app.get("/api/v1/tickets/price", async function (req, res) {
    const originId = req.query.originId;
    const destinationId = req.query.destinationId;

    const station1 = await db
      .select("*")
      .from("se_project.stations")
      .where("id", originId);
    const station2 = await db
      .select("*")
      .from("se_project.stations")
      .where("id", destinationId);

    if(!station1){
      return res.status(404).send("start station does not exist");
    }if(!station2){
      return res.status(404).send("end station does not exist");
    }
    

    try{
      const price = await getPrice(originId, destinationId);
      if(price < 0){
        return res.status(400).send("missing zone data");
      }
      return res.status(200).send("price: "+ price);
    }catch(e){
      console.log(e.message);
      return res.status(400).send("Could not get price");
    }
    
  })

  app.put("/api/v1/ride/simulate", async function (req, res) {
    const origin = req.body.origin;
    const destination = req.body.destination;
    const date = new Date(req.body.tripDate);
    const tripDate = date.toISOString();
    const user = await getUser(req);
    const userID = user.id;
    console.log(userID);

    const rideExists = await db
    .select("*")
    .from("se_project.rides")
    .where("origin", origin)
    .andWhere("destination", destination)
    .andWhere("tripdate", tripDate)
    .andWhere("userid", userID);

    if(isEmpty(rideExists)){
      return res.status(404).send("trip doesn't exist");
    }

    try{
      await db("se_project.rides")
      .where("origin", origin)
      .andWhere("destination", destination)
      .andWhere("tripdate", tripDate)
      .andWhere("userid", userID)
      .update({
        status : "Completed"
      })
      .returning("*");

      return res.status(200).send("ride simulated successfully");
    }catch(e){
      return res.status(404).send("couldn't simulate ride");
    }
  })
};

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

  for (let i = 0; i < visited.length; i++) {
    if(parseInt(endStation) == visited[i].station){
      return visited[i].distance;
    }
  }
}

  app.post("/api/v1/senior/request", async function (req, res){
    try {
      const user = await getUser(req);
      const NewSreq = {
        status: "pending",
        userid: user.id,
        nationalid: parseInt(req.body.nationalid)
      };
      const Sreq = await db("se_project.senior_requests").insert(NewSreq).returning("*");
      return res.status(200).json(Sreq);

    }catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not complete action");
    }
  });

  app.post("/api/v1/refund/:ticketId", async function (req, res){

    try{ 
      const TId = parseInt(req.query.ticketId);
      const start = await db.select('origin').from('se_project.rides').where("ticketid", TId);
      const end = await db.select('destination').from('se_project.rides').where("ticketid", TId);
      const amnt = await getPrice(start, end);
      const user = await getUser(req);
      const NewRef = {
        status: "pending",
        userid: user.id,
        refundamount: amnt,
        ticketid: TId,
      };
      const Ref = await db("se_project.refund_requests").insert(NewRef).returning("*");
      return res.status(200).json(NewRef);

    }catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not complete action");
    }
  });

  app.get("/api/v1/zones", async function (req, res){
    try{
      const zones = await db.select('*').from('se_project.zones');
      return res.status(200).json(zones);

    }catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not complete action");
    }
  });
 


  
};

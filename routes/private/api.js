const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session');
const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect("/");
  }

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
  return user;
};

module.exports = function (app) {
  // example
  app.put("/users", async function (req, res) {
    try {
      const user = await getUser(req);
      const users = await db.select('*').from("se_project.users")
        
      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
  });

  
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
  var distance = 0;
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
      console.log(price);
      return res.status(200).send("price found");
    }catch(e){
      console.log(e.message);
      return res.status(400).send("Could not get price");
    }
    
  });

  //pay sub online
  app.post("/api/v1/payment/subscription/:purchasedId", async function (req, res) {
    
    const purchasedID =req.params.purchasedId;
    console.log(purchasedID);
    const CCN = req.body.creditCardNumber;
    const HOWN= req.body.holderName;
    const ammo= req.body.payedAmount;
    const typo= req.body.subType;
    const Zid= req.body.zoneId;
    const userd=await getUser(req);
    const userdd=userd.id;
 const inserto={
  purchasedid:purchasedID,
  //amount from get ammount or body?
 amount:ammo,
  userid:userdd,
  purchasetype:"subscription",
 // zoneid:Zid
};
const subExists = await db
   .select("*")
   .from("se_project.subsription")
   .where("userid", userdd).andWhere("zoneid",Zid);
 if (isEmpty(subExists)) {
  const niko={
    zoneid:Zid,
    subtype:"quartrly",
    nooftickets:0,
    userid:userdd
  }
  const yoo=await db("se_project.subsription").insert(niko).returning("*");
 }
  
  const ppo= await db("se_project.transactions").insert(inserto).returning("*");
  
    if(typo=="annual"){
     const ddo= await db("se_project.subsription")
      .where("zoneid",Zid  ).andWhere( "userid",userdd)
    .update({nooftickets:100,subtype:"annual"});
    }
    else{
      //duuno if month or monthly ba3den
      if(typo=="monthly"){
        const ddo=await db("se_project.subsription")
        .where("zoneid",Zid  ).andWhere( "userid",userdd)
    .update({nooftickets:50,subtype:"monthly"});
      }
      else{ 
        const ddo=await db("se_project.subsription")
    .where("zoneid",Zid  ).andWhere( "userid",userdd)
    .update({nooftickets:10,subtype:"quartrly"});
      }
    }
     res.status(200).send("subscription paid"); 

  });

  app.post("/api/v1/payment/ticket/:purchasedId", async function (req, res) {
    const purchasedID =req.params.purchasedId;
    const CCN = req.body.creditCardNumber;
    const HOWN= req.body.holderName;
    const ammo= req.body.payedAmount;
   const origino=req.body.origin;
   const destinationo=req.body.destination;
   const tripDateo=req.body.tripDate;
   const tripTmp = new Date(tripDateo);
   const tripCompare = tripTmp.toISOString();
   const userdo=await getUser(req);
    const userpd=userdo.id;
    ///////////////////////////
    const og = await db
   .select("id")
   .from("se_project.stations")
   .where("stationname", origino);
   //
   const dn = await db
   .select("id")
   .from("se_project.stations")
   .where("stationname", destinationo);
    const prico=await getPrice(og[0].id,dn[0].id);
    if(ammo!=prico){return res.status(400).send("invalid funds")}
    else{//the rest of the code
    } 
    ////////////////////////////
   const subExists = await db
   .select("*")
   .from("se_project.subsription")
   .where("userid", userpd);
 if (!isEmpty(subExists)) {
   return res.status(400).send("You have a Subscription don't waste money");
 }
 else{
 const insertog={ 
  purchasedid:purchasedID, 
  //amount from get ammount or body?
  amount:ammo,
  userid:userpd, 
  purchasetype:"ticket"
};
const suyExists = await db
   .select("*")
   .from("se_project.tickets")
   .where("userid", userpd).andWhere("origin",origino).andWhere("destination",destinationo).andWhere("tripdate", tripCompare);
 if (!isEmpty(suyExists)) {
   return res.status(400).send("ticket already bought exists"); 
 }
 else{const poo= await db("se_project.transactions").insert(insertog).returning("*");

 const insertouo={
   
  //amount from get ammount or body?
  origin:origino, 
  destination:destinationo,
  tripdate:tripDateo,
  userid:userpd,
  // subid:0
};
 const ao= await db("se_project.tickets").insert(insertouo).returning("id");
   const po= ao[0]; 
///////////////////////////////////////////////////////
const inserta={
userid:userpd,
status:"upcoming",
origin:origino,
destination:destinationo,
ticketid:po,//po, 
tripdate:tripDateo 
};
 const ppo= await db("se_project.rides").insert(inserta).returning("*")
 return res.status(200).send("ticket paid\nTrip Date: "+tripDateo+"\nOrigin: "+origino+"\nDestination: "+destinationo);
 
 
}
 }
}); 
/////////////////////////////////////////////////////////////////////////////////////////////
app.post("/api/v1/tickets/purchase/subscription", async function (req, res) {
    const subid=req.body.subID;
    const origink=req.body.origio;
    const desitinationk=req.body.destin;
    const tripd=req.body.date;
    const tripTmp = new Date(tripd);
    const tripCompare = tripTmp.toISOString();
    const userd=await getUser(req);
    const userod=userd.id;
     ///////////////////////////
     const og = await db
     .select("id")
     .from("se_project.stations")
     .where("stationname", origink);
     //
     const dn = await db
     .select("id")
     .from("se_project.stations")
     .where("stationname", desitinationk);
      const prico=await getPrice(og[0].id,dn[0].id);
      const zone = await db.select("zoneid").from("se_project.subsription").where("id", subid);
      console.log(zone[0].zoneid);
      const zonePrice = await db.select("price").from("se_project.zones").where("id", zone[0].zoneid);
      console.log(zonePrice[0].price);
      console.log(prico);
      if(zonePrice[0].price!=prico){return res.status(400).send("Invalid Subscription");}
const subExists = await db
 .select("*")
 .from("se_project.subsription")
 .where("id", subid);
if (isEmpty(subExists)) {
 return res.status(400).send("sub doesn't  exist");
}
else{ 
  const suyExists = await db
  .select("*")
  .from("se_project.tickets")
  .where("userid", userod).andWhere("origin",origink).andWhere("destination",desitinationk).andWhere("tripdate", tripCompare);
if (!isEmpty(suyExists)) {
  return res.status(400).send("ticket already bought exists");
}
else{ const ino={
  
  //amount from get ammount or body?
  origin:origink,  
  destination:desitinationk,
  tripdate:tripd,
  userid:userod,
   
};
 const apoo= await db("se_project.tickets").insert(ino).returning("id");
    const apo=parseInt(apoo[0]);
///////////////////////////////////////////////////////
const insertak={
userid:userod,
status:"upcoming",
origin:origink,
destination:desitinationk,
tripdate:tripd, 
ticketid:apo
};

 const ppo= await db("se_project.rides").insert(insertak).returning("*")
 const prevSub = await db.select("nooftickets").from("se_project.subsription").where("id", subid);
 await db("se_project.subsription")
      .where("id", subid)
      .update({
        nooftickets : prevSub[0].nooftickets - 1
      });
 return res.status(200).send("ticket paid\nTrip Date: "+tripd+"\nOrigin: "+origink+"\nDestination: "+desitinationk);
 }
 }
});
}; 

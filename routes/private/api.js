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
      "se_project.sessions.userId",
      "se_project.users.id"
    )
    .innerJoin(
      "se_project.roles",
      "se_project.users.roleId",
      "se_project.roles.id"
    )
    .first();

  console.log("user =>", user);
  user.isNormal = user.roleId === roles.user;
  user.isAdmin = user.roleId === roles.admin;
  user.isSenior = user.roleId === roles.senior;
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
  });
  //Resettting password endpoint

app.put("/api/v1/password/reset", async function (req, res) {
  const User = await getUser(req);
   const email = User.email;
  const { newPassword } = req.body;

  if (!newPassword) {
    // If the password is not present, return an HTTP unauthorized code
    return res.status(400).send("New Password is required");
  }

  // Get the user's ID from the database.
  const user = await db
    .select("*")
    .from("se_project.users")
    .where("email", email)
    .first();

  if (!user) {
    // If the user does not exist, return an HTTP not found code.
    return res.status(404).send("User does not exist");
  }
   try {
      await db("se_project.users")
      .where("email", email)
      .update({
        password : newPassword
      })
      .returning("*");
      res.status(200).send("Password reset successfully");
   } catch (error) {
       console.error(error.stack);
       return false;
   }

});

//Creating a new station
app.post("/api/v1/station", async function (req, res) {
  const { stationName } = req.body;
   // Check if the station name is already taken.
   const existingStation = await db
   .select("*")
   .from("se_project.stations")
   .where("stationname", stationName)
   .first();
  if (existingStation) {
    // If the station name is already taken, return an HTTP conflict code.
    return res.status(409).send("Station name already taken");
  }
    // Create a new station 
    const newStation = {
      stationname: stationName,
      stationtype: "normal",
      stationstatus: "new created",
    };
    
    //await Station.insertOrIgnore(newStation);
    //await db.insert("se_project.stations", newStation);
    try {
       await db("se_project.stations").insert(newStation).returning("*");
      res.status(201).send("Station created successfully");
      //return res.status(200).json(station );
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not add new station");
    }
    // Return a success message.
    //res.status(201).send("Station created successfully");
  });
  //Updating a station
  app.put("/api/v1/station/:stationId", async function (req, res) {
    //request parameters are , which are the values that are passed to the endpoint after the slash
    const { stationId } = req.params;// access the request parameters
    //const { stationName } = req.body;
    const newStationName = req.body.stationName;

    // Check if the station exists.
    const existingStation = await db
      .select("*")
      .from("se_project.stations")
      .where("id", stationId)
      .first();
  
    if (!existingStation) {
      // If the station does not exist, return an HTTP not found code.
      return res.status(404).send("Station does not exist");
    }
     try {
      await db("se_project.stations")
      .where("id", stationId)
      .update({
        stationname : newStationName
      })
      .returning("*");
      // Return a success message.
     res.status(200).send("Station updated successfully");

    } 
   catch (e) {
    console.log(e.message);
    res.status(400).json({error: "Unable to update station name.", });
   }
  });

app.delete("/api/v1/station/:stationId", async function (req, res) {
  // Get the station ID from the request.
  const {stationId :stationId }= req.params;
  // Check if the station exists.
  const existingStation = await db
    .select("*")
    .from("se_project.stations")
    .where("id", stationId)
    .first();
  
  if (!existingStation) {
    // If the station does not exist, return an HTTP not found code.
    return res.status(404).send("Station does not exist");
  }
  //console.log(existingStation.stationtype);
  //console.log(existingStation.stationposition);
  const pos = existingStation.stationposition;
 // console.log(pos);
  if(existingStation.stationtype =="transfer"){
    //keda keda middle station
    //station to make transfer
    //console.log("meow");
    const newtransfer = await db
    .select("*")
    .from("se_project.routes")
    .where("tostationid", stationId)
    .first();
    const newtransferid=newtransfer.fromstationid;
    //console.log(newtransferid);
    const type = "transfer";
    //make it transfer
     await db("se_project.stations")
     .where("id",newtransferid)
     .update({
        stationtype : type
      })
     .returning("*");
     //get the new transfer postition  to make sure it is middle station
     const newtpos = await db
      .select("*")
      .from("se_project.stations")
      .where("id",newtransferid)
     .first();
     const newtranferpos = newtpos.stationposition;
     position = "middle";
     //make it middle station
     if(newtranferpos != "middle"){
      await db("se_project.stations")
     .where("id",newtransferid)
     .update({
        stationposition : position
      })
     }
     //make new routes 
     const all = await db
    .select("*")
    .from("se_project.routes")
    .where("fromstationid", stationId);
    for(let i = 0 ; i <all.length; i++){
      if(newtransferid!=all[i].tostationid){ 
      //create a new raye7 route
    const nRoute={
    routename: "new",
    fromstationid: newtransferid,
    tostationid : all[i].tostationid,
  };
   //create a new ra8e3 route
    const newRoute={
    routename: "new",
    fromstationid: all[i].tostationid,
    tostationid : newtransferid ,
    };
    
  //insert the new routes
  await db("se_project.routes").insert(nRoute).returning("*");
  await db("se_project.routes").insert(newRoute).returning("*");
  //get route id
  const routeid = await db
 .select("*")
 .from("se_project.routes")
 .where("tostationid", all[i].tostationid)
 .andWhere("routename","new")
 .first();
 const rid = await db
 .select("*")
 .from("se_project.routes")
 .where("fromstationid", all[i].tostationid)
 .andWhere("routename","new")
 .first();
 //create new stationroutes
 const stationroute={
  stationid: newtransferid,
  routeid:routeid.id,
};
const sr={
  stationid: all[i].tostationid,
  routeid:routeid.id,
};
const stationro={
  stationid: newtransferid,
  routeid:rid.id,
};
const ss={
  stationid: all[i].tostationid,
  routeid:rid.id,
};
 //insert the new station route
 await db("se_project.stationroutes").insert(stationroute).returning("*");
 await db("se_project.stationroutes").insert(sr).returning("*");
 await db("se_project.stationroutes").insert(stationro).returning("*");
 await db("se_project.stationroutes").insert(ss).returning("*");

      }
}
  }
  else if(existingStation.stationtype!="transfer"){
  // get station's poisition
  //end case
  if(pos == "end") {
  //console.log("akked msh da");
   //getting the previous station
   const previd = await db
    .select("*")
    .from("se_project.routes")
    .where("tostationid", stationId)
    .first();
    //getting the position of the previous station
    const prevtype = await db
    .select("*")
    .from("se_project.stations")
    .where("id",previd.fromstationid)
    .first();
     // check if the previous  station is middle
    if(prevtype.stationposition == "middle"){
      //make it our new end station
      await db("se_project.stations")
      .where("id", previd.fromstationid)
      .update({
        stationposition: "end"
      })
      .returning("*");
    }
  }
    //deleting routes and stationroutes
    //done automatically with cascade delete
  //start case
  else if (pos == "start"){
   //get postion of next station
   //console.log("???",pos);
   const nextid = await db
   .select("*")
   .from("se_project.routes")
   .where("fromstationid", stationId)
   .first();
   //get the type of the next station
   const nexttype = await db
   .select("*")
   .from("se_project.stations")
   .where("id",nextid.tostationid)
   .first();
    // check if the next station is middle
    if(nexttype.stationposition == "middle"){
      //make it our new start station
      await db("se_project.stations")
     .where("id", nextid.tostationid)
     .update({
      stationposition : "start"
      })
     .returning("*");
    } 
  }
    //deleting routes and stationroutes
    //done automatically with cascade delete
  //middle case
  else if(pos=="middle"){
    //previous station id
    const previd = await db
    .select("*")
    .from("se_project.routes")
    .where("tostationid", stationId)
    .first();
    // next station
    const nextid = await db
   .select("*")
   .from("se_project.routes")
   .where("fromstationid", stationId);
   //create a new ray7 route
   const newRoute = {
    routename: "new",
    fromstationid: previd.fromstationid,
    tostationid : nextid[1].tostationid,
  };
  //create a new rage3 route
  const nRoute={
    routename: "new",
    fromstationid: nextid[1].tostationid,
    tostationid : previd.fromstationid,
  };
  //insert the new routes
  await db("se_project.routes").insert(newRoute).returning("*");
  await db("se_project.routes").insert(nRoute).returning("*");
  //get route id
  const routeid = await db
 .select("*")
 .from("se_project.routes")
 .where("fromstationid", nextid[1].tostationid)
 .andWhere("routename","new")
 .first();
 //get route id
 const rid = await db
 .select("*")
 .from("se_project.routes")
 .where("tostationid", nextid[1].tostationid)
 .andWhere("routename","new")
 .first();
  const stationroute={
    stationid: nextid[1].tostationid,
    routeid:routeid.id,
  };
  const sr={
    stationid: previd.fromstationid,
    routeid:routeid.id,
  };
  const stationr={
    stationid: nextid[1].tostationid,
    routeid:rid.id,
  };
  const sroute={
    stationid: previd.fromstationid,
    routeid:rid.id,
  };
   //insert the new station route
   await db("se_project.stationroutes").insert(stationroute).returning("*");
   await db("se_project.stationroutes").insert(sr).returning("*");
   await db("se_project.stationroutes").insert(sroute).returning("*");
   await db("se_project.stationroutes").insert(sroute).returning("*");
}
  //deleting routes and stationroutes
  //done automatically with delete cascade
}
  // Delete the station from the database.
  await db("se_project.stations")
    .where("id", stationId)
    .delete();

  // Return a success message.
  res.status(200).send("Station deleted successfully");
});
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
      const TId = req.params.ticketId;
      const start = await db.select('origin').from('se_project.tickets').where("id", TId);
      const end = await db.select('destination').from('se_project.tickets').where("id", TId);
      const startId = await db.select('id').from('se_project.stations').where("stationname", start);
      const endId = await db.select('id').from('se_project.stations').where("stationname", end);
      const amnt = await getPrice(startId.id, endId.id);
      const user = await getUser(req);
      const NewRef = {
        status: "pending",
        userid: user.id,
        refundamount: amnt,
        ticketid: TId,
      };
      const Ref = await db("se_project.refund_requests").insert(NewRef).returning("*");
      return res.status(200).json(Ref);

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
  
    app.post("/api/v1/route", async function (req, res) {

    // Check if user already exists in the system
    const routeExists = await db
      .select("*")
      .from("se_project.routes")
      .where("routename", req.body.routeName);
    if (!isEmpty(routeExists)) {
      return res.status(400).send("route exists");
    }

    const newRoute = {
      fromstationid: req.body.newStationId,
      tostationid: req.body.connectedStationId,
      routename: req.body.routeName,
    };
    try {
      const route = await db("se_project.routes").insert(newRoute).returning("*");

      return res.status(200).json(route );
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not add route");
    }
  });

  app.put("/api/v1/route/:routeId", async function (req, res) {
    const { routeId } = req.params;// access the request parameters
    const routeName = req.body.routename;
    const existingRoutes = await db
      .select("*")
      .from("se_project.routes")
      .where("id", routeId)
      .first();
  
    if (!existingRoutes) {
      return res.status(404).send("Routes does not exist");
    }
     try {
      await db("se_project.routes")
      .where("id", routeId)
      .update({
        routename : routeName
      })
      .returning("*");
      // Return a success message.
     res.status(200).send("Route updated successfully");

    } 
   catch (e) {
    console.log(e.message);
    res.status(400).json({error: "Unable to update Route name.", });
   }
  });   

    app.delete("/api/v1/route/:routeId", async function(req,res){
      const {routeId:routeId }= req.params;
      const existingRoutes = await db
      .select("*")
      .from("se_project.routes")
      .where("id", routeId)
      .first();
      const fromStationId=existingRoutes.fromstationid
      const toStationId= existingRoutes.tostationid
      if(!existingRoutes){
        return res.status(404).send("Route does not exist");
      }
      await db("se_project.routes")
      .where("id", routeId)
      .delete();    
      const existingBackwardRoute = await db
      .select("*")
      .from("se_project.routes")
      .where("fromstationid" ,toStationId ).andWhere("tostationid", fromStationId)
      .first();
    const routeToStationExistsInTo = await db
    .select("*")
    .from("se_project.routes")
    .where("tostationid" ,toStationId )
    .first();
    const routeFromStationExistsInFrom = await db
    .select("*")
    .from("se_project.routes")
    .where("fromstationid" ,fromStationId )
    .first();
    const routeToStationExistsInFrom = await db
    .select("*")
    .from("se_project.routes")
    .where("fromstationid" ,toStationId )
    .first();
    const routeFromStationExistsInTo = await db
    .select("*")
    .from("se_project.routes")
    .where("tostationid" ,fromStationId )
    .first();
    if(existingBackwardRoute){
      return res.status(200).send("Route Deleted Succesfully" );
   }

   
   const routeFromExists = await db
      .select("*")
      .from("se_project.routes")
      .where("fromstationid" ,fromStationId ).orWhere("tostationid", fromStationId)
      .first();
      
      const routeToExists = await db
      .select("*")
      .from("se_project.routes")
      .where("fromstationid" ,toStationId ).orWhere("tostationid", toStationId)
      .first();

      if(!routeFromExists){
        await db("se_project.stations")
        .where("id", fromStationId)
        .update({
        stationstatus: "unconnected"
      });
      }
      if(!routeToExists){
        await db("se_project.stations")
        .where("id", toStationId)
        .update({
        stationstatus: "unconnected"
      });
    }

    const countToFrom=await db
    .count("*")
    .from("se_project.routes").
    where("fromstationid" ,toStationId);

    const countFromFrom=await db
    .count("*")
    .from("se_project.routes").
    where("fromstationid" ,fromStationId);

    const countFromTo=await db
    .count("*")
    .from("se_project.routes").
    where("tostationid" ,fromStationId );

    const countToTo=await db
    .count("*")
    .from("se_project.routes").
    where("tostationid" ,toStationId );
    if((countToFrom[0].count)>=2||(countToTo[0].count)>=2){
      return res.status(200).send("Route Deleted Succesfully" );    
    }
    if((countFromTo[0].count)>=2||(countFromFrom[0].count)>=2){
      return res.status(200).send("Route Deleted Succesfully" );  
    }

  if(routeToStationExistsInFrom){
    await db("se_project.stations")
      .where("id", toStationId)
      .update({
      stationposition: "start"
  });
}
  else if(routeToStationExistsInTo){
  await db("se_project.stations")
      .where("id", toStationId)
      .update({
      stationposition: "end"
 });
}
 
if(routeFromStationExistsInFrom){
  await db("se_project.stations")
    .where("id", fromStationId)
    .update({
    stationposition: "start"
});
}
else if(routeFromStationExistsInTo){
await db("se_project.stations")
    .where("id", fromStationId)
    .update({
    stationposition: "end"
});
}
return res.status(200).send("Route deleted successfully");
});
}

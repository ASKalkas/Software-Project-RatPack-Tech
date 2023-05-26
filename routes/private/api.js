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
      const station = await db("se_project.stations").insert(newStation).returning("*");
     // res.status(201).send("Station created successfully");
      return res.status(200).json(station );
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
    console.log("meow");
    const newtransfer = await db
    .select("*")
    .from("se_project.routes")
    .where("tostationid", stationId)
    .first();
    const newtransferid=newtransfer.fromstationid;
    console.log(newtransferid);
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
 
});}

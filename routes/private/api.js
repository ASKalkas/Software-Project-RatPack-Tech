const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
const mongoose = require("mongoose");

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

  // Use the user's ID to update the user's password in the database.
  // await db
  //   .update("se_project.users")
  //   .where("id", user.id)
  //   .$replace("password",newPassword);
  //  const reset =  `UPDATE "se_project.users" 
  //  SET "password" = newPassword
  //  WHERE "email" = email`;
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
    // Create a new station in the database.
    //const Station = mongoose.model("Station"); 
    const newStation = {
      stationname: stationName,
      stationtype: "normal",
      stationposition: "start",
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
   
    
   //const updateQuery = 'UPDATE "se_project.stations" SET "stationname" = newStationName WHERE "id" = stationId'
   
    //  const updatedStation = await db("se_project.stations").update( existingStation).where(stationId).returning("*");
     //.set(newStation)
     //await db.updateQuery(updateQuery,[])
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
    // Get the new name of the station.
  
  // Update the station name.
  //const success = updateStation(stationId, newStationName);

  // Send a response to the client.
  // if (success) {
  //   res.status(200).json({
  //     success: true,
  //   });
  // } else {
  //   res.status(400).json({
  //     error: "Unable to update station name.",
  //   });
  
    // Update the station in the database.
    //await db
      //.update("se_project.stations")
    //  .where("id", stationId)
    //  .set({ stationName });
  
    
   
  
app.delete("/api/v1/station/:stationId", async function (req, res) {
  const { stationId } = req.params;

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

  // Delete the station from the database.
  await db
    .delete("se_project.stations")
    .where("id", stationId);

  // Return a success message.
  res.status(200).send("Station deleted successfully");
});
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




};
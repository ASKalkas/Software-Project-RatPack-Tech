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
//Resettting password endpoint
app.put("/api/v1/password/reset", async function (req, res) {
  const {  password,newpassword } = req.body;
  if (!password) {
    // If the password is not present, return an HTTP unauthorized code
    return res.status(400).send("Password is required");
  }
  if (!newpassword) {
    // If the new password is not present, return an HTTP unauthorized code
    return res.status(400).send("New Password is required");
  }
  // Get the user's ID from the database.
  const user = await db
    .select("*")
    .from("se_project.users")
    .where("password", password)
    .first();

  if (!user) {
    // If the user does not exist, return an HTTP not found code.
    return res.status(404).send("User does not exist");
  }

 // Use the user's ID to update the user's password in the database.
 await db
 .update("se_project.users")
 .where("id", user.id)
 .set({ password: newpassword });

// Send the user an email with their new password.
const email = user.email;
const subject = "Your password has been reset";
const body = `Your password has been reset to ${newpassword}`;

await sendEmail(email, subject, body);

// Return a success message.
res.status(200).send("Password reset successfully");
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
    const newStation = {
      stationname: stationName,
      stationtype: "normal",
      stationposition: "start",
      stationstatus: "new created",
    };
  
    await db.insert("se_project.stations", newStation);
  
    // Return a success message.
    res.status(201).send("Station created successfully");
  });
  //Updating a station
  app.put("/api/v1/station/:stationId", async function (req, res) {
    //request parameters are , which are the values that are passed to the endpoint after the slash
    const { stationId } = req.params;// access the request parameters
    const { stationName } = req.body;
  
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
  
    // Update the station in the database.
    await db
      .update("se_project.stations")
      .where("id", stationId)
      .set({ stationName });
  
    // Return a success message.
    res.status(200).send("Station updated successfully");
  });
  
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

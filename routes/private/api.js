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
  
    
   
/*  
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
*/
  
};

const axios = require("axios");

// Jamendo API for free music
const jamendoApi = axios.create({
  baseURL: "https://api.jamendo.com/v3.0/",
  params: {
    client_id: process.env.JAMENDO_CLIENT_ID || "ef527c00",
    format: "json"
  }
});

// iTunes API for music metadata and previews
const iTunesApi = axios.create({
  baseURL: "https://itunes.apple.com/"
});

// Free Music Archive API alternative
const fmaApi = axios.create({
  baseURL: "https://freemusicarchive.org/api/get/"
});

module.exports = {
  jamendoApi,
  iTunesApi,
  fmaApi
};

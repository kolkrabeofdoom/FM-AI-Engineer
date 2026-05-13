const API_KEY = "AIzaSyDEBXOXVTC9Rh-oimUrXajPq0gyoOXZeN8";
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function test() {
  try {
    const resp = await fetch(URL);
    const data = await resp.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
